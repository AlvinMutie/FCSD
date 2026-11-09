import os
import sys
import json
from datetime import datetime, date, timedelta, timezone

# Add repo root to python path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.app import create_app, db
from backend.app.models import (
    User,
    AcademicTerm,
    Course,
    CourseTopic,
    Assignment,
    AssignmentSubtask,
    Assessment,
    CalendarEvent,
    Integration,
    PendingImport,
    ImportProvenance,
)

app = create_app()

with app.app_context():
    student = User.query.filter_by(email='student@jkuat.ac.ke').first()
    if not student:
        print("Student user not found!")
        sys.exit(1)

    print(f"Cleaning test data for user: {student.email} (ID: {student.id})")

    # 1. Clear old calendar events generated from test courses
    deleted_events = CalendarEvent.query.filter_by(user_id=student.id).delete()
    print(f"Deleted {deleted_events} calendar events.")

    # 2. Find and delete mock courses (ICS 2303, ICS 2201, ICS 2203 or mock titles)
    mock_courses = Course.query.filter(
        Course.code.in_(['ICS 2303', 'ICS 2201', 'ICS 2203']) |
        Course.title.in_(['Web Development 1', 'Software Engineering 1', 'Database Systems'])
    ).all()

    for mc in mock_courses:
        # Delete subtasks, assignments, assessments, topics
        for a in mc.assignments:
            AssignmentSubtask.query.filter_by(assignment_id=a.id).delete()
        Assignment.query.filter_by(course_id=mc.id).delete()
        Assessment.query.filter_by(course_id=mc.id).delete()
        CourseTopic.query.filter_by(course_id=mc.id).delete()
        db.session.delete(mc)
        print(f"Deleted mock course: {mc.code} - {mc.title}")

    # 3. Ensure active pairing token exists
    intg = Integration.query.filter_by(user_id=student.id, provider='sodel').first()
    if not intg:
        intg = Integration(
            user_id=student.id,
            provider='sodel',
            pairing_token='mlb_sodel_alvin2026',
            is_active=True
        )
        db.session.add(intg)
    else:
        intg.pairing_token = 'mlb_sodel_alvin2026'
        intg.is_active = True
    print(f"Active pairing token set to: {intg.pairing_token}")

    # 4. Ensure current term exists
    term = AcademicTerm.query.filter_by(user_id=student.id, is_current=True).first()
    if not term:
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
    print(f"Using Academic Term: {term.name} (ID: {term.id})")

    # 5. The user's 8 real units from their SODeL dashboard screenshot
    real_units = [
        {
            "code": "BIT 2214",
            "title": "BIT 2214/ HBT 2305 Object-Oriented Analysis and Design",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=bit2214",
            "difficulty": 4,
            "importance": 5,
            "min_hours": 4.0,
            "target_hours": 6.0,
            "topics": [
                "Object Oriented Concepts & Unified Modeling Language (UML)",
                "Requirements Elicitation, Use Case Modeling & User Stories",
                "Domain Modeling & Class Diagrams (Attributes, Methods, Associations)",
                "Dynamic Modeling: Sequence Diagrams & Activity Diagrams",
                "Design Patterns: Creational, Structural & Behavioral Patterns",
                "Architecture Design: MVC, Layered & Microservices",
                "Object-Oriented Testing & Code Generation"
            ]
        },
        {
            "code": "CALC 1",
            "title": "Calculus I",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=calc1",
            "difficulty": 4,
            "importance": 4,
            "min_hours": 3.5,
            "target_hours": 5.0,
            "topics": [
                "Functions, Limits & Continuity",
                "Differentiation: First Principles & Power, Product, Quotient Rules",
                "Implicit Differentiation & Chain Rule",
                "Applications of Differentiation: Tangents, Normals & Rate of Change",
                "Curve Sketching: Turning Points & Points of Inflection",
                "Introduction to Integration: Indefinite Integrals & Fundamental Theorem",
                "Applications of Integration: Area under Curves"
            ]
        },
        {
            "code": "DB-SYS",
            "title": "Database System",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=dbsys",
            "difficulty": 3,
            "importance": 5,
            "min_hours": 4.0,
            "target_hours": 6.0,
            "topics": [
                "Database Architecture & The Three-Schema Framework",
                "Conceptual Modeling: Entity-Relationship (ER) Diagrams",
                "Relational Model: Schemas, Keys & Constraints",
                "Relational Algebra & Tuple Relational Calculus",
                "Normalization Theory: Functional Dependencies (1NF, 2NF, 3NF, BCNF)",
                "Structured Query Language (SQL): DDL, DML & Subqueries",
                "Transaction Management, Concurrency Control (ACID) & Indexing"
            ]
        },
        {
            "code": "GIS",
            "title": "Geographical Information Systems",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=gis",
            "difficulty": 3,
            "importance": 4,
            "min_hours": 3.0,
            "target_hours": 4.5,
            "topics": [
                "Fundamentals of GIS & Spatial Data Models (Vector vs Raster)",
                "Coordinate Systems, Map Projections & Georeferencing",
                "Spatial Data Collection, GPS & Remote Sensing Principles",
                "Spatial Database Management & Attribute Queries",
                "Spatial Analysis: Buffering, Overlay & Proximity Analysis",
                "Cartographic Principles & Digital Map Production",
                "GIS Applications in Urban Planning, Logistics & Environment"
            ]
        },
        {
            "code": "MWC",
            "title": "Mobile & Wireless Computing",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=mwc",
            "difficulty": 3,
            "importance": 4,
            "min_hours": 3.5,
            "target_hours": 5.0,
            "topics": [
                "Overview of Wireless Communication & Cellular Network Evolution (2G-5G)",
                "Radio Propagation, Multipath Fading & Channel Modeling",
                "Wireless Technologies: Wi-Fi (802.11), Bluetooth, ZigBee & RFID",
                "Mobile IP, Routing Protocols & Mobility Management",
                "Mobile Computing Architecture: Client-Server & P2P",
                "Wireless Network Security: WPA3, Rogue APs & Encryption",
                "Emerging Trends: Mobile Edge Computing & Internet of Things (IoT)"
            ]
        },
        {
            "code": "OOP 1",
            "title": "Object Oriented Programming I",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=oop1",
            "difficulty": 3,
            "importance": 5,
            "min_hours": 4.0,
            "target_hours": 6.0,
            "topics": [
                "Foundations of OOP: Classes, Objects & Instantiation",
                "Encapsulation, Access Specifiers (public/private/protected) & Getters/Setters",
                "Constructors, Destructors & Method Overloading",
                "Inheritance: Single, Multilevel & Hierarchical",
                "Polymorphism: Method Overriding & Virtual Functions",
                "Abstract Classes, Interfaces & Pure Virtual Functions",
                "Exception Handling, File Streams & Memory Allocation"
            ]
        },
        {
            "code": "SE 1",
            "title": "Software Engineering 1",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=se1",
            "difficulty": 4,
            "importance": 5,
            "min_hours": 4.0,
            "target_hours": 6.0,
            "topics": [
                "Software Engineering Discipline & SDLC Life Cycles",
                "Agile Methodologies: Scrum, Kanban, Sprint Planning & Daily Standups",
                "Software Requirements Specification (SRS) & IEEE Standards",
                "Architectural Styles & Modular Design Principles (Coupling vs Cohesion)",
                "Software Quality Assurance (SQA) & Verification/Validation",
                "Testing Methodologies: Unit Testing, Integration Testing & TDD",
                "Software Maintenance, Version Control & CI/CD Pipelines"
            ]
        },
        {
            "code": "WAD 1",
            "title": "Web Application Development I",
            "url": "https://sodel3v2.jkuat.ac.ke/course/view.php?id=wad1",
            "difficulty": 3,
            "importance": 5,
            "min_hours": 4.0,
            "target_hours": 6.0,
            "topics": [
                "Web Architecture: HTTP/HTTPS, Client-Server Protocol & Request Lifecycle",
                "Modern Semantic HTML5 & Web Accessibility (WCAG standards)",
                "Responsive Design: CSS3 Flexbox, CSS Grid & Media Queries",
                "JavaScript Essentials: ES6+ Syntax, Scope, Closures & Event Loop",
                "DOM Manipulation, Event Bubbling & Dynamic UIs",
                "Asynchronous Programming: Fetch API, Promises & Async/Await",
                "Web Security Basics: XSS, CSRF & Input Sanitization"
            ]
        }
    ]

    # Clean existing PendingImports for student
    PendingImport.query.filter_by(user_id=student.id).delete()
    print("Cleared previous pending imports.")

    for u in real_units:
        # Check if course already exists under term
        c = Course.query.filter_by(term_id=term.id, title=u["title"]).first()
        if not c:
            c = Course.query.filter_by(term_id=term.id, code=u["code"]).first()

        if not c:
            c = Course(
                term_id=term.id,
                code=u["code"],
                title=u["title"],
                difficulty_level=u["difficulty"],
                academic_importance=u["importance"],
                min_weekly_hours=u["min_hours"],
                target_weekly_hours=u["target_hours"],
                actual_weekly_hours=0.0,
                target_grade="Distinction"
            )
            db.session.add(c)
            db.session.flush()
            print(f"Created real course: [{c.code}] {c.title}")
        else:
            c.title = u["title"]
            c.code = u["code"]
            c.difficulty_level = u["difficulty"]
            c.academic_importance = u["importance"]
            c.min_weekly_hours = u["min_hours"]
            c.target_weekly_hours = u["target_hours"]
            print(f"Updated real course: [{c.code}] {c.title}")

        # Add topics for each unit
        for idx, t_title in enumerate(u["topics"], start=1):
            topic = CourseTopic.query.filter_by(course_id=c.id, title=t_title).first()
            if not topic:
                topic = CourseTopic(
                    course_id=c.id,
                    title=t_title,
                    order_index=idx,
                    status="Needs Revision",
                    confidence_score=1
                )
                db.session.add(topic)

        # Also create a staged PendingImport record (provenance showing it came from SODeL Bridge)
        p_import = PendingImport(
            user_id=student.id,
            source_system='sodel',
            source_url=u["url"],
            item_type='course',
            raw_data_json=json.dumps({"title": u["title"], "code": u["code"], "sections": u["topics"]}),
            normalized_title=u["title"],
            normalized_course_code=u["code"],
            status='Approved',
            reviewed_at=datetime.now(timezone.utc)
        )
        db.session.add(p_import)
        db.session.flush()

        prov = ImportProvenance(
            pending_import_id=p_import.id,
            target_table='courses',
            target_record_id=c.id,
            action_taken='CREATED',
            approved_by_user_id=student.id
        )
        db.session.add(prov)

    db.session.commit()
    print(f"\nAll 8 real units from SODeL dashboard are now active in MyLife OS for {student.email}!")
