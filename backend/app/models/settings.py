import json
from .user import db

class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    time_format = db.Column(db.String(10), default='24h')
    first_day_of_week = db.Column(db.Integer, default=1)  # 1 = Monday
    default_session_duration_mins = db.Column(db.Integer, default=60)
    max_daily_study_hours = db.Column(db.Float, default=8.0)
    skills_daily_target_hours = db.Column(db.Float, default=3.0)
    career_weekly_apps_target = db.Column(db.Integer, default=3)
    theme_appearance = db.Column(db.String(20), default='dark')
    accent_color = db.Column(db.String(20), default='indigo')

    # Configurable scheduling weights (defaults: D=0.35, U=0.25, I=0.20, W=0.10, R=0.10)
    priority_weights_json = db.Column(db.Text, default=json.dumps({
        'deadline_urgency': 0.35,
        'importance': 0.25,
        'impact': 0.20,
        'workload_difficulty': 0.10,
        'risk_of_falling_behind': 0.10
    }))

    # Configurable dashboard widget visibility and order
    dashboard_layout_json = db.Column(db.Text, default=json.dumps({
        'widgets': [
            {'id': 'todays_focus', 'title': "Today's Focus", 'visible': True, 'order': 1},
            {'id': 'academic_overview', 'title': 'Academic Overview', 'visible': True, 'order': 2},
            {'id': 'distinction_tracker', 'title': 'Distinction & Balance Monitor', 'visible': True, 'order': 3},
            {'id': 'skills_overview', 'title': 'Skills Progress', 'visible': True, 'order': 4},
            {'id': 'career_overview', 'title': 'Career Pipeline', 'visible': True, 'order': 5},
            {'id': 'time_allocation', 'title': 'Time Distribution', 'visible': True, 'order': 6}
        ]
    }))

    def get_priority_weights(self):
        try:
            return json.loads(self.priority_weights_json)
        except Exception:
            return {}

    def get_dashboard_layout(self):
        try:
            return json.loads(self.dashboard_layout_json)
        except Exception:
            return {'widgets': []}

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'time_format': self.time_format,
            'first_day_of_week': self.first_day_of_week,
            'default_session_duration_mins': self.default_session_duration_mins,
            'max_daily_study_hours': self.max_daily_study_hours,
            'skills_daily_target_hours': self.skills_daily_target_hours,
            'career_weekly_apps_target': self.career_weekly_apps_target,
            'theme_appearance': self.theme_appearance,
            'accent_color': self.accent_color,
            'priority_weights': self.get_priority_weights(),
            'dashboard_layout': self.get_dashboard_layout()
        }
