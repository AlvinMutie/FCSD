"""
MyLife OS — Project, Milestone & Task models (Phase 8)
"""
from datetime import datetime, timezone
from .user import db


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    # status: Planning, In Progress, On Hold, Completed, Archived
    status = db.Column(db.String(30), default='Planning')
    # project_type: Academic, Skill-Building, Portfolio, Career, Personal
    project_type = db.Column(db.String(30), default='Portfolio')
    linked_skill_track = db.Column(db.String(100), nullable=True)
    github_url = db.Column(db.Text, nullable=True)
    live_url = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    target_completion = db.Column(db.Date, nullable=True)
    actual_completion = db.Column(db.Date, nullable=True)
    priority = db.Column(db.Integer, default=3)
    tags = db.Column(db.Text, nullable=True)  # Comma-separated
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    milestones = db.relationship(
        'ProjectMilestone', backref='project',
        cascade='all, delete-orphan', lazy=True,
        order_by='ProjectMilestone.order_index'
    )

    @property
    def completion_percentage(self):
        all_tasks = [t for m in self.milestones for t in m.tasks]
        if not all_tasks:
            return 0
        done = sum(1 for t in all_tasks if t.is_completed)
        return round(done / len(all_tasks) * 100)

    @property
    def total_milestones(self):
        return len(self.milestones)

    @property
    def completed_milestones(self):
        return sum(1 for m in self.milestones if m.tasks and all(t.is_completed for t in m.tasks))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'project_type': self.project_type,
            'linked_skill_track': self.linked_skill_track,
            'github_url': self.github_url,
            'live_url': self.live_url,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'target_completion': self.target_completion.isoformat() if self.target_completion else None,
            'actual_completion': self.actual_completion.isoformat() if self.actual_completion else None,
            'priority': self.priority,
            'tags': self.tags,
            'completion_percentage': self.completion_percentage,
            'total_milestones': self.total_milestones,
            'completed_milestones': self.completed_milestones,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ProjectMilestone(db.Model):
    __tablename__ = 'project_milestones'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, default=0)
    due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    tasks = db.relationship(
        'MilestoneTask', backref='milestone',
        cascade='all, delete-orphan', lazy=True,
        order_by='MilestoneTask.order_index'
    )

    @property
    def completion_percentage(self):
        if not self.tasks:
            return 0
        done = sum(1 for t in self.tasks if t.is_completed)
        return round(done / len(self.tasks) * 100)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'order_index': self.order_index,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completion_percentage': self.completion_percentage,
            'tasks': [t.to_dict() for t in self.tasks],
        }


class MilestoneTask(db.Model):
    __tablename__ = 'milestone_tasks'

    id = db.Column(db.Integer, primary_key=True)
    milestone_id = db.Column(db.Integer, db.ForeignKey('project_milestones.id', ondelete='CASCADE'),
                             nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    order_index = db.Column(db.Integer, default=0)
    estimated_hours = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'milestone_id': self.milestone_id,
            'title': self.title,
            'is_completed': self.is_completed,
            'order_index': self.order_index,
            'estimated_hours': self.estimated_hours,
            'notes': self.notes,
        }

