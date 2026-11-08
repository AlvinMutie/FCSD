import os
from datetime import datetime, date, timedelta
from flask import Flask
from flask_cors import CORS
from .config import Config
from .models import (
    db,
    User,
    UserSettings,
    AcademicTerm,
    Course,
    CourseTopic,
    Assignment,
    AssignmentSubtask,
    Assessment,
    AcademicResource,
    Skill,
    LearningStage,
    LearningTask,
    LearningEvidence,
    JobOpportunity,
    CVDocument,
    Project,
    ProjectMilestone,
    MilestoneTask,
)
from .auth.routes import auth_bp
from .settings.routes import settings_bp
from .dashboard.routes import dashboard_bp
from .academics.routes import academics_bp
from .integrations.routes import integrations_bp
from .scheduler.routes import scheduler_bp
from .skills.routes import skills_bp
from .career.routes import career_bp
from .projects.routes import projects_bp
from .analytics.routes import analytics_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend Vite dev server
    CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'])

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(academics_bp)
    app.register_blueprint(integrations_bp)
    app.register_blueprint(scheduler_bp)
    app.register_blueprint(skills_bp)
    app.register_blueprint(career_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(analytics_bp)

    with app.app_context():
        db.create_all()

        # Seed default student user if none exists
        student = User.query.filter_by(email='student@jkuat.ac.ke').first()
        if not student:
            student = User(
                email='student@jkuat.ac.ke',
                display_name='JKUAT SODeL Scholar',
                timezone='Africa/Nairobi'
            )
            student.set_password('Password123!')
            db.session.add(student)
            db.session.flush()

            settings = UserSettings(user_id=student.id)
            db.session.add(settings)
            db.session.commit()

        # Seed example academic term and courses for student if none exist
        if student and not AcademicTerm.query.filter_by(user_id=student.id).first():
            today = date.today()
            term = AcademicTerm(
                user_id=student.id,
                name="Year 2 Semester 2",
                start_date=today - timedelta(days=30),
                end_date=today + timedelta(days=90),
                is_current=True
            )
            db.session.add(term)
            db.session.flush()

            # Course 1: Web Development 1 (ICS 2303)
            c1 = Course(
                term_id=term.id,
                code="ICS 2303",
                title="Web Development 1",
                lecturer_name="Dr. Kariuki",
                difficulty_level=3,
                academic_importance=5,
                min_weekly_hours=4.0,
                target_weekly_hours=6.0,
                actual_weekly_hours=3.5,
                target_grade="Distinction"
            )
            db.session.add(c1)
            db.session.flush()

            # Topics for Web Dev
            t1_1 = CourseTopic(course_id=c1.id, title="Semantic HTML5 & Accessibility", order_index=1, status="Mastered", confidence_score=5)
            t1_2 = CourseTopic(course_id=c1.id, title="CSS Flexbox & Grid Layouts", order_index=2, status="Understood", confidence_score=4)
            t1_3 = CourseTopic(course_id=c1.id, title="Client-Side JavaScript & DOM Manipulation", order_index=3, status="Practicing", confidence_score=3)
            t1_4 = CourseTopic(course_id=c1.id, title="Asynchronous JavaScript & REST APIs", order_index=4, status="Learning", confidence_score=2)
            db.session.add_all([t1_1, t1_2, t1_3, t1_4])

            # Course 2: Software Engineering 1
            c2 = Course(
                term_id=term.id,
                code="ICS 2201",
                title="Software Engineering 1",
                lecturer_name="Prof. Omondi",
                difficulty_level=4,
                academic_importance=5,
                min_weekly_hours=4.0,
                target_weekly_hours=6.0,
                actual_weekly_hours=1.5,  # Neglected unit demo
                target_grade="Distinction"
            )
            db.session.add(c2)
            db.session.flush()

            t2_1 = CourseTopic(course_id=c2.id, title="SDLC Models & Agile Frameworks", order_index=1, status="Understood", confidence_score=4)
            t2_2 = CourseTopic(course_id=c2.id, title="Requirements Engineering & Use Cases", order_index=2, status="Practicing", confidence_score=3)
            t2_3 = CourseTopic(course_id=c2.id, title="UML Class & Sequence Diagrams", order_index=3, status="Needs Revision", confidence_score=2)
            db.session.add_all([t2_1, t2_2, t2_3])

            # Course 3: Database Systems
            c3 = Course(
                term_id=term.id,
                code="ICS 2203",
                title="Database Systems",
                lecturer_name="Eng. Mutua",
                difficulty_level=3,
                academic_importance=4,
                min_weekly_hours=3.5,
                target_weekly_hours=5.0,
                actual_weekly_hours=4.0,
                target_grade="Distinction"
            )
            db.session.add(c3)
            db.session.flush()

            t3_1 = CourseTopic(course_id=c3.id, title="Relational Algebra & Normalization (1NF-3NF)", order_index=1, status="Understood", confidence_score=4)
            t3_2 = CourseTopic(course_id=c3.id, title="Advanced SQL & Indexing Strategies", order_index=2, status="Practicing", confidence_score=3)
            db.session.add_all([t3_1, t3_2])

            # Example Assignment with granular subtasks (as specified in build prompt)
            assign1 = Assignment(
                course_id=c1.id,
                title="Build a Responsive Academic Portfolio Website",
                description="Create a semantic, responsive personal portfolio showcasing projects and university coursework.",
                assignment_type="Project",
                assigned_date=today - timedelta(days=7),
                deadline=datetime.combine(today + timedelta(days=5), datetime.min.time()),
                has_explicit_time=False,
                estimated_effort_hours=6.0,
                actual_effort_hours=2.5,
                priority=4,
                status="In Progress",
                max_marks=20.0
            )
            db.session.add(assign1)
            db.session.flush()

            # Granular subtasks
            subtasks = [
                AssignmentSubtask(assignment_id=assign1.id, title="Understand requirements & design spec", estimated_mins=45, order_index=1, is_completed=True),
                AssignmentSubtask(assignment_id=assign1.id, title="Research color schemes & wireframe layout", estimated_mins=60, order_index=2, is_completed=True),
                AssignmentSubtask(assignment_id=assign1.id, title="Develop semantic HTML structure", estimated_mins=90, order_index=3, is_completed=False),
                AssignmentSubtask(assignment_id=assign1.id, title="Implement responsive CSS Flexbox/Grid", estimated_mins=120, order_index=4, is_completed=False),
                AssignmentSubtask(assignment_id=assign1.id, title="Test mobile responsiveness & cross-browser check", estimated_mins=60, order_index=5, is_completed=False),
                AssignmentSubtask(assignment_id=assign1.id, title="Review against rubric and submit", estimated_mins=30, order_index=6, is_completed=False)
            ]
            db.session.add_all(subtasks)

            # Example Upcoming CAT
            cat1 = Assessment(
                course_id=c2.id,
                title="CAT 1: Requirements & UML Modeling",
                assessment_type="CAT",
                assessment_date=datetime.combine(today + timedelta(days=8), datetime.min.time()),
                has_explicit_time=False,
                weight_percentage=15.0,
                max_marks=30.0,
                preparation_progress=40,
                notes="Focus heavily on sequence diagram syntax and use case relationships."
            )
            db.session.add(cat1)
            db.session.commit()

        # Seed the 4 primary technical tracks for student if none exist
        if student and not Skill.query.filter_by(user_id=student.id).first():
            # Track 1: Python
            sk1 = Skill(user_id=student.id, track_name='Python', current_level='Beginner', weekly_target_hours=5.0, color_hex='#3b82f6')
            db.session.add(sk1)
            db.session.flush()

            st1_1 = LearningStage(skill_id=sk1.id, title='Core Python & Data Structures', order_index=1, status='In Progress')
            db.session.add(st1_1)
            db.session.flush()

            db.session.add_all([
                LearningTask(stage_id=st1_1.id, title='Control flow, list comprehensions & dicts', estimated_hours=3.0, is_completed=True),
                LearningTask(stage_id=st1_1.id, title='OOP principles: Classes, inheritance & dunder methods', estimated_hours=4.0, is_completed=False),
                LearningTask(stage_id=st1_1.id, title='File I/O, JSON serialization & error handling', estimated_hours=3.0, is_completed=False)
            ])

            # Track 2: Cybersecurity
            sk2 = Skill(user_id=student.id, track_name='Cybersecurity', current_level='Beginner', weekly_target_hours=5.0, color_hex='#ef4444')
            db.session.add(sk2)
            db.session.flush()

            st2_1 = LearningStage(skill_id=sk2.id, title='Security Fundamentals & Network Defense', order_index=1, status='In Progress')
            db.session.add(st2_1)
            db.session.flush()

            db.session.add_all([
                LearningTask(stage_id=st2_1.id, title='CIA Triad, authentication mechanisms & RBAC', estimated_hours=3.0, is_completed=True),
                LearningTask(stage_id=st2_1.id, title='Wireshark packet sniffing & protocol inspection', estimated_hours=4.0, is_completed=False),
                LearningTask(stage_id=st2_1.id, title='OWASP Top 10 web vulnerabilities walkthrough', estimated_hours=5.0, is_completed=False)
            ])

            # Track 3: Web Development
            sk3 = Skill(user_id=student.id, track_name='Web Development', current_level='Intermediate', weekly_target_hours=6.0, color_hex='#10b981')
            db.session.add(sk3)
            db.session.flush()

            st3_1 = LearningStage(skill_id=sk3.id, title='Modern Full-Stack Applications', order_index=1, status='In Progress')
            db.session.add(st3_1)
            db.session.flush()

            db.session.add_all([
                LearningTask(stage_id=st3_1.id, title='React component state, hooks & context architecture', estimated_hours=5.0, is_completed=True),
                LearningTask(stage_id=st3_1.id, title='Flask RESTful API design with SQLAlchemy ORM', estimated_hours=6.0, is_completed=True),
                LearningTask(stage_id=st3_1.id, title='Secure session auth & CSRF defense', estimated_hours=4.0, is_completed=False)
            ])

            # Track 4: Networking
            sk4 = Skill(user_id=student.id, track_name='Networking', current_level='Beginner', weekly_target_hours=5.0, color_hex='#8b5cf6')
            db.session.add(sk4)
            db.session.flush()

            st4_1 = LearningStage(skill_id=sk4.id, title='CCNA Foundations & Subnetting', order_index=1, status='In Progress')
            db.session.add(st4_1)
            db.session.flush()

            db.session.add_all([
                LearningTask(stage_id=st4_1.id, title='IPv4/IPv6 addressing & VLSM calculation exercises', estimated_hours=4.0, is_completed=False),
                LearningTask(stage_id=st4_1.id, title='Cisco Packet Tracer: Router & Switch configuration', estimated_hours=5.0, is_completed=False)
            ])

            # Initial evidence record
            ev1 = LearningEvidence(
                skill_id=sk3.id,
                title='MyLife OS - Personal Operating System',
                evidence_type='GitHub',
                url_or_path='https://github.com/blueberry/mylife-os',
                description='Full-stack productivity workspace combining React, TypeScript, and Flask scheduling engine.'
            )
            db.session.add(ev1)
            db.session.commit()

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'healthy', 'service': 'MyLife OS API'}, 200

    return app
