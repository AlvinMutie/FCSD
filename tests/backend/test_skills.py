import pytest
from backend.app import create_app
from backend.app.models import db, User, Skill, LearningSession, LearningEvidence

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-skills'

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

def test_tracks_and_roadmaps(client):
    login_student(client)

    # 1. Fetch tracks
    res = client.get('/api/skills/tracks')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['tracks']) == 4
    assert data['total_weekly_target'] == 21.0

    track_names = [t['track_name'] for t in data['tracks']]
    assert 'Python' in track_names
    assert 'Cybersecurity' in track_names
    assert 'Web Development' in track_names
    assert 'Networking' in track_names

    # 2. Get roadmap for Python
    python_track = next(t for t in data['tracks'] if t['track_name'] == 'Python')
    roadmap_res = client.get(f'/api/skills/tracks/{python_track["id"]}/roadmap')
    assert roadmap_res.status_code == 200
    stages = roadmap_res.get_json()['stages']
    assert len(stages) >= 1
    tasks = stages[0]['tasks']
    assert len(tasks) >= 2

    # 3. Toggle task completion
    task_id = tasks[1]['id']
    toggle_res = client.patch(f'/api/skills/tasks/{task_id}/toggle')
    assert toggle_res.status_code == 200
    assert toggle_res.get_json()['task']['is_completed'] is True

def test_record_session_and_evidence(client):
    login_student(client)

    tracks = client.get('/api/skills/tracks').get_json()['tracks']
    web_track = next(t for t in tracks if t['track_name'] == 'Web Development')

    # Record learning session with reflection
    sess_res = client.post('/api/skills/sessions', json={
        'skill_id': web_track['id'],
        'duration_mins': 90,
        'topic_studied': 'React Context API and Custom Hook Patterns',
        'key_learnings': 'Centralized state management without external prop drilling.',
        'difficulties_faced': 'TypeScript generic types for Context state.',
        'next_steps': 'Build timetable drag and drop calendar integration.'
    })
    assert sess_res.status_code == 201
    sess_data = sess_res.get_json()['session']
    assert sess_data['duration_mins'] == 90
    assert sess_data['skill_track'] == 'Web Development'

    # Add evidence link
    ev_res = client.post('/api/skills/evidence', json={
        'skill_id': web_track['id'],
        'title': 'E-Commerce React Demo',
        'evidence_type': 'GitHub',
        'url_or_path': 'https://github.com/blueberry/react-cart',
        'description': 'Full shopping cart with reducer state.'
    })
    assert ev_res.status_code == 201
    ev_data = ev_res.get_json()['evidence']
    assert ev_data['evidence_type'] == 'GitHub'
