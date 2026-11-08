from datetime import datetime, timezone, date
from .user import db

class AcademicTerm(db.Model):
    __tablename__ = 'academic_terms'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)  # e.g. "Year 2 Semester 2"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    courses = db.relationship('Course', backref='term', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_current': self.is_current,
            'courses_count': len(self.courses)
        }


class Course(db.Model):
    __tablename__ = 'courses'

    id = db.Column(db.Integer, primary_key=True)
    term_id = db.Column(db.Integer, db.ForeignKey('academic_terms.id', ondelete='CASCADE'), nullable=False, index=True)
    code = db.Column(db.String(30), nullable=False)   # e.g. "ICS 2303"
    title = db.Column(db.String(200), nullable=False)  # e.g. "Web Development 1"
    lecturer_name = db.Column(db.String(120), nullable=True)
    lecturer_email = db.Column(db.String(120), nullable=True)
    difficulty_level = db.Column(db.Integer, default=3)     # 1-5 scale
    academic_importance = db.Column(db.Integer, default=4)  # 1-5 scale
    min_weekly_hours = db.Column(db.Float, default=4.0)
    target_weekly_hours = db.Column(db.Float, default=6.0)
    actual_weekly_hours = db.Column(db.Float, default=0.0)
    target_grade = db.Column(db.String(20), default='Distinction')
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    topics = db.relationship('CourseTopic', backref='course', cascade='all, delete-orphan', lazy=True)
    assignments = db.relationship('Assignment', backref='course', cascade='all, delete-orphan', lazy=True)
    assessments = db.relationship('Assessment', backref='course', cascade='all, delete-orphan', lazy=True)
    resources = db.relationship('AcademicResource', backref='course', cascade='all, delete-orphan', lazy=True)

    @property
    def attention_gap(self):
        return max(0.0, round(self.target_weekly_hours - self.actual_weekly_hours, 1))

    @property
    def is_neglected(self):
        return self.actual_weekly_hours < self.min_weekly_hours

    @property
    def mastered_topics_count(self):
        return sum(1 for t in self.topics if t.status == 'Mastered')

    def to_dict(self):
        topics_count = len(self.topics)
        mastered_topics = sum(1 for t in self.topics if t.status == 'Mastered')
        mastery_rate = round((mastered_topics / topics_count * 100), 1) if topics_count > 0 else 0.0

        return {
            'id': self.id,
            'term_id': self.term_id,
            'code': self.code,
            'title': self.title,
            'lecturer_name': self.lecturer_name,
            'lecturer_email': self.lecturer_email,
            'difficulty_level': self.difficulty_level,
            'academic_importance': self.academic_importance,
            'min_weekly_hours': self.min_weekly_hours,
            'target_weekly_hours': self.target_weekly_hours,
            'actual_weekly_hours': self.actual_weekly_hours,
            'attention_gap': self.attention_gap,
            'is_neglected': self.is_neglected,
            'target_grade': self.target_grade,
            'is_archived': self.is_archived,
            'topics_count': topics_count,
            'mastered_topics_count': mastered_topics,
            'mastery_rate': mastery_rate,
            'assignments_count': len(self.assignments),
            'assessments_count': len(self.assessments)
        }


class CourseTopic(db.Model):
    __tablename__ = 'course_topics'

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    # Status: 'Not Started', 'Learning', 'Practicing', 'Needs Revision', 'Understood', 'Mastered'
    status = db.Column(db.String(30), default='Not Started')
    confidence_score = db.Column(db.Integer, default=1)  # 1 to 5 scale
    last_revised_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    revisions = db.relationship('TopicRevision', backref='topic', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'title': self.title,
            'order_index': self.order_index,
            'status': self.status,
            'confidence_score': self.confidence_score,
            'last_revised_at': self.last_revised_at.isoformat() if self.last_revised_at else None,
            'notes': self.notes,
            'revisions_count': len(self.revisions)
        }


