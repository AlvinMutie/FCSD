import pytest
from backend.app import create_app
from backend.app.models import db, User, UserSettings

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'

@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            yield client
            db.session.remove()
            db.drop_all()

def test_health_check(client):
    res = client.get('/api/health')
    assert res.status_code == 200
    assert res.get_json()['status'] == 'healthy'

def test_login_seeded_user(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@jkuat.ac.ke',
        'password': 'Password123!'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['email'] == 'student@jkuat.ac.ke'
    assert 'settings' in data

def test_register_and_login_new_user(client):
    res = client.post('/api/auth/register', json={
        'email': 'alex@example.com',
        'password': 'SecurePassword456',
        'display_name': 'Alex Kamau'
    })
    assert res.status_code == 201
    user_data = res.get_json()['user']
    assert user_data['display_name'] == 'Alex Kamau'

    # Check /me endpoint
    me_res = client.get('/api/auth/me')
    assert me_res.status_code == 200
    assert me_res.get_json()['authenticated'] is True

def test_update_user_settings(client):
    # Log in as default student
    client.post('/api/auth/login', json={
        'email': 'student@jkuat.ac.ke',
        'password': 'Password123!'
    })

    # Update settings
    update_res = client.put('/api/settings', json={
        'display_name': 'Distinction Hunter',
        'max_daily_study_hours': 9.5,
        'skills_daily_target_hours': 3.5,
        'theme_appearance': 'dark'
    })
    assert update_res.status_code == 200
    updated = update_res.get_json()
    assert updated['user']['display_name'] == 'Distinction Hunter'
    assert updated['settings']['max_daily_study_hours'] == 9.5
    assert updated['settings']['skills_daily_target_hours'] == 3.5

def test_dashboard_overview_authenticated(client):
    client.post('/api/auth/login', json={
        'email': 'student@jkuat.ac.ke',
        'password': 'Password123!'
    })

    res = client.get('/api/dashboard/overview')
    assert res.status_code == 200
    data = res.get_json()
    assert 'todays_focus' in data
    assert 'academic_overview' in data
    assert 'skills_overview' in data
    assert 'career_overview' in data
    assert 'time_allocation' in data
    assert len(data['skills_overview']['tracks']) == 4

