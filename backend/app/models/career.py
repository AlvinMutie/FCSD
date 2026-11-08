import json
from datetime import datetime, timezone, date
from .user import db

class JobOpportunity(db.Model):
    __tablename__ = 'job_opportunities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    company = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255), nullable=True, default='Nairobi / Hybrid')
    # job_type: Internship, Attachment, Entry-level, Junior Developer, IT Support, Networking, Cybersecurity, Other
    job_type = db.Column(db.String(50), default='Internship')
    description = db.Column(db.Text, nullable=True)
    requirements = db.Column(db.Text, nullable=True)  # Comma-separated or bullet list of required skills
    application_url = db.Column(db.Text, nullable=True)
    closing_date = db.Column(db.Date, nullable=True)
    priority = db.Column(db.Integer, default=3)
    # pipeline_stage: 'Saved', 'Preparing', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
    pipeline_stage = db.Column(db.String(30), default='Saved', index=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    application = db.relationship('Application', backref='opportunity', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'company': self.company,
            'location': self.location,
            'job_type': self.job_type,
            'description': self.description,
            'requirements': self.requirements,
            'application_url': self.application_url,
            'closing_date': self.closing_date.isoformat() if self.closing_date else None,
            'priority': self.priority,
            'pipeline_stage': self.pipeline_stage,
            'notes': self.notes,
            'has_application': self.application is not None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CVDocument(db.Model):
    __tablename__ = 'cv_documents'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)  # e.g. "Junior Developer CV - v2"
    # category: 'General IT', 'IT Support', 'Networking', 'Junior Developer', 'Cybersecurity'
    category = db.Column(db.String(50), default='General IT')
    file_path = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'category': self.category,
            'file_path': self.file_path,
            'notes': self.notes,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_opportunities.id', ondelete='CASCADE'), nullable=False, unique=True)
    applied_date = db.Column(db.Date, default=date.today)
    cv_document_id = db.Column(db.Integer, db.ForeignKey('cv_documents.id', ondelete='SET NULL'), nullable=True)
    cover_letter_text = db.Column(db.Text, nullable=True)
    contact_person = db.Column(db.String(120), nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    # Relationships
    interviews = db.relationship('InterviewPrep', backref='application', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'applied_date': self.applied_date.isoformat() if self.applied_date else None,
            'cv_document_id': self.cv_document_id,
            'cover_letter_text': self.cover_letter_text,
            'contact_person': self.contact_person,
            'contact_email': self.contact_email,
            'notes': self.notes,
            'interviews_count': len(self.interviews)
        }


class InterviewPrep(db.Model):
    __tablename__ = 'interview_preps'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False, index=True)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    interview_type = db.Column(db.String(50), default='Technical')  # Technical, HR, Assessment, Panel
    checklist_json = db.Column(db.Text, default='[]')
    company_research = db.Column(db.Text, nullable=True)
    technical_questions = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)

    def get_checklist(self):
        try:
            return json.loads(self.checklist_json or '[]')
        except Exception:
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'interview_type': self.interview_type,
            'checklist': self.get_checklist(),
            'company_research': self.company_research,
            'technical_questions': self.technical_questions,
            'feedback': self.feedback
        }

