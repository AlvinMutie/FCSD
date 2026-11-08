import json
from datetime import datetime, timezone
from .user import db

class AvailabilityRule(db.Model):
    __tablename__ = 'availability_rules'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time = db.Column(db.String(5), nullable=False)  # "08:00"
    end_time = db.Column(db.String(5), nullable=False)    # "12:00"
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'is_active': self.is_active
        }


class ScheduleVersion(db.Model):
    __tablename__ = 'schedule_versions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    # Status: 'DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED'
    status = db.Column(db.String(20), default='ACTIVE')
    generation_metrics_json = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    events = db.relationship('CalendarEvent', backref='schedule_version', cascade='all, delete-orphan', lazy=True)

    def get_metrics(self):
        try:
            return json.loads(self.generation_metrics_json or '{}')
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'version_number': self.version_number,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'metrics': self.get_metrics(),
            'events_count': len(self.events),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    schedule_version_id = db.Column(db.Integer, db.ForeignKey('schedule_versions.id', ondelete='SET NULL'), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=False)
    # category: 'academic', 'skill', 'career', 'project', 'personal', 'rest'
    category = db.Column(db.String(50), default='academic')
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False, index=True)
    is_locked = db.Column(db.Boolean, default=False)
    is_completed = db.Column(db.Boolean, default=False)
    is_skipped = db.Column(db.Boolean, default=False)
    related_entity_type = db.Column(db.String(50), nullable=True)  # assignment, assessment, course, skill, career
    related_entity_id = db.Column(db.Integer, nullable=True)
    explanation = db.Column(db.Text, nullable=True)  # Why the scheduling engine placed it here
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'schedule_version_id': self.schedule_version_id,
            'title': self.title,
            'category': self.category,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_locked': self.is_locked,
            'is_completed': self.is_completed,
            'is_skipped': self.is_skipped,
            'related_entity_type': self.related_entity_type,
            'related_entity_id': self.related_entity_id,
            'explanation': self.explanation,
            'notes': self.notes
        }
