"""
MyLife OS — Analytics API routes (Phase 8)
"""
from datetime import datetime, timedelta, date, timezone
from flask import Blueprint, jsonify, session
from ..models import (
    db,
    User,
    CalendarEvent,
    Skill,
    LearningSession,
    Assignment,
    Assessment,
    JobOpportunity,
    Course,
    AcademicTerm,
)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)


@analytics_bp.route('/weekly-summary', methods=['GET'])
def weekly_summary():
    """Return planned vs actual hours by domain for the current week, plus neglect alerts."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    week_start_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
    week_end_dt = datetime.combine(week_end, datetime.max.time()).replace(tzinfo=timezone.utc)

    # Planned events this week
    events = CalendarEvent.query.filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.start_time >= week_start_dt,
        CalendarEvent.start_time <= week_end_dt,
    ).all()

    domain_planned = {'Academic': 0.0, 'Skills': 0.0, 'Career': 0.0, 'Personal': 0.0}
    domain_completed = {k: 0.0 for k in domain_planned}

    for ev in events:
        dur_h = (ev.end_time - ev.start_time).total_seconds() / 3600
        cat = ev.category or 'Other'
        if cat in ('Academic', 'Study', 'Revision', 'Assignment'):
            domain = 'Academic'
        elif cat in ('Skills', 'Learning', 'Python', 'Cybersecurity', 'Web Development', 'Networking'):
            domain = 'Skills'
        elif cat in ('Career', 'Job Application', 'Interview'):
            domain = 'Career'
        else:
            domain = 'Personal'

        domain_planned[domain] += dur_h
        if ev.is_completed:
            domain_completed[domain] += dur_h

    # Skills track data from LearningSession
    sessions_this_week = LearningSession.query.join(Skill).filter(
        Skill.user_id == user.id,
        LearningSession.session_date >= week_start_dt,
        LearningSession.session_date <= week_end_dt,
    ).all()

    skills_actual_total = sum(s.duration_mins / 60 for s in sessions_this_week)
    if skills_actual_total > 0:
        domain_completed['Skills'] = max(domain_completed['Skills'], skills_actual_total)

    # Build domain breakdown chart data
    domains = [
        {
            'domain': domain,
            'planned_hours': round(domain_planned[domain], 1),
            'completed_hours': round(domain_completed[domain], 1),
        }
        for domain in ['Academic', 'Skills', 'Career', 'Personal']
    ]

    # Neglect alerts
    neglect_alerts = []
    for d in domains:
        if d['planned_hours'] > 0 and d['completed_hours'] == 0:
            neglect_alerts.append(
                f"{d['domain']} has {d['planned_hours']}h planned this week but no recorded activity yet."
            )

    # Skills tracks vs weekly targets
    skills = Skill.query.filter_by(user_id=user.id).all()
    skills_targets = []
    for sk in skills:
        track_sessions = [s for s in sessions_this_week if s.skill_id == sk.id]
        actual_h = sum(s.duration_mins / 60 for s in track_sessions)
        skills_targets.append({
            'track': sk.track_name,
            'target_hours': sk.weekly_target_hours,
            'actual_hours': round(actual_h, 1),
            'completion_pct': round(actual_h / sk.weekly_target_hours * 100) if sk.weekly_target_hours > 0 else 0,
            'color_hex': sk.color_hex,
        })
        if actual_h < sk.weekly_target_hours * 0.3 and sk.weekly_target_hours > 0:
            neglect_alerts.append(
                f"{sk.track_name} track: only {actual_h:.1f}h of {sk.weekly_target_hours}h weekly target met."
            )

    # Upcoming deadlines this week
    assignments_due = Assignment.query.join(Course).join(AcademicTerm).filter(
        AcademicTerm.user_id == user.id,
        Assignment.deadline >= datetime.combine(today, datetime.min.time()),
        Assignment.deadline <= week_end_dt,
        Assignment.status.notin_(['Submitted', 'Completed']),
    ).order_by(Assignment.deadline).limit(5).all()

    assessments_due = Assessment.query.join(Course).join(AcademicTerm).filter(
        AcademicTerm.user_id == user.id,
        Assessment.assessment_date >= datetime.combine(today, datetime.min.time()),
        Assessment.assessment_date <= week_end_dt,
    ).order_by(Assessment.assessment_date).limit(5).all()

    upcoming_deadlines = []
    for a in assignments_due:
        upcoming_deadlines.append({
            'type': 'Assignment',
            'title': a.title,
            'due': a.deadline.isoformat() if a.deadline else None,
        })
    for a in assessments_due:
        upcoming_deadlines.append({
            'type': a.assessment_type or 'Assessment',
            'title': a.title,
            'due': a.assessment_date.isoformat() if a.assessment_date else None,
        })

    # Career pipeline
    career_opps = JobOpportunity.query.filter_by(user_id=user.id).all()
    career_summary = {
        'saved':     sum(1 for o in career_opps if o.pipeline_stage == 'Saved'),
        'applied':   sum(1 for o in career_opps if o.pipeline_stage == 'Applied'),
        'interview': sum(1 for o in career_opps if o.pipeline_stage == 'Interview'),
    }

    return jsonify({
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'domain_breakdown': domains,
        'skills_tracks': skills_targets,
        'neglect_alerts': neglect_alerts,
        'upcoming_deadlines': upcoming_deadlines,
        'career_summary': career_summary,
    }), 200


@analytics_bp.route('/time-distribution', methods=['GET'])
def time_distribution():
    """All-time logged hours by domain across completed calendar events."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    events = CalendarEvent.query.filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.is_completed == True,
    ).all()

    domain_hours = {'Academic': 0.0, 'Skills': 0.0, 'Career': 0.0, 'Personal': 0.0, 'Other': 0.0}
    for ev in events:
        dur_h = (ev.end_time - ev.start_time).total_seconds() / 3600
        cat = ev.category or 'Other'
        if cat in ('Academic', 'Study', 'Revision', 'Assignment'):
            domain_hours['Academic'] += dur_h
        elif cat in ('Skills', 'Learning', 'Python', 'Cybersecurity', 'Web Development', 'Networking'):
            domain_hours['Skills'] += dur_h
        elif cat in ('Career', 'Job Application', 'Interview'):
            domain_hours['Career'] += dur_h
        elif cat in ('Personal', 'Rest'):
            domain_hours['Personal'] += dur_h
        else:
            domain_hours['Other'] += dur_h

    colors = {
        'Academic': '#6366f1',
        'Skills':   '#10b981',
        'Career':   '#f59e0b',
        'Personal': '#ec4899',
        'Other':    '#64748b',
    }
    result = [
        {'name': k, 'hours': round(v, 1), 'color': colors[k]}
        for k, v in domain_hours.items()
        if v > 0
    ]
    total = round(sum(domain_hours.values()), 1)
    return jsonify({'distribution': result, 'total_logged_hours': total}), 200

