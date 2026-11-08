import pytest
from datetime import date, datetime, timedelta
from backend.app import create_app
from backend.app.models import db, User, AcademicTerm, Course, Assignment, Assessment

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-academics'

@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            yield client
            db.session.remove()
            db.drop_all()

def login_student(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@jkuat.ac.ke',
        'password': 'Password123!'
    })
    assert res.status_code == 200

def test_terms_and_courses_crud(client):
    login_student(client)

    # List terms (seeded term should exist)
    res = client.get('/api/academics/terms')
    assert res.status_code == 200
    terms = res.get_json()['terms']
    assert len(terms) >= 1
    term_id = terms[0]['id']

    # Create new course
    course_res = client.post('/api/academics/courses', json={
        'term_id': term_id,
        'code': 'ICS 2307',
        'title': 'Computer Networks 1',
        'difficulty_level': 3,
        'academic_importance': 4,
        'min_weekly_hours': 3.5,
        'target_weekly_hours': 5.5,
        'actual_weekly_hours': 0.0
    })
    assert course_res.status_code == 201
    course_data = course_res.get_json()['course']
    assert course_data['code'] == 'ICS 2307'
    assert course_data['attention_gap'] == 5.5
    assert course_data['is_neglected'] is True

def test_topic_revision_and_confidence(client):
    login_student(client)

    # Get courses
    res = client.get('/api/academics/courses')
    courses = res.get_json()['courses']
    course = courses[0]

    # Add topic
    topic_res = client.post(f'/api/academics/courses/{course["id"]}/topics', json={
        'title': 'Network Protocol Stack & OSI Layers',
        'confidence_score': 1
    })
    assert topic_res.status_code == 201
    topic = topic_res.get_json()['topic']
    assert topic['confidence_score'] == 1

    # Revise topic (45 mins, improves confidence to 4)
    rev_res = client.post(f'/api/academics/topics/{topic["id"]}/revise', json={
        'duration_mins': 60,
        'confidence_after': 4,
        'notes': 'Understood encapsulation and transport layer TCP vs UDP.'
    })
    assert rev_res.status_code == 201
    updated_topic = rev_res.get_json()['topic']
    assert updated_topic['confidence_score'] == 4
    assert updated_topic['status'] == 'Understood'

    # Verify course actual hours increased
    updated_course = rev_res.get_json()['course']
    assert updated_course['actual_weekly_hours'] > course['actual_weekly_hours']

def test_assignment_subtasks_breakdown(client):
    login_student(client)

    courses = client.get('/api/academics/courses').get_json()['courses']
    course_id = courses[0]['id']

    # Create assignment with 3 granular subtasks
    assign_res = client.post('/api/academics/assignments', json={
        'course_id': course_id,
        'title': 'Design Relational Schema for Hospital System',
        'deadline': (datetime.now() + timedelta(days=6)).isoformat(),
        'has_explicit_time': False,
        'estimated_effort_hours': 4.0,
        'priority': 4,
        'subtasks': [
            {'title': 'Identify entities & attributes', 'estimated_mins': 60},
            {'title': 'Draw ER diagram', 'estimated_mins': 90},
            {'title': 'Apply 3NF normalization', 'estimated_mins': 90}
        ]
    })
    assert assign_res.status_code == 201
    assign_data = assign_res.get_json()['assignment']
    assert len(assign_data['subtasks']) == 3

    subtask_id = assign_data['subtasks'][0]['id']
    toggle_res = client.patch(f'/api/academics/subtasks/{subtask_id}/toggle')
    assert toggle_res.status_code == 200
    assert toggle_res.get_json()['subtask']['is_completed'] is True

def test_academic_balance_engine(client):
    login_student(client)

    balance_res = client.get('/api/academics/balance')
    assert balance_res.status_code == 200
    data = balance_res.get_json()
    assert 'courses' in data
    assert 'attention_alerts' in data
    assert 'distinction_readiness_score' in data
    assert 'spaced_revision_queue' in data

    # Software Engineering was seeded with 1.5h actual < 4.0h min floor -> should trigger HIGH alert
    alerts = data['attention_alerts']
    neglected_alerts = [a for a in alerts if a['severity'] == 'HIGH']
    assert len(neglected_alerts) >= 1
    assert any('ICS 2201' in a['message'] for a in neglected_alerts)