class TopicRevision(db.Model):
    __tablename__ = 'topic_revisions'

    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('course_topics.id', ondelete='CASCADE'), nullable=False, index=True)
    revision_date = db.Column(db.Date, default=date.today)
    duration_mins = db.Column(db.Integer, default=45)
    confidence_after = db.Column(db.Integer, nullable=True)  # 1-5
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'topic_id': self.topic_id,
            'revision_date': self.revision_date.isoformat() if self.revision_date else None,
            'duration_mins': self.duration_mins,
            'confidence_after': self.confidence_after,
            'notes': self.notes
        }


class Assignment(db.Model):
    __tablename__ = 'assignments'

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assignment_type = db.Column(db.String(50), default='Assignment')  # Assignment, Lab, Project, Essay
    assigned_date = db.Column(db.Date, nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    has_explicit_time = db.Column(db.Boolean, default=False)
    estimated_effort_hours = db.Column(db.Float, default=3.0)
    actual_effort_hours = db.Column(db.Float, default=0.0)
    priority = db.Column(db.Integer, default=3)  # 1-5
    # Status: 'Not Started', 'In Progress', 'Submitted', 'Completed', 'Overdue'
    status = db.Column(db.String(30), default='Not Started')
    max_marks = db.Column(db.Float, nullable=True)
    score_received = db.Column(db.Float, nullable=True)
    source_system = db.Column(db.String(50), default='MANUAL')  # MANUAL, SODEL
    source_url = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    subtasks = db.relationship('AssignmentSubtask', backref='assignment', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        subtasks_list = [s.to_dict() for s in self.subtasks]
        completed_subtasks = sum(1 for s in subtasks_list if s['is_completed'])
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_code': self.course.code if self.course else None,
            'course_title': self.course.title if self.course else None,
            'title': self.title,
            'description': self.description,
            'assignment_type': self.assignment_type,
            'assigned_date': self.assigned_date.isoformat() if self.assigned_date else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'has_explicit_time': self.has_explicit_time,
            'estimated_effort_hours': self.estimated_effort_hours,
            'actual_effort_hours': self.actual_effort_hours,
            'priority': self.priority,
            'status': self.status,
            'max_marks': self.max_marks,
            'score_received': self.score_received,
            'source_system': self.source_system,
            'source_url': self.source_url,
            'notes': self.notes,
            'subtasks': subtasks_list,
            'subtasks_count': len(subtasks_list),
            'completed_subtasks_count': completed_subtasks,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AssignmentSubtask(db.Model):
    __tablename__ = 'assignment_subtasks'

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    estimated_mins = db.Column(db.Integer, default=60)
    order_index = db.Column(db.Integer, default=0)
    is_completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'title': self.title,
            'estimated_mins': self.estimated_mins,
            'order_index': self.order_index,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class Assessment(db.Model):
    __tablename__ = 'assessments'

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)  # e.g. "CAT 1", "Final Examination"
    assessment_type = db.Column(db.String(30), default='CAT')  # CAT, Exam, Quiz
    assessment_date = db.Column(db.DateTime, nullable=False)
    has_explicit_time = db.Column(db.Boolean, default=False)
    weight_percentage = db.Column(db.Float, nullable=True)  # e.g. 15.0 for CAT 1, 70.0 for Final Exam
    max_marks = db.Column(db.Float, nullable=True)
    score_received = db.Column(db.Float, nullable=True)
    preparation_progress = db.Column(db.Integer, default=0)  # 0-100%
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_code': self.course.code if self.course else None,
            'course_title': self.course.title if self.course else None,
            'title': self.title,
            'assessment_type': self.assessment_type,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'has_explicit_time': self.has_explicit_time,
            'weight_percentage': self.weight_percentage,
            'max_marks': self.max_marks,
            'score_received': self.score_received,
            'preparation_progress': self.preparation_progress,
            'notes': self.notes
        }


class AcademicResource(db.Model):
    __tablename__ = 'academic_resources'

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('course_topics.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    resource_type = db.Column(db.String(50), default='URL')  # URL, PDF, Video, Note
    file_path = db.Column(db.Text, nullable=True)
    external_url = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_code': self.course.code if self.course else None,
            'topic_id': self.topic_id,
            'title': self.title,
            'resource_type': self.resource_type,
            'file_path': self.file_path,
            'external_url': self.external_url,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
