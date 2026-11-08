from datetime import datetime, date, timezone, timedelta
from flask import Blueprint, jsonify, session
from ..models import (
    db,
    User,
    UserSettings,
    AcademicTerm,
    Course,
    Assignment,
    Assessment,
)

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

@dashboard_bp.route('/overview', methods=['GET'])
def get_overview():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    settings = user.settings or UserSettings(user_id=user.id)
    today = date.today()
    now_dt = datetime.now(timezone.utc)

    # 1. Fetch Real Academic Data
    current_term = AcademicTerm.query.filter_by(user_id=user.id, is_current=True).first()
    if not current_term:
        current_term = AcademicTerm.query.filter_by(user_id=user.id).order_by(AcademicTerm.start_date.desc()).first()

    courses = []
    units_data = []
    attention_alerts = []
    academic_study_hours = 0.0

    if current_term:
        courses = Course.query.filter_by(term_id=current_term.id, is_archived=False).all()
        for c in courses:
            academic_study_hours += c.actual_weekly_hours
            units_data.append({
                'id': c.id,
                'code': c.code,
                'title': c.title,
                'target_hours': c.target_weekly_hours,
                'actual_hours': c.actual_weekly_hours,
                'attention_gap': c.attention_gap,
                'is_neglected': c.is_neglected
            })
            if c.is_neglected:
                attention_alerts.append(f"Unit {c.code} is neglected ({c.actual_weekly_hours}h < {c.min_weekly_hours}h floor)")
            elif c.attention_gap >= 2.0:
                attention_alerts.append(f"Unit {c.code} is {c.attention_gap}h behind distinction target")

    # Fetch real upcoming assignments
    assignments = (
        Assignment.query.join(Course).join(AcademicTerm)
        .filter(AcademicTerm.user_id == user.id, Assignment.status != 'Completed', Assignment.status != 'Submitted')
        .order_by(Assignment.deadline.asc().nullslast())
        .limit(5)
        .all()
    )
    upcoming_assignments = [
        {
            'id': a.id,
            'title': a.title,
            'course_code': a.course.code,
            'deadline': a.deadline.isoformat() if a.deadline else None,
            'priority': a.priority,
            'status': a.status
        }
        for a in assignments
    ]

    # Fetch real upcoming assessments (CATs & Exams)
    assessments = (
        Assessment.query.join(Course).join(AcademicTerm)
        .filter(AcademicTerm.user_id == user.id, Assessment.assessment_date >= datetime.combine(today, datetime.min.time()))
        .order_by(Assessment.assessment_date.asc())
        .limit(5)
        .all()
    )
    upcoming_assessments = [
        {
            'id': a.id,
            'title': a.title,
            'course_code': a.course.code,
            'assessment_date': a.assessment_date.isoformat() if a.assessment_date else None,
            'assessment_type': a.assessment_type,
            'preparation_progress': a.preparation_progress
        }
        for a in assessments
    ]

    # Count overdue tasks
    overdue_assignments = (
        Assignment.query.join(Course).join(AcademicTerm)
        .filter(
            AcademicTerm.user_id == user.id,
            Assignment.deadline < now_dt,
            Assignment.status != 'Completed',
            Assignment.status != 'Submitted'
        )
        .count()
    )

    overview_data = {
        'date': today.isoformat(),
        'timezone': user.timezone,
        'todays_focus': {
            'daily_priorities': [
                f"{a.course.code}: {a.title} (Due soon)" for a in assignments[:2]
            ] + [
                f"Study priority: {c.code} (Attention gap: {c.attention_gap}h)" for c in courses if c.is_neglected
            ],
            'scheduled_sessions_count': len(courses),
            'completed_sessions_count': sum(1 for c in courses if not c.is_neglected),
            'completion_percentage': int((sum(c.actual_weekly_hours for c in courses) / max(1.0, sum(c.target_weekly_hours for c in courses))) * 100) if courses else 0,
            'next_session': {
                'title': f"Study Session: {courses[0].code}" if courses else None,
                'course': courses[0].title if courses else None
            } if courses else None,
            'overdue_count': overdue_assignments
        },
        'academic_overview': {
            'active_units_count': len(courses),
            'units': units_data,
            'upcoming_assignments': upcoming_assignments,
            'upcoming_assessments': upcoming_assessments,
            'attention_alerts': attention_alerts
        },
        'skills_overview': {
            'weekly_target_hours': settings.skills_daily_target_hours * 7,
            'completed_hours_week': 0.0,
            'remaining_hours_week': settings.skills_daily_target_hours * 7,
            'tracks': [
                {'track': 'Python', 'hours_week': 0.0, 'target_week': 5.0, 'level': 'Beginner'},
                {'track': 'Cybersecurity', 'hours_week': 0.0, 'target_week': 5.0, 'level': 'Beginner'},
                {'track': 'Web Development', 'hours_week': 0.0, 'target_week': 6.0, 'level': 'Beginner'},
                {'track': 'Networking', 'hours_week': 0.0, 'target_week': 5.0, 'level': 'Beginner'},
            ]
        },
        'career_overview': {
            'saved_count': 0,
            'in_progress_count': 0,
            'interviews_count': 0,
            'weekly_applications': 0,
            'target_weekly_applications': settings.career_weekly_apps_target
        },
        'time_allocation': [
            {'name': 'University Studies', 'hours': round(academic_study_hours, 1), 'color': '#3b82f6'},
            {'name': 'Skills Development', 'hours': 0, 'color': '#10b981'},
            {'name': 'Career & Jobs', 'hours': 0, 'color': '#8b5cf6'},
            {'name': 'Personal & Rest', 'hours': 0, 'color': '#f59e0b'}
        ],
        'dashboard_layout': settings.get_dashboard_layout()
    }

    return jsonify(overview_data), 200
