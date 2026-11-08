from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, request, jsonify, session
from ..models import (
    db,
    User,
    AvailabilityRule,
    CalendarEvent,
    ScheduleVersion,
)
from .engine import SchedulingEngine

scheduler_bp = Blueprint('scheduler', __name__, url_prefix='/api/scheduler')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

def parse_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    except Exception:
        return None

def parse_iso_date(d_str):
    if not d_str:
        return None
    try:
        return date.fromisoformat(d_str)
    except Exception:
        return None

# ==========================================
# Availability Rules
# ==========================================

@scheduler_bp.route('/availability', methods=['GET'])
def get_availability():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    rules = AvailabilityRule.query.filter_by(user_id=user.id).order_by(AvailabilityRule.day_of_week.asc()).all()
    return jsonify({'rules': [r.to_dict() for r in rules]}), 200

@scheduler_bp.route('/availability', methods=['POST'])
def add_availability():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    dow = int(data.get('day_of_week', 1))
    start_time = data.get('start_time', '09:00').strip()
    end_time = data.get('end_time', '13:00').strip()

    rule = AvailabilityRule(
        user_id=user.id,
        day_of_week=dow,
        start_time=start_time,
        end_time=end_time,
        is_active=bool(data.get('is_active', True))
    )
    db.session.add(rule)
    db.session.commit()
    return jsonify({'message': 'Availability rule added', 'rule': rule.to_dict()}), 201

@scheduler_bp.route('/availability/<int:rule_id>', methods=['DELETE'])
def delete_availability(rule_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    rule = AvailabilityRule.query.filter_by(id=rule_id, user_id=user.id).first()
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404

    db.session.delete(rule)
    db.session.commit()
    return jsonify({'message': 'Availability rule deleted'}), 200

# ==========================================
# Weekly Timetable Generation
# ==========================================

@scheduler_bp.route('/generate', methods=['POST'])
def generate_schedule():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    start_date_str = data.get('start_date')
    auto_approve = bool(data.get('auto_approve', True))

    target_start = parse_iso_date(start_date_str) if start_date_str else date.today()

    engine = SchedulingEngine(user)
    version, events, overload_report = engine.generate_weekly_schedule(
        start_date=target_start,
        auto_approve=auto_approve
    )

    return jsonify({
        'message': 'Weekly schedule successfully generated',
        'schedule_version': version.to_dict(),
        'events': [e.to_dict() for e in events],
        'overload_report': overload_report
    }), 201

# ==========================================
# "Reschedule My Day"
# ==========================================

@scheduler_bp.route('/reschedule-today', methods=['POST'])
def reschedule_today():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    target_date_str = data.get('target_date')
    target_date = parse_iso_date(target_date_str) if target_date_str else date.today()

    engine = SchedulingEngine(user)
    result = engine.reschedule_my_day(target_date=target_date)

    return jsonify(result), 200

# ==========================================
# Calendar Events (CRUD & Interactions)
# ==========================================

@scheduler_bp.route('/events', methods=['GET'])
def get_events():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    start_str = request.args.get('start')
    end_str = request.args.get('end')

    query = CalendarEvent.query.filter_by(user_id=user.id)
    if start_str:
        start_dt = parse_iso_datetime(start_str)
        if start_dt:
            query = query.filter(CalendarEvent.start_time >= start_dt)
    if end_str:
        end_dt = parse_iso_datetime(end_str)
        if end_dt:
            query = query.filter(CalendarEvent.end_time <= end_dt)

    events = query.order_by(CalendarEvent.start_time.asc()).all()
    return jsonify({'events': [e.to_dict() for e in events]}), 200

@scheduler_bp.route('/events', methods=['POST'])
def create_event():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    start_time = parse_iso_datetime(data.get('start_time'))
    end_time = parse_iso_datetime(data.get('end_time'))

    if not title or not start_time or not end_time:
        return jsonify({'error': 'Title, start time, and end time are required'}), 400

    event = CalendarEvent(
        user_id=user.id,
        title=title,
        category=data.get('category', 'academic'),
        start_time=start_time,
        end_time=end_time,
        is_locked=bool(data.get('is_locked', False)),
        explanation=data.get('explanation', 'Manually created event'),
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({'message': 'Event created', 'event': event.to_dict()}), 201

@scheduler_bp.route('/events/<int:event_id>', methods=['PATCH'])
def update_event(event_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    event = CalendarEvent.query.filter_by(id=event_id, user_id=user.id).first()
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json() or {}
    if 'is_locked' in data:
        event.is_locked = bool(data['is_locked'])
    if 'is_completed' in data:
        event.is_completed = bool(data['is_completed'])
    if 'is_skipped' in data:
        event.is_skipped = bool(data['is_skipped'])
    if 'start_time' in data:
        event.start_time = parse_iso_datetime(data['start_time']) or event.start_time
    if 'end_time' in data:
        event.end_time = parse_iso_datetime(data['end_time']) or event.end_time
    if 'notes' in data:
        event.notes = data['notes']

    db.session.commit()
    return jsonify({'message': 'Event updated', 'event': event.to_dict()}), 200

@scheduler_bp.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    event = CalendarEvent.query.filter_by(id=event_id, user_id=user.id).first()
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200
