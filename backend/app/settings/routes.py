import json
from flask import Blueprint, request, jsonify, session
from ..models import db, User, UserSettings

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

@settings_bp.route('', methods=['GET'])
def get_settings():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    settings = user.settings
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)
        db.session.commit()

    return jsonify({
        'settings': settings.to_dict(),
        'user': user.to_dict()
    }), 200

@settings_bp.route('', methods=['PUT', 'PATCH'])
def update_settings():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    settings = user.settings
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)

    # Personal settings on user
    if 'display_name' in data:
        user.display_name = data['display_name'].strip() or user.display_name
    if 'timezone' in data:
        user.timezone = data['timezone'].strip() or user.timezone

    # Preference fields on UserSettings
    if 'time_format' in data:
        settings.time_format = data['time_format']
    if 'first_day_of_week' in data:
        settings.first_day_of_week = int(data['first_day_of_week'])
    if 'default_session_duration_mins' in data:
        settings.default_session_duration_mins = int(data['default_session_duration_mins'])
    if 'max_daily_study_hours' in data:
        settings.max_daily_study_hours = float(data['max_daily_study_hours'])
    if 'skills_daily_target_hours' in data:
        settings.skills_daily_target_hours = float(data['skills_daily_target_hours'])
    if 'career_weekly_apps_target' in data:
        settings.career_weekly_apps_target = int(data['career_weekly_apps_target'])
    if 'theme_appearance' in data:
        settings.theme_appearance = data['theme_appearance']
    if 'accent_color' in data:
        settings.accent_color = data['accent_color']
    if 'priority_weights' in data:
        settings.priority_weights_json = json.dumps(data['priority_weights'])
    if 'dashboard_layout' in data:
        settings.dashboard_layout_json = json.dumps(data['dashboard_layout'])

    db.session.commit()

    return jsonify({
        'message': 'Settings updated successfully.',
        'settings': settings.to_dict(),
        'user': user.to_dict()
    }), 200

