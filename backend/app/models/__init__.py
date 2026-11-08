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
from .integration import (
    Integration,
    PendingImport,
    ImportProvenance,
)
from .scheduler import (
    AvailabilityRule,
    ScheduleVersion,
    CalendarEvent,
)
from .skill import (
    Skill,
    LearningStage,
    LearningTask,
    LearningSession,
    LearningEvidence,
)
from .career import (
    JobOpportunity,
    CVDocument,
    Application,
    InterviewPrep,
)
from .project import (
    Project,
    ProjectMilestone,
    MilestoneTask,
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
    'Integration',
    'PendingImport',
    'ImportProvenance',
    'AvailabilityRule',
    'ScheduleVersion',
    'CalendarEvent',
    'Skill',
    'LearningStage',
    'LearningTask',
    'LearningSession',
    'LearningEvidence',
    'JobOpportunity',
    'CVDocument',
    'Application',
    'InterviewPrep',
    'Project',
    'ProjectMilestone',
    'MilestoneTask',
]
