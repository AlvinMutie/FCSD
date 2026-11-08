import json
from datetime import datetime, timezone
from .user import db

class Integration(db.Model):
    __tablename__ = 'integrations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    provider = db.Column(db.String(50), default='sodel')  # e.g. "sodel"
    pairing_token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    last_sync_at = db.Column(db.DateTime, nullable=True)
    sync_metadata_json = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def get_metadata(self):
        try:
            return json.loads(self.sync_metadata_json or '{}')
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'pairing_token': self.pairing_token,
            'is_active': self.is_active,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'metadata': self.get_metadata()
        }


class PendingImport(db.Model):
    __tablename__ = 'pending_imports'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    source_system = db.Column(db.String(50), default='sodel')
    source_url = db.Column(db.Text, nullable=False)
    item_type = db.Column(db.String(50), nullable=False)  # course, assignment, assessment, announcement
    raw_data_json = db.Column(db.Text, nullable=False)
    normalized_title = db.Column(db.String(255), nullable=False)
    normalized_course_code = db.Column(db.String(50), nullable=True)
    normalized_deadline = db.Column(db.DateTime, nullable=True)
    has_explicit_time = db.Column(db.Boolean, default=False)
    # Status: 'Pending Review', 'Approved', 'Rejected', 'Needs Attention', 'Updated'
    status = db.Column(db.String(30), default='Pending Review')
    potential_duplicate_id = db.Column(db.Integer, nullable=True)
    changes_diff_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime, nullable=True)

    # Provenance relationship
    provenance = db.relationship('ImportProvenance', backref='pending_import', uselist=False, cascade='all, delete-orphan')

    def get_raw_data(self):
        try:
            return json.loads(self.raw_data_json or '{}')
        except Exception:
            return {}

    def get_diff(self):
        try:
            return json.loads(self.changes_diff_json or '{}') if self.changes_diff_json else None
        except Exception:
            return None

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'source_system': self.source_system,
            'source_url': self.source_url,
            'item_type': self.item_type,
            'normalized_title': self.normalized_title,
            'normalized_course_code': self.normalized_course_code,
            'normalized_deadline': self.normalized_deadline.isoformat() if self.normalized_deadline else None,
            'has_explicit_time': self.has_explicit_time,
            'status': self.status,
            'potential_duplicate_id': self.potential_duplicate_id,
            'changes_diff': self.get_diff(),
            'raw_data': self.get_raw_data(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }


class ImportProvenance(db.Model):
    __tablename__ = 'import_provenance'

    id = db.Column(db.Integer, primary_key=True)
    pending_import_id = db.Column(db.Integer, db.ForeignKey('pending_imports.id', ondelete='CASCADE'), nullable=False, unique=True)
    target_table = db.Column(db.String(50), nullable=False)  # courses, assignments, assessments
    target_record_id = db.Column(db.Integer, nullable=False)
    action_taken = db.Column(db.String(50), nullable=False)  # CREATED, UPDATED
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'pending_import_id': self.pending_import_id,
            'target_table': self.target_table,
            'target_record_id': self.target_record_id,
            'action_taken': self.action_taken,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

