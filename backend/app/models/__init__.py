from .user import db, User
from .settings import UserSettings
from .academic import (
    AcademicTerm,
    Course,
    CourseTopic,
    TopicRevision,
    Assignment,
    AssignmentSubtask,
    Assessment,
    AcademicResource,
)

__all__ = [
    'db',
    'User',
    'UserSettings',
    'AcademicTerm',
    'Course',
    'CourseTopic',
    'TopicRevision',
    'Assignment',
    'AssignmentSubtask',
    'Assessment',
    'AcademicResource',
]
