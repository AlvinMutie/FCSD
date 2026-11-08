"""
Phase 8 — Projects Workspace backend tests.
"""
import pytest
from backend.app import create_app
from backend.app.models import db as _db


@pytest.fixture(scope='module')
def app():
    application = create_app()
    application.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key',
    })
    with application.app_context():
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='module')
def client(app):
    return app.test_client()


@pytest.fixture(scope='module')
def auth_client(client):
    client.post('/api/auth/register', json={
        'email': 'projects_test@jkuat.ac.ke',
        'password': 'Password123!',
        'display_name': 'Projects Tester'
    })
    client.post('/api/auth/login', json={
        'email': 'projects_test@jkuat.ac.ke',
        'password': 'Password123!'
    })
    return client


def test_create_and_list_projects(auth_client):
    """Create a project and verify it appears with correct defaults."""
    resp = auth_client.post('/api/projects', json={
        'title': 'Personal Portfolio Website',
        'project_type': 'Portfolio',
        'linked_skill_track': 'Web Development',
        'priority': 5,
        'description': 'Full-stack portfolio using React and Flask.'
    })
    assert resp.status_code == 201
    p = resp.get_json()['project']
    assert p['title'] == 'Personal Portfolio Website'
    assert p['completion_percentage'] == 0
    assert p['total_milestones'] == 0

    list_resp = auth_client.get('/api/projects')
    assert list_resp.status_code == 200
    data = list_resp.get_json()
    assert any(proj['id'] == p['id'] for proj in data['projects'])
    assert data['stats']['total'] >= 1


def test_milestone_and_task_lifecycle(auth_client):
    """Add milestone -> add tasks -> toggle completion -> verify percentage updates."""
    proj_resp = auth_client.post('/api/projects', json={
        'title': 'Python CLI Tool',
        'project_type': 'Skill-Building',
        'linked_skill_track': 'Python',
    })
    assert proj_resp.status_code == 201
    proj_id = proj_resp.get_json()['project']['id']

    ms_resp = auth_client.post(f'/api/projects/{proj_id}/milestones', json={
        'title': 'Core Features'
    })
    assert ms_resp.status_code == 201
    ms_id = ms_resp.get_json()['milestone']['id']

    t1 = auth_client.post(f'/api/projects/milestones/{ms_id}/tasks', json={'title': 'Implement argument parser'})
    t2 = auth_client.post(f'/api/projects/milestones/{ms_id}/tasks', json={'title': 'Add file output support'})
    assert t1.status_code == 201
    assert t2.status_code == 201
    t1_id = t1.get_json()['task']['id']
    t2_id = t2.get_json()['task']['id']

    toggle_resp = auth_client.patch(f'/api/projects/tasks/{t1_id}/toggle')
    assert toggle_resp.status_code == 200
    assert toggle_resp.get_json()['task']['is_completed'] is True
    assert toggle_resp.get_json()['project_completion'] == 50

    toggle2 = auth_client.patch(f'/api/projects/tasks/{t1_id}/toggle')
    assert toggle2.get_json()['project_completion'] == 0

    del_resp = auth_client.delete(f'/api/projects/tasks/{t2_id}')
    assert del_resp.status_code == 200


def test_analytics_weekly_summary(auth_client):
    """Weekly summary endpoint returns expected structure."""
    resp = auth_client.get('/api/analytics/weekly-summary')
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'week_start' in data
    assert 'domain_breakdown' in data
    assert 'skills_tracks' in data
    assert 'neglect_alerts' in data
    assert isinstance(data['upcoming_deadlines'], list)
    assert 'career_summary' in data

    domains = {d['domain'] for d in data['domain_breakdown']}
    assert 'Academic' in domains
    assert 'Skills' in domains

