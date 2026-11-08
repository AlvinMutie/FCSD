from datetime import datetime, date, timezone
from flask import Blueprint, jsonify, session
from ..models import db, User, UserSettings

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

    # Phase 1: Real baseline data aggregated from current state
    # As later phases implement assignments, skills, and applications, they query their real tables.
    overview_data = {
        'date': today.isoformat(),
        'timezone': user.timezone,
        'todays_focus': {
            'daily_priorities': [],
            'scheduled_sessions_count': 0,
            'completed_sessions_count': 0,
            'completion_percentage': 0,
            'next_session': None,
            'overdue_count': 0
        },
        'academic_overview': {
            'active_units_count': 0,
            'units': [],
            'upcoming_assignments': [],
            'upcoming_assessments': [],
            'attention_alerts': []
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
            {'name': 'University Studies', 'hours': 0, 'color': '#3b82f6'},
            {'name': 'Skills Development', 'hours': 0, 'color': '#10b981'},
            {'name': 'Career & Jobs', 'hours': 0, 'color': '#8b5cf6'},
            {'name': 'Personal & Rest', 'hours': 0, 'color': '#f59e0b'}
        ],
        'dashboard_layout': settings.get_dashboard_layout()
    }

    return jsonify(overview_data), 200
