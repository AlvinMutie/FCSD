"""
Phase 7 — Career & Job Management backend tests.
"""
import pytest
from backend.app import create_app
from backend.app.models import db as _db


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = False
    SECRET_KEY = 'test-secret-key'

@pytest.fixture(scope='module')
def app():
    application = create_app(TestConfig)
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
    """Registered and logged-in test client."""
    client.post('/api/auth/register', json={
        'email': 'career_test@jkuat.ac.ke',
        'password': 'Password123!',
        'display_name': 'Career Tester'
    })
    client.post('/api/auth/login', json={
        'email': 'career_test@jkuat.ac.ke',
        'password': 'Password123!'
    })
    return client


def test_create_and_list_opportunities(auth_client):
    """Create a job opportunity and verify it appears in the pipeline list."""
    resp = auth_client.post('/api/career/opportunities', json={
        'title': 'Junior Python Developer',
        'company': 'TechCorp Kenya',
        'location': 'Nairobi',
        'job_type': 'Entry-level',
        'requirements': 'Python, Flask, SQL, REST APIs',
        'priority': 4,
        'pipeline_stage': 'Saved'
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['opportunity']['title'] == 'Junior Python Developer'
    assert data['opportunity']['pipeline_stage'] == 'Saved'
    opp_id = data['opportunity']['id']

    list_resp = auth_client.get('/api/career/opportunities')
    assert list_resp.status_code == 200
    list_data = list_resp.get_json()
    assert any(o['id'] == opp_id for o in list_data['opportunities'])
    assert 'stage_counts' in list_data
    assert list_data['stage_counts']['Saved'] >= 1


def test_pipeline_stage_advance_and_application_creation(auth_client):
    """Advancing to 'Applied' stage must auto-create an Application record."""
    resp = auth_client.post('/api/career/opportunities', json={
        'title': 'IT Support Intern',
        'company': 'SafariTech Ltd',
        'requirements': 'Networking, Windows, Linux',
        'priority': 3,
        'pipeline_stage': 'Saved'
    })
    assert resp.status_code == 201
    opp_id = resp.get_json()['opportunity']['id']
    assert not resp.get_json()['opportunity']['has_application']

    patch_resp = auth_client.patch(f'/api/career/opportunities/{opp_id}/stage', json={
        'pipeline_stage': 'Applied'
    })
    assert patch_resp.status_code == 200
    updated = patch_resp.get_json()['opportunity']
    assert updated['pipeline_stage'] == 'Applied'
    assert updated['has_application'] is True


def test_cv_document_crud(auth_client):
    """Add and list CV documents, then delete one."""
    add_resp = auth_client.post('/api/career/cv-documents', json={
        'title': 'Junior Developer CV v3',
        'category': 'Junior Developer',
        'notes': 'Tailored for Flask/React roles.'
    })
    assert add_resp.status_code == 201
    cv = add_resp.get_json()['cv_document']
    cv_id = cv['id']
    assert cv['category'] == 'Junior Developer'

    list_resp = auth_client.get('/api/career/cv-documents')
    assert list_resp.status_code == 200
    assert any(c['id'] == cv_id for c in list_resp.get_json()['cv_documents'])

    del_resp = auth_client.delete(f'/api/career/cv-documents/{cv_id}')
    assert del_resp.status_code == 200

    after = auth_client.get('/api/career/cv-documents').get_json()
    assert not any(c['id'] == cv_id for c in after['cv_documents'])


def test_skills_gap_analysis(auth_client):
    """Skills gap analysis against a Python/Flask opportunity should return a readiness indicator."""
    opp_resp = auth_client.post('/api/career/opportunities', json={
        'title': 'Backend Python Engineer',
        'company': 'CloudBanking Africa',
        'requirements': 'Python, Flask, REST API, SQL, backend',
        'priority': 5
    })
    assert opp_resp.status_code == 201
    opp_id = opp_resp.get_json()['opportunity']['id']

    gap_resp = auth_client.get(f'/api/career/skills-gap/{opp_id}')
    assert gap_resp.status_code == 200
    gap = gap_resp.get_json()
    assert 'readiness_indicator' in gap
    assert gap['readiness_indicator'] in ('High Match', 'Moderate Match', 'Prerequisites Needed')
    assert isinstance(gap['matched_skills'], list)
    assert isinstance(gap['gap_skills'], list)

