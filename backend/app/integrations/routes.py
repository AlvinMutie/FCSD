import json
import secrets
from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, session
from ..models import (
    db,
    User,
    AcademicTerm,
    Course,
    Assignment,
    Assessment,
    Integration,
    PendingImport,
    ImportProvenance,
)

integrations_bp = Blueprint('integrations', __name__, url_prefix='/api/integrations/sodel')

def get_session_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

def get_user_from_pairing_token(token_str):
    if not token_str:
        return None
    integration = Integration.query.filter_by(pairing_token=token_str, is_active=True).first()
    if not integration:
        return None
    return db.session.get(User, integration.user_id), integration

def parse_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        if 'T' in dt_str:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return datetime.combine(date.fromisoformat(dt_str), datetime.min.time())
    except Exception:
        return None

# ==========================================
# Connection & Pairing
# ==========================================

@integrations_bp.route('/connect', methods=['POST'])
def connect():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    # Check for existing integration or generate new token
    integration = Integration.query.filter_by(user_id=user.id, provider='sodel').first()
    token = f"mlb_{secrets.token_hex(24)}"

    if not integration:
        integration = Integration(
            user_id=user.id,
            provider='sodel',
            pairing_token=token,
            is_active=True
        )
        db.session.add(integration)
    else:
        integration.pairing_token = token
        integration.is_active = True

    db.session.commit()
    return jsonify({
        'message': 'Pairing token generated successfully',
        'pairing_token': integration.pairing_token,
        'status': 'connected',
        'provider': 'sodel'
    }), 200

@integrations_bp.route('/status', methods=['GET'])
def get_status():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    integration = Integration.query.filter_by(user_id=user.id, provider='sodel').first()
    if not integration or not integration.is_active:
        return jsonify({
            'connected': False,
            'pairing_token': None,
            'last_sync_at': None,
            'pending_count': 0
        }), 200

    pending_count = PendingImport.query.filter_by(user_id=user.id, status='Pending Review').count()
    return jsonify({
        'connected': True,
        'pairing_token': integration.pairing_token,
        'last_sync_at': integration.last_sync_at.isoformat() if integration.last_sync_at else None,
        'pending_count': pending_count
    }), 200

@integrations_bp.route('/disconnect', methods=['POST'])
def disconnect():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    integration = Integration.query.filter_by(user_id=user.id, provider='sodel').first()
    if integration:
        integration.is_active = False
        integration.pairing_token = f"revoked_{secrets.token_hex(8)}"
        db.session.commit()

    return jsonify({'message': 'MyLife Bridge disconnected successfully'}), 200

# ==========================================
# Ingestion: Chrome Extension Scan Receiver
# ==========================================

@integrations_bp.route('/scan', methods=['POST'])
def receive_scan():
    # Authenticate via pairing token from header or body
    token = request.headers.get('X-Pairing-Token') or request.json.get('pairing_token')
    user_and_int = get_user_from_pairing_token(token)
    if not user_and_int:
        return jsonify({'error': 'Invalid or inactive pairing token'}), 401

    user, integration = user_and_int
    data = request.get_json() or {}

    source_url = data.get('source_url', '').strip()
    item_type = data.get('item_type', 'course').strip()  # course, assignment, assessment, announcement
    title = data.get('title', '').strip()
    course_code = data.get('course_code', '').strip().upper()
    deadline_str = data.get('deadline')
    has_explicit_time = bool(data.get('has_explicit_time', False))
    raw_payload = data.get('raw_payload', {})

    if not source_url or not title:
        return jsonify({'error': 'Source URL and Title are required'}), 400

    deadline = parse_iso_datetime(deadline_str)

    # 1. Duplicate & Difference Detection
    diff = {}
    potential_dup_id = None

    if item_type == 'assignment':
        existing = Assignment.query.join(Course).join(AcademicTerm).filter(
            AcademicTerm.user_id == user.id,
            Assignment.title.ilike(title)
        ).first()
        if existing:
            potential_dup_id = existing.id
            if existing.deadline and deadline and existing.deadline != deadline:
                diff['deadline'] = {
                    'old': existing.deadline.isoformat(),
                    'new': deadline.isoformat()
                }

    elif item_type == 'course':
        existing_course = Course.query.join(AcademicTerm).filter(
            AcademicTerm.user_id == user.id,
            Course.code == course_code
        ).first()
        if existing_course:
            potential_dup_id = existing_course.id

    # 2. Stage into Pending Imports
    pending = PendingImport(
        user_id=user.id,
        source_system='sodel',
        source_url=source_url,
        item_type=item_type,
        raw_data_json=json.dumps(raw_payload),
        normalized_title=title,
        normalized_course_code=course_code or None,
        normalized_deadline=deadline,
        has_explicit_time=has_explicit_time,
        status='Pending Review',
        potential_duplicate_id=potential_dup_id,
        changes_diff_json=json.dumps(diff) if diff else None
    )
    db.session.add(pending)

    # Update integration last sync timestamp
    integration.last_sync_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        'message': 'Extraction successfully staged into Pending Imports',
        'pending_import': pending.to_dict()
    }), 201

# ==========================================
# Pending Imports & Review Manager
# ==========================================

@integrations_bp.route('/pending', methods=['GET'])
def list_pending():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    status_filter = request.args.get('status', 'Pending Review')
    query = PendingImport.query.filter_by(user_id=user.id)
    if status_filter != 'ALL':
        query = query.filter_by(status=status_filter)

    items = query.order_by(PendingImport.created_at.desc()).all()
    return jsonify({'pending_imports': [i.to_dict() for i in items]}), 200

