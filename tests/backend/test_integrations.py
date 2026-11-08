import pytest
from datetime import datetime, timedelta
from backend.app import create_app
from backend.app.models import db, User, PendingImport, Assignment, ImportProvenance

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-integrations'

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

def test_pairing_token_lifecycle(client):
    login_student(client)

    # Initial status - not connected
    status_res = client.get('/api/integrations/sodel/status')
    assert status_res.status_code == 200
    assert status_res.get_json()['connected'] is False

    # Connect - generate pairing token
    connect_res = client.post('/api/integrations/sodel/connect')
    assert connect_res.status_code == 200
    token = connect_res.get_json()['pairing_token']
    assert token.startswith('mlb_')

    # Verify status reflects connected
    status_res2 = client.get('/api/integrations/sodel/status')
    assert status_res2.get_json()['connected'] is True
    assert status_res2.get_json()['pairing_token'] == token

def test_scan_intake_and_approval_workflow(client):
    login_student(client)

    # 1. Connect and get token
    connect_res = client.post('/api/integrations/sodel/connect')
    token = connect_res.get_json()['pairing_token']

    # 2. Simulate MyLife Bridge sending extracted assignment
    scan_res = client.post('/api/integrations/sodel/scan', json={
        'pairing_token': token,
        'source_url': 'https://sodel3v2.jkuat.ac.ke/mod/assign/view.php?id=102938',
        'item_type': 'assignment',
        'title': 'Database Lab 3: Normalization & Query Tuning',
        'course_code': 'ICS 2203',
        'deadline': (datetime.now() + timedelta(days=7)).isoformat(),
        'has_explicit_time': True,
        'raw_payload': {'due_date_text': 'Sunday, 15 Nov, 23:59', 'section': 'Week 6'}
    })
    assert scan_res.status_code == 201
    pending_item = scan_res.get_json()['pending_import']
    assert pending_item['status'] == 'Pending Review'
    import_id = pending_item['id']

    # Check pending list
    pending_list = client.get('/api/integrations/sodel/pending').get_json()['pending_imports']
    assert len(pending_list) == 1

    # Verify that before approval, no assignment exists in official academic table with this title
    assign_check = Assignment.query.filter_by(title='Database Lab 3: Normalization & Query Tuning').first()
    assert assign_check is None

    # 3. Approve import
    review_res = client.post('/api/integrations/sodel/review', json={
        'import_id': import_id,
        'decision': 'APPROVE'
    })
    assert review_res.status_code == 200

    # 4. Verify assignment now exists in official academic table with provenance!
    approved_assign = Assignment.query.filter_by(title='Database Lab 3: Normalization & Query Tuning').first()
    assert approved_assign is not None
    assert approved_assign.source_system == 'sodel'

    # Check provenance record
    provenance = ImportProvenance.query.filter_by(pending_import_id=import_id).first()
    assert provenance is not None
    assert provenance.target_table == 'assignments'
    assert provenance.target_record_id == approved_assign.id

