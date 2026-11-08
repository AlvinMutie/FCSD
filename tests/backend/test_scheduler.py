import pytest
from datetime import date, datetime, timedelta, time
from backend.app import create_app
from backend.app.models import (
    db,
    User,
    CalendarEvent,
    ScheduleVersion,
    AvailabilityRule,
    Assignment,
)
from backend.app.scheduler.engine import SchedulingEngine

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key-scheduler'

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

def test_generate_schedule_no_overlap(client):
    login_student(client)
    user = User.query.filter_by(email='student@jkuat.ac.ke').first()

    today = date.today()
    engine = SchedulingEngine(user)
    version, events, overload = engine.generate_weekly_schedule(start_date=today, auto_approve=True)

    assert len(events) > 0
    assert version.id is not None
    assert 'is_overloaded' in overload

    # Check rule 1: Zero overlapping events
    sorted_events = sorted(events, key=lambda e: e.start_time)
    for i in range(len(sorted_events) - 1):
        curr_ev = sorted_events[i]
        next_ev = sorted_events[i + 1]
        assert curr_ev.end_time <= next_ev.start_time, (
            f"Overlap detected: {curr_ev.title} ends at {curr_ev.end_time} "
            f"but {next_ev.title} starts at {next_ev.start_time}"
        )

def test_locked_event_preserved_during_reschedule(client):
    login_student(client)
    user = User.query.filter_by(email='student@jkuat.ac.ke').first()

    today = date.today()
    # Create locked doctor appointment or fixed lecture today 10:00 - 11:30
    locked_event = CalendarEvent(
        user_id=user.id,
        title="Doctor Appointment / Fixed Class",
        category="personal",
        start_time=datetime.combine(today, time(10, 0)),
        end_time=datetime.combine(today, time(11, 30)),
        is_locked=True
    )
    # Create flexible study event today 10:30 - 12:00 (overlaps locked)
    flexible_event = CalendarEvent(
        user_id=user.id,
        title="Flexible Python Practice",
        category="skill",
        start_time=datetime.combine(today, time(10, 30)),
        end_time=datetime.combine(today, time(12, 0)),
        is_locked=False
    )
    db.session.add_all([locked_event, flexible_event])
    db.session.commit()

    engine = SchedulingEngine(user)
    reschedule_result = engine.reschedule_my_day(target_date=today)

    assert reschedule_result['locked_preserved_count'] >= 1

    # Reload events
    reloaded_locked = db.session.get(CalendarEvent, locked_event.id)
    reloaded_flex = db.session.get(CalendarEvent, flexible_event.id)

    # Locked event was NOT moved or deleted
    assert reloaded_locked.start_time == datetime.combine(today, time(10, 0))
    assert reloaded_locked.end_time == datetime.combine(today, time(11, 30))

    # Flexible event was moved and does not overlap locked event
    assert (
        reloaded_flex.end_time <= reloaded_locked.start_time or
        reloaded_flex.start_time >= reloaded_locked.end_time
    )

def test_scheduler_api_routes(client):
    login_student(client)

    # Add custom availability rule: Monday 08:00 - 12:00
    avail_res = client.post('/api/scheduler/availability', json={
        'day_of_week': 1,
        'start_time': '08:00',
        'end_time': '12:00'
    })
    assert avail_res.status_code == 201

    # Call /generate endpoint
    gen_res = client.post('/api/scheduler/generate', json={
        'start_date': date.today().isoformat(),
        'auto_approve': True
    })
    assert gen_res.status_code == 201
    gen_data = gen_res.get_json()
    assert len(gen_data['events']) > 0

    # Call /reschedule-today endpoint
    resched_res = client.post('/api/scheduler/reschedule-today', json={})
    assert resched_res.status_code == 200
    assert 'rescheduled_count' in resched_res.get_json()