@integrations_bp.route('/review', methods=['POST'])
def review_import():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    import_id = data.get('import_id')
    decision = data.get('decision', '').upper()  # APPROVE, EDIT_AND_APPROVE, REJECT, ATTENTION

    pending = PendingImport.query.filter_by(id=import_id, user_id=user.id).first()
    if not pending:
        return jsonify({'error': 'Pending import record not found'}), 404

    if decision == 'REJECT':
        pending.status = 'Rejected'
        pending.reviewed_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'message': 'Import rejected', 'pending_import': pending.to_dict()}), 200

    if decision == 'ATTENTION':
        pending.status = 'Needs Attention'
        pending.reviewed_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'message': 'Marked as needing attention', 'pending_import': pending.to_dict()}), 200

    if decision in ['APPROVE', 'EDIT_AND_APPROVE']:
        # Apply any edited fields if user edited before approval
        final_title = data.get('title', pending.normalized_title).strip()
        final_code = data.get('course_code', pending.normalized_course_code or '').strip().upper()
        final_deadline_str = data.get('deadline')
        final_deadline = parse_iso_datetime(final_deadline_str) if final_deadline_str else pending.normalized_deadline

        # Determine target academic term
        current_term = AcademicTerm.query.filter_by(user_id=user.id, is_current=True).first()
        if not current_term:
            current_term = AcademicTerm.query.filter_by(user_id=user.id).first()
        if not current_term:
            current_term = AcademicTerm(
                user_id=user.id,
                name="Current Semester",
                start_date=date.today(),
                end_date=date.today() + datetime.timedelta(days=120),
                is_current=True
            )
            db.session.add(current_term)
            db.session.flush()

        # Find or create corresponding course
        course = None
        if final_code:
            course = Course.query.filter_by(term_id=current_term.id, code=final_code).first()

        target_table = ''
        target_id = 0
        action = 'CREATED'

        if pending.item_type == 'course':
            target_table = 'courses'
            if course:
                course.title = final_title
                action = 'UPDATED'
            else:
                course = Course(
                    term_id=current_term.id,
                    code=final_code or 'SODEL UNIT',
                    title=final_title,
                    difficulty_level=3,
                    academic_importance=4,
                    min_weekly_hours=4.0,
                    target_weekly_hours=6.0
                )
                db.session.add(course)
                db.session.flush()
            target_id = course.id

        elif pending.item_type == 'assignment':
            target_table = 'assignments'
            if not course:
                course = Course.query.filter_by(term_id=current_term.id).first()
                if not course:
                    course = Course(
                        term_id=current_term.id,
                        code=final_code or "ICS 2000",
                        title="SODeL Course",
                        min_weekly_hours=4.0,
                        target_weekly_hours=6.0
                    )
                    db.session.add(course)
                    db.session.flush()

            if pending.potential_duplicate_id:
                assignment = db.session.get(Assignment, pending.potential_duplicate_id)
                if assignment:
                    assignment.title = final_title
                    assignment.deadline = final_deadline
                    action = 'UPDATED'
                    target_id = assignment.id
            else:
                assignment = Assignment(
                    course_id=course.id,
                    title=final_title,
                    assignment_type='Assignment',
                    deadline=final_deadline,
                    has_explicit_time=pending.has_explicit_time,
                    source_system='sodel',
                    source_url=pending.source_url,
                    status='Not Started'
                )
                db.session.add(assignment)
                db.session.flush()
                target_id = assignment.id

        elif pending.item_type == 'assessment':
            target_table = 'assessments'
            if not course:
                course = Course.query.filter_by(term_id=current_term.id).first()

            assessment = Assessment(
                course_id=course.id if course else 1,
                title=final_title,
                assessment_type='CAT',
                assessment_date=final_deadline or datetime.now(timezone.utc),
                has_explicit_time=pending.has_explicit_time
            )
            db.session.add(assessment)
            db.session.flush()
            target_id = assessment.id

        # Update pending import status and write audit provenance
        pending.status = 'Approved'
        pending.reviewed_at = datetime.now(timezone.utc)

        provenance = ImportProvenance(
            pending_import_id=pending.id,
            target_table=target_table,
            target_record_id=target_id,
            action_taken=action,
            approved_by_user_id=user.id
        )
        db.session.add(provenance)
        db.session.commit()

        return jsonify({
            'message': f"Import successfully approved and applied to {target_table}",
            'pending_import': pending.to_dict(),
            'provenance': provenance.to_dict()
        }), 200

    return jsonify({'error': 'Invalid decision'}), 400

@integrations_bp.route('/history', methods=['GET'])
def get_history():
    user = get_session_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    provenance_records = (
        ImportProvenance.query.join(PendingImport)
        .filter(PendingImport.user_id == user.id)
        .order_by(ImportProvenance.timestamp.desc())
        .limit(25)
        .all()
    )
    return jsonify({
        'history': [
            {
                'id': p.id,
                'target_table': p.target_table,
                'target_record_id': p.target_record_id,
                'action_taken': p.action_taken,
                'timestamp': p.timestamp.isoformat() if p.timestamp else None,
                'item_title': p.pending_import.normalized_title,
                'source_url': p.pending_import.source_url,
                'item_type': p.pending_import.item_type
            }
            for p in provenance_records
        ]
    }), 200

