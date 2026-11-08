from datetime import datetime, timezone, date, timedelta
from .user import db

class Skill(db.Model):
    __tablename__ = 'skills'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    track_name = db.Column(db.String(100), nullable=False)  # Python, Cybersecurity, Web Development, Networking
    current_level = db.Column(db.String(30), default='Beginner')  # Beginner, Intermediate, Advanced
    weekly_target_hours = db.Column(db.Float, default=5.0)
    color_hex = db.Column(db.String(10), default='#10b981')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    stages = db.relationship('LearningStage', backref='skill', cascade='all, delete-orphan', lazy=True)
    sessions = db.relationship('LearningSession', backref='skill', cascade='all, delete-orphan', lazy=True)
    evidence = db.relationship('LearningEvidence', backref='skill', cascade='all, delete-orphan', lazy=True)

    @property
    def total_hours_logged(self):
        return round(sum(s.duration_mins for s in self.sessions) / 60.0, 1)

    @property
    def weekly_hours_logged(self):
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        week_sessions = [s for s in self.sessions if s.session_date.date() >= start_of_week]
        return round(sum(s.duration_mins for s in week_sessions) / 60.0, 1)

    def to_dict(self):
        all_tasks = [t for st in self.stages for t in st.tasks]
        completed_tasks = [t for t in all_tasks if t.is_completed]
        task_completion_rate = round((len(completed_tasks) / len(all_tasks) * 100), 1) if all_tasks else 0.0

        return {
            'id': self.id,
            'user_id': self.user_id,
            'track_name': self.track_name,
            'current_level': self.current_level,
            'weekly_target_hours': self.weekly_target_hours,
            'color_hex': self.color_hex,
            'total_hours_logged': self.total_hours_logged,
            'weekly_hours_logged': self.weekly_hours_logged,
            'stages_count': len(self.stages),
            'tasks_count': len(all_tasks),
            'completed_tasks_count': len(completed_tasks),
            'task_completion_rate': task_completion_rate,
            'evidence_count': len(self.evidence)
        }


class LearningStage(db.Model):
    __tablename__ = 'learning_stages'

    id = db.Column(db.Integer, primary_key=True)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    status = db.Column(db.String(30), default='Not Started')  # Not Started, In Progress, Completed

    tasks = db.relationship('LearningTask', backref='stage', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        tasks_list = [t.to_dict() for t in self.tasks]
        return {
            'id': self.id,
            'skill_id': self.skill_id,
            'title': self.title,
            'order_index': self.order_index,
            'status': self.status,
            'tasks': tasks_list,
            'tasks_count': len(tasks_list),
            'completed_count': sum(1 for t in tasks_list if t['is_completed'])
        }


class LearningTask(db.Model):
    __tablename__ = 'learning_tasks'

    id = db.Column(db.Integer, primary_key=True)
    stage_id = db.Column(db.Integer, db.ForeignKey('learning_stages.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    estimated_hours = db.Column(db.Float, default=2.0)
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'stage_id': self.stage_id,
            'title': self.title,
            'description': self.description,
            'estimated_hours': self.estimated_hours,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class LearningSession(db.Model):
    __tablename__ = 'learning_sessions'

    id = db.Column(db.Integer, primary_key=True)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('learning_tasks.id', ondelete='SET NULL'), nullable=True)
    session_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    duration_mins = db.Column(db.Integer, nullable=False, default=60)
    topic_studied = db.Column(db.String(255), nullable=False)
    key_learnings = db.Column(db.Text, nullable=True)
    difficulties_faced = db.Column(db.Text, nullable=True)
    next_steps = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'skill_id': self.skill_id,
            'skill_track': self.skill.track_name if self.skill else None,
            'task_id': self.task_id,
            'session_date': self.session_date.isoformat() if self.session_date else None,
            'duration_mins': self.duration_mins,
            'topic_studied': self.topic_studied,
            'key_learnings': self.key_learnings,
            'difficulties_faced': self.difficulties_faced,
            'next_steps': self.next_steps
        }


class LearningEvidence(db.Model):
    __tablename__ = 'learning_evidence'

    id = db.Column(db.Integer, primary_key=True)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    evidence_type = db.Column(db.String(50), default='GitHub')  # GitHub, Project, Screenshot, Demo, Certificate
    url_or_path = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    date_achieved = db.Column(db.Date, default=date.today)

    def to_dict(self):
        return {
            'id': self.id,
            'skill_id': self.skill_id,
            'skill_track': self.skill.track_name if self.skill else None,
            'title': self.title,
            'evidence_type': self.evidence_type,
            'url_or_path': self.url_or_path,
            'description': self.description,
            'date_achieved': self.date_achieved.isoformat() if self.date_achieved else None
        }
