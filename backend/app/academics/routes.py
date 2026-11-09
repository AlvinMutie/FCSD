from datetime import datetime, date, timezone, timedelta
from flask import Blueprint, request, jsonify, session
from ..models import (
    db,
    User,
    AcademicTerm,
    Course,
    CourseTopic,
    TopicRevision,
    Assignment,
    AssignmentSubtask,
    Assessment,
    AcademicResource,
)

academics_bp = Blueprint('academics', __name__, url_prefix='/api/academics')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

def parse_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        # Handles 'YYYY-MM-DDTHH:MM:SS' or 'YYYY-MM-DD'
        if 'T' in dt_str:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return datetime.combine(date.fromisoformat(dt_str), datetime.min.time())
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
# Academic Terms
# ==========================================

@academics_bp.route('/terms', methods=['GET'])
def list_terms():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    terms = AcademicTerm.query.filter_by(user_id=user.id).order_by(AcademicTerm.start_date.desc()).all()
    return jsonify({'terms': [t.to_dict() for t in terms]}), 200

@academics_bp.route('/current-term', methods=['GET'])
def get_current_term():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    term = AcademicTerm.query.filter_by(user_id=user.id, is_current=True).first()
    if not term:
        term = AcademicTerm.query.filter_by(user_id=user.id).order_by(AcademicTerm.start_date.desc()).first()

    if not term:
        # Default placeholder if none exists
        today = date.today()
        term = AcademicTerm(
            user_id=user.id,
            name="Current Semester",
            start_date=date(today.year, 9, 1),
            end_date=date(today.year, 12, 31),
            effective_start_date=today,
            is_current=True
        )
        db.session.add(term)
        db.session.commit()

    study_start = term.effective_start_date or term.start_date
    total_weeks = max(1, ((term.end_date - term.start_date).days // 7) + 1)
    study_weeks = max(1, ((term.end_date - study_start).days // 7) + 1)

    data = term.to_dict()
    data.update({
        'total_weeks': total_weeks,
        'study_weeks': study_weeks,
        'today': date.today().isoformat()
    })
    return jsonify({'term': data}), 200

@academics_bp.route('/current-term', methods=['POST', 'PUT'])
def configure_current_term():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    name = data.get('name', '').strip() or 'Year 2 Semester 2'
    start_date = parse_iso_date(data.get('start_date'))
    end_date = parse_iso_date(data.get('end_date'))
    effective_start = parse_iso_date(data.get('effective_start_date')) or start_date

    if not start_date or not end_date:
        return jsonify({'error': 'Official start date and end date are required.'}), 400

    term = AcademicTerm.query.filter_by(user_id=user.id, is_current=True).first()
    if not term:
        term = AcademicTerm.query.filter_by(user_id=user.id).first()

    if not term:
        term = AcademicTerm(user_id=user.id, name=name, start_date=start_date, end_date=end_date, effective_start_date=effective_start, is_current=True)
        db.session.add(term)
    else:
        term.name = name
        term.start_date = start_date
        term.end_date = end_date
        term.effective_start_date = effective_start
        term.is_current = True

    # Ensure other terms are not marked current
    AcademicTerm.query.filter(AcademicTerm.user_id == user.id, AcademicTerm.id != term.id).update({'is_current': False})
    db.session.commit()

    study_start = term.effective_start_date or term.start_date
    total_weeks = max(1, ((term.end_date - term.start_date).days // 7) + 1)
    study_weeks = max(1, ((term.end_date - study_start).days // 7) + 1)

    res = term.to_dict()
    res.update({
        'total_weeks': total_weeks,
        'study_weeks': study_weeks,
        'today': date.today().isoformat()
    })
    return jsonify({'message': 'Semester configuration saved successfully', 'term': res}), 200

@academics_bp.route('/terms', methods=['POST'])
def create_term():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    start_date = parse_iso_date(data.get('start_date'))
    end_date = parse_iso_date(data.get('end_date'))
    effective_start = parse_iso_date(data.get('effective_start_date')) or start_date
    is_current = bool(data.get('is_current', True))

    if not name or not start_date or not end_date:
        return jsonify({'error': 'Name, start date, and end date are required.'}), 400

    if is_current:
        AcademicTerm.query.filter_by(user_id=user.id, is_current=True).update({'is_current': False})

    term = AcademicTerm(
        user_id=user.id,
        name=name,
        start_date=start_date,
        end_date=end_date,
        effective_start_date=effective_start,
        is_current=is_current
    )
    db.session.add(term)
    db.session.commit()
    return jsonify({'message': 'Term created', 'term': term.to_dict()}), 201

@academics_bp.route('/terms/<int:term_id>', methods=['PUT'])
def update_term(term_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    term = AcademicTerm.query.filter_by(id=term_id, user_id=user.id).first()
    if not term:
        return jsonify({'error': 'Term not found'}), 404

    data = request.get_json() or {}
    if 'name' in data:
        term.name = data['name'].strip() or term.name
    if 'start_date' in data:
        term.start_date = parse_iso_date(data['start_date']) or term.start_date
    if 'end_date' in data:
        term.end_date = parse_iso_date(data['end_date']) or term.end_date
    if 'effective_start_date' in data:
        term.effective_start_date = parse_iso_date(data['effective_start_date']) or term.effective_start_date
    if 'is_current' in data:
        term.is_current = bool(data['is_current'])
        if term.is_current:
            AcademicTerm.query.filter(AcademicTerm.user_id == user.id, AcademicTerm.id != term.id).update({'is_current': False})

    db.session.commit()
    return jsonify({'message': 'Term updated', 'term': term.to_dict()}), 200

@academics_bp.route('/terms/<int:term_id>', methods=['DELETE'])
def delete_term(term_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    term = AcademicTerm.query.filter_by(id=term_id, user_id=user.id).first()
    if not term:
        return jsonify({'error': 'Term not found'}), 404

    db.session.delete(term)
    db.session.commit()
    return jsonify({'message': 'Term deleted'}), 200

# ==========================================
# Courses / Units
# ==========================================

@academics_bp.route('/courses', methods=['GET'])
def list_courses():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    term_id = request.args.get('term_id', type=int)
    query = Course.query.join(AcademicTerm).filter(AcademicTerm.user_id == user.id)
    if term_id:
        query = query.filter(Course.term_id == term_id)

    courses = query.order_by(Course.code.asc()).all()
    return jsonify({'courses': [c.to_dict() for c in courses]}), 200

@academics_bp.route('/courses', methods=['POST'])
def create_course():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    term_id = data.get('term_id')
    code = data.get('code', '').strip().upper()
    title = data.get('title', '').strip()

    if not term_id or not code or not title:
        return jsonify({'error': 'Term ID, Course Code, and Title are required.'}), 400

    term = AcademicTerm.query.filter_by(id=term_id, user_id=user.id).first()
    if not term:
        return jsonify({'error': 'Academic term not found.'}), 404

    course = Course(
        term_id=term.id,
        code=code,
        title=title,
        lecturer_name=data.get('lecturer_name', '').strip() or None,
        lecturer_email=data.get('lecturer_email', '').strip() or None,
        difficulty_level=int(data.get('difficulty_level', 3)),
        academic_importance=int(data.get('academic_importance', 4)),
        min_weekly_hours=float(data.get('min_weekly_hours', 4.0)),
        target_weekly_hours=float(data.get('target_weekly_hours', 6.0)),
        actual_weekly_hours=float(data.get('actual_weekly_hours', 0.0)),
        target_grade=data.get('target_grade', 'Distinction'),
        is_archived=bool(data.get('is_archived', False))
    )
    db.session.add(course)
    db.session.commit()
    return jsonify({'message': 'Course created', 'course': course.to_dict()}), 201

@academics_bp.route('/courses/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    if 'code' in data:
        course.code = data['code'].strip().upper() or course.code
    if 'title' in data:
        course.title = data['title'].strip() or course.title
    if 'lecturer_name' in data:
        course.lecturer_name = data['lecturer_name'].strip() or None
    if 'lecturer_email' in data:
        course.lecturer_email = data['lecturer_email'].strip() or None
    if 'difficulty_level' in data:
        course.difficulty_level = int(data['difficulty_level'])
    if 'academic_importance' in data:
        course.academic_importance = int(data['academic_importance'])
    if 'min_weekly_hours' in data:
        course.min_weekly_hours = float(data['min_weekly_hours'])
    if 'target_weekly_hours' in data:
        course.target_weekly_hours = float(data['target_weekly_hours'])
    if 'actual_weekly_hours' in data:
        course.actual_weekly_hours = float(data['actual_weekly_hours'])
    if 'target_grade' in data:
        course.target_grade = data['target_grade']
    if 'is_archived' in data:
        course.is_archived = bool(data['is_archived'])

    db.session.commit()
    return jsonify({'message': 'Course updated', 'course': course.to_dict()}), 200

@academics_bp.route('/courses/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    db.session.delete(course)
    db.session.commit()
    return jsonify({'message': 'Course deleted'}), 200

# ==========================================
# Topics & Spaced Revision
# ==========================================

@academics_bp.route('/courses/<int:course_id>/topics', methods=['GET'])
def list_topics(course_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    topics = CourseTopic.query.filter_by(course_id=course.id).order_by(CourseTopic.order_index.asc()).all()
    return jsonify({'topics': [t.to_dict() for t in topics]}), 200

@academics_bp.route('/courses/<int:course_id>/topics', methods=['POST'])
def create_topic(course_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Topic title is required'}), 400

    order_index = CourseTopic.query.filter_by(course_id=course.id).count() + 1
    topic = CourseTopic(
        course_id=course.id,
        title=title,
        order_index=order_index,
        status=data.get('status', 'Not Started'),
        confidence_score=int(data.get('confidence_score', 1)),
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(topic)
    db.session.commit()
    return jsonify({'message': 'Topic created', 'topic': topic.to_dict()}), 201

@academics_bp.route('/topics/<int:topic_id>', methods=['PUT'])
def update_topic(topic_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    topic = CourseTopic.query.join(Course).join(AcademicTerm).filter(
        CourseTopic.id == topic_id, AcademicTerm.user_id == user.id
    ).first()
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404

    data = request.get_json() or {}
    if 'title' in data:
        topic.title = data['title'].strip() or topic.title
    if 'status' in data:
        topic.status = data['status']
    if 'confidence_score' in data:
        topic.confidence_score = int(data['confidence_score'])
    if 'notes' in data:
        topic.notes = data['notes'].strip() or None

    db.session.commit()
    return jsonify({'message': 'Topic updated', 'topic': topic.to_dict()}), 200

@academics_bp.route('/topics/<int:topic_id>/revise', methods=['POST'])
def revise_topic(topic_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    topic = CourseTopic.query.join(Course).join(AcademicTerm).filter(
        CourseTopic.id == topic_id, AcademicTerm.user_id == user.id
    ).first()
    if not topic:
        return jsonify({'error': 'Topic not found'}), 404

    data = request.get_json() or {}
    duration_mins = int(data.get('duration_mins', 45))
    confidence_after = int(data.get('confidence_after', topic.confidence_score))
    notes = data.get('notes', '').strip() or None

    # Record revision
    revision = TopicRevision(
        topic_id=topic.id,
        revision_date=date.today(),
        duration_mins=duration_mins,
        confidence_after=confidence_after,
        notes=notes
    )
    db.session.add(revision)

    # Update topic state
    topic.confidence_score = confidence_after
    topic.last_revised_at = datetime.now(timezone.utc)
    if confidence_after >= 5:
        topic.status = 'Mastered'
    elif confidence_after >= 4:
        topic.status = 'Understood'
    elif confidence_after >= 3:
        topic.status = 'Practicing'
    elif confidence_after >= 2:
        topic.status = 'Learning'
    else:
        topic.status = 'Needs Revision'

    # Increment course actual weekly hours
    course = topic.course
    course.actual_weekly_hours = round(course.actual_weekly_hours + (duration_mins / 60.0), 1)

    db.session.commit()
    return jsonify({
        'message': 'Revision session recorded',
        'topic': topic.to_dict(),
        'course': course.to_dict(),
        'revision': revision.to_dict()
    }), 201

# ==========================================
# Assignments & Subtasks
# ==========================================

@academics_bp.route('/assignments', methods=['GET'])
def list_assignments():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course_id = request.args.get('course_id', type=int)
    status_filter = request.args.get('status')

    query = Assignment.query.join(Course).join(AcademicTerm).filter(AcademicTerm.user_id == user.id)
    if course_id:
        query = query.filter(Assignment.course_id == course_id)
    if status_filter:
        query = query.filter(Assignment.status == status_filter)

    assignments = query.order_by(Assignment.deadline.asc().nullslast()).all()
    return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200

@academics_bp.route('/assignments', methods=['POST'])
def create_assignment():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    course_id = data.get('course_id')
    title = data.get('title', '').strip()
    if not course_id or not title:
        return jsonify({'error': 'Course ID and Assignment Title are required.'}), 400

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    deadline = parse_iso_datetime(data.get('deadline'))
    has_explicit_time = bool(data.get('has_explicit_time', False))
    if deadline and 'T' not in data.get('deadline', ''):
        has_explicit_time = False

    assignment = Assignment(
        course_id=course.id,
        title=title,
        description=data.get('description', '').strip() or None,
        assignment_type=data.get('assignment_type', 'Assignment'),
        assigned_date=parse_iso_date(data.get('assigned_date')),
        deadline=deadline,
        has_explicit_time=has_explicit_time,
        estimated_effort_hours=float(data.get('estimated_effort_hours', 3.0)),
        actual_effort_hours=float(data.get('actual_effort_hours', 0.0)),
        priority=int(data.get('priority', 3)),
        status=data.get('status', 'Not Started'),
        max_marks=float(data['max_marks']) if data.get('max_marks') is not None else None,
        score_received=float(data['score_received']) if data.get('score_received') is not None else None,
        source_system=data.get('source_system', 'MANUAL'),
        source_url=data.get('source_url', '').strip() or None,
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(assignment)
    db.session.flush()

    # Create subtasks if provided
    subtasks_data = data.get('subtasks', [])
    for idx, st in enumerate(subtasks_data):
        st_title = st.get('title', '').strip()
        if st_title:
            subtask = AssignmentSubtask(
                assignment_id=assignment.id,
                title=st_title,
                estimated_mins=int(st.get('estimated_mins', 60)),
                order_index=idx
            )
            db.session.add(subtask)

    db.session.commit()
    return jsonify({'message': 'Assignment created', 'assignment': assignment.to_dict()}), 201

@academics_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
def update_assignment(assignment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    assignment = Assignment.query.join(Course).join(AcademicTerm).filter(
        Assignment.id == assignment_id, AcademicTerm.user_id == user.id
    ).first()
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    data = request.get_json() or {}
    if 'title' in data:
        assignment.title = data['title'].strip() or assignment.title
    if 'description' in data:
        assignment.description = data['description'].strip() or None
    if 'assignment_type' in data:
        assignment.assignment_type = data['assignment_type']
    if 'deadline' in data:
        assignment.deadline = parse_iso_datetime(data['deadline'])
        assignment.has_explicit_time = bool(data.get('has_explicit_time', False))
    if 'estimated_effort_hours' in data:
        assignment.estimated_effort_hours = float(data['estimated_effort_hours'])
    if 'actual_effort_hours' in data:
        assignment.actual_effort_hours = float(data['actual_effort_hours'])
    if 'priority' in data:
        assignment.priority = int(data['priority'])
    if 'status' in data:
        assignment.status = data['status']
    if 'max_marks' in data:
        assignment.max_marks = float(data['max_marks']) if data['max_marks'] is not None else None
    if 'score_received' in data:
        assignment.score_received = float(data['score_received']) if data['score_received'] is not None else None
    if 'notes' in data:
        assignment.notes = data['notes'].strip() or None

    db.session.commit()
    return jsonify({'message': 'Assignment updated', 'assignment': assignment.to_dict()}), 200

@academics_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    assignment = Assignment.query.join(Course).join(AcademicTerm).filter(
        Assignment.id == assignment_id, AcademicTerm.user_id == user.id
    ).first()
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment deleted'}), 200

# Subtasks
@academics_bp.route('/assignments/<int:assignment_id>/subtasks', methods=['POST'])
def add_subtask(assignment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    assignment = Assignment.query.join(Course).join(AcademicTerm).filter(
        Assignment.id == assignment_id, AcademicTerm.user_id == user.id
    ).first()
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Subtask title is required'}), 400

    order_index = AssignmentSubtask.query.filter_by(assignment_id=assignment.id).count()
    subtask = AssignmentSubtask(
        assignment_id=assignment.id,
        title=title,
        estimated_mins=int(data.get('estimated_mins', 60)),
        order_index=order_index
    )
    db.session.add(subtask)
    db.session.commit()
    return jsonify({'message': 'Subtask added', 'subtask': subtask.to_dict()}), 201

@academics_bp.route('/subtasks/<int:subtask_id>/toggle', methods=['PATCH'])
def toggle_subtask(subtask_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    subtask = AssignmentSubtask.query.join(Assignment).join(Course).join(AcademicTerm).filter(
        AssignmentSubtask.id == subtask_id, AcademicTerm.user_id == user.id
    ).first()
    if not subtask:
        return jsonify({'error': 'Subtask not found'}), 404

    subtask.is_completed = not subtask.is_completed
    subtask.completed_at = datetime.now(timezone.utc) if subtask.is_completed else None
    db.session.commit()
    return jsonify({'message': 'Subtask toggled', 'subtask': subtask.to_dict()}), 200

@academics_bp.route('/subtasks/<int:subtask_id>', methods=['DELETE'])
def delete_subtask(subtask_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    subtask = AssignmentSubtask.query.join(Assignment).join(Course).join(AcademicTerm).filter(
        AssignmentSubtask.id == subtask_id, AcademicTerm.user_id == user.id
    ).first()
    if not subtask:
        return jsonify({'error': 'Subtask not found'}), 404

    db.session.delete(subtask)
    db.session.commit()
    return jsonify({'message': 'Subtask deleted'}), 200

# ==========================================
# Assessments (CATs & Final Exams)
# ==========================================

@academics_bp.route('/assessments', methods=['GET'])
def list_assessments():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course_id = request.args.get('course_id', type=int)
    query = Assessment.query.join(Course).join(AcademicTerm).filter(AcademicTerm.user_id == user.id)
    if course_id:
        query = query.filter(Assessment.course_id == course_id)

    assessments = query.order_by(Assessment.assessment_date.asc()).all()
    return jsonify({'assessments': [a.to_dict() for a in assessments]}), 200

@academics_bp.route('/assessments', methods=['POST'])
def create_assessment():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    course_id = data.get('course_id')
    title = data.get('title', '').strip()
    assessment_date = parse_iso_datetime(data.get('assessment_date'))

    if not course_id or not title or not assessment_date:
        return jsonify({'error': 'Course ID, Assessment Title, and Date are required.'}), 400

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    has_explicit_time = bool(data.get('has_explicit_time', False))
    assessment = Assessment(
        course_id=course.id,
        title=title,
        assessment_type=data.get('assessment_type', 'CAT'),
        assessment_date=assessment_date,
        has_explicit_time=has_explicit_time,
        weight_percentage=float(data['weight_percentage']) if data.get('weight_percentage') is not None else None,
        max_marks=float(data['max_marks']) if data.get('max_marks') is not None else None,
        score_received=float(data['score_received']) if data.get('score_received') is not None else None,
        preparation_progress=int(data.get('preparation_progress', 0)),
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(assessment)
    db.session.commit()
    return jsonify({'message': 'Assessment created', 'assessment': assessment.to_dict()}), 201

@academics_bp.route('/assessments/<int:assessment_id>', methods=['PUT'])
def update_assessment(assessment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    assessment = Assessment.query.join(Course).join(AcademicTerm).filter(
        Assessment.id == assessment_id, AcademicTerm.user_id == user.id
    ).first()
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    data = request.get_json() or {}
    if 'title' in data:
        assessment.title = data['title'].strip() or assessment.title
    if 'assessment_type' in data:
        assessment.assessment_type = data['assessment_type']
    if 'assessment_date' in data:
        assessment.assessment_date = parse_iso_datetime(data['assessment_date'])
        assessment.has_explicit_time = bool(data.get('has_explicit_time', False))
    if 'weight_percentage' in data:
        assessment.weight_percentage = float(data['weight_percentage']) if data['weight_percentage'] is not None else None
    if 'max_marks' in data:
        assessment.max_marks = float(data['max_marks']) if data['max_marks'] is not None else None
    if 'score_received' in data:
        assessment.score_received = float(data['score_received']) if data['score_received'] is not None else None
    if 'preparation_progress' in data:
        assessment.preparation_progress = int(data['preparation_progress'])
    if 'notes' in data:
        assessment.notes = data['notes'].strip() or None

    db.session.commit()
    return jsonify({'message': 'Assessment updated', 'assessment': assessment.to_dict()}), 200

@academics_bp.route('/assessments/<int:assessment_id>', methods=['DELETE'])
def delete_assessment(assessment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    assessment = Assessment.query.join(Course).join(AcademicTerm).filter(
        Assessment.id == assessment_id, AcademicTerm.user_id == user.id
    ).first()
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    db.session.delete(assessment)
    db.session.commit()
    return jsonify({'message': 'Assessment deleted'}), 200

# ==========================================
# Academic Resources
# ==========================================

@academics_bp.route('/resources', methods=['GET'])
def list_resources():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    course_id = request.args.get('course_id', type=int)
    query = AcademicResource.query.join(Course).join(AcademicTerm).filter(AcademicTerm.user_id == user.id)
    if course_id:
        query = query.filter(AcademicResource.course_id == course_id)

    resources = query.order_by(AcademicResource.created_at.desc()).all()
    return jsonify({'resources': [r.to_dict() for r in resources]}), 200

@academics_bp.route('/resources', methods=['POST'])
def create_resource():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    course_id = data.get('course_id')
    title = data.get('title', '').strip()
    if not course_id or not title:
        return jsonify({'error': 'Course ID and Resource Title are required.'}), 400

    course = Course.query.join(AcademicTerm).filter(Course.id == course_id, AcademicTerm.user_id == user.id).first()
    if not course:
        return jsonify({'error': 'Course not found'}), 404

    resource = AcademicResource(
        course_id=course.id,
        topic_id=data.get('topic_id'),
        title=title,
        resource_type=data.get('resource_type', 'URL'),
        file_path=data.get('file_path', '').strip() or None,
        external_url=data.get('external_url', '').strip() or None,
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(resource)
    db.session.commit()
    return jsonify({'message': 'Resource added', 'resource': resource.to_dict()}), 201

@academics_bp.route('/resources/<int:resource_id>', methods=['DELETE'])
def delete_resource(resource_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    resource = AcademicResource.query.join(Course).join(AcademicTerm).filter(
        AcademicResource.id == resource_id, AcademicTerm.user_id == user.id
    ).first()
    if not resource:
        return jsonify({'error': 'Resource not found'}), 404

    db.session.delete(resource)
    db.session.commit()
    return jsonify({'message': 'Resource deleted'}), 200

# ==========================================
# Academic Balance Engine & Distinction Planner
# ==========================================

@academics_bp.route('/balance', methods=['GET'])
def get_academic_balance():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    current_term = AcademicTerm.query.filter_by(user_id=user.id, is_current=True).first()
    if not current_term:
        current_term = AcademicTerm.query.filter_by(user_id=user.id).order_by(AcademicTerm.start_date.desc()).first()

    if not current_term:
        return jsonify({
            'term': None,
            'courses': [],
            'attention_alerts': [],
            'distinction_readiness_score': 0,
            'spaced_revision_queue': []
        }), 200

    courses = Course.query.filter_by(term_id=current_term.id, is_archived=False).all()
    courses_data = [c.to_dict() for c in courses]

    # Calculate attention alerts
    attention_alerts = []
    total_target = sum(c.target_weekly_hours for c in courses)
    total_actual = sum(c.actual_weekly_hours for c in courses)

    for c in courses:
        if c.is_neglected:
            attention_alerts.append({
                'course_id': c.id,
                'code': c.code,
                'title': c.title,
                'severity': 'HIGH',
                'message': f"Unit {c.code} is falling behind! Actual hours ({c.actual_weekly_hours}h) are below minimum floor ({c.min_weekly_hours}h)."
            })
        elif c.attention_gap >= 2.0:
            attention_alerts.append({
                'course_id': c.id,
                'code': c.code,
                'title': c.title,
                'severity': 'MEDIUM',
                'message': f"Unit {c.code} attention gap is {c.attention_gap}h below weekly distinction target ({c.target_weekly_hours}h)."
            })

    # Spaced revision queue: topics that need revision
    now_dt = datetime.now(timezone.utc)
    spaced_queue = []
    for c in courses:
        for t in c.topics:
            needs_review = False
            reason = ""
            if t.confidence_score <= 2:
                needs_review = True
                reason = "Low confidence rating (1-2/5)"
            elif not t.last_revised_at:
                needs_review = True
                reason = "Never revised"
            else:
                days_since = (now_dt - t.last_revised_at.replace(tzinfo=timezone.utc)).days
                if days_since >= 7 and t.confidence_score < 5:
                    needs_review = True
                    reason = f"7+ days since last revision ({days_since} days)"

            if needs_review:
                spaced_queue.append({
                    'topic_id': t.id,
                    'topic_title': t.title,
                    'course_code': c.code,
                    'course_title': c.title,
                    'confidence_score': t.confidence_score,
                    'status': t.status,
                    'reason': reason,
                    'recommended_mins': 45
                })

    # Distinction readiness score (0 - 100%)
    # Computed based on: Topic Mastery (40%), Balanced Unit Coverage (40%), Assessment Preparation (20%)
    total_topics = sum(len(c.topics) for c in courses)
    mastered_topics = sum(c.mastered_topics_count for c in courses)
    topic_factor = (mastered_topics / total_topics) if total_topics > 0 else 0.5

    balance_factor = min(1.0, (total_actual / total_target)) if total_target > 0 else 0.5
    readiness_score = int((topic_factor * 50) + (balance_factor * 50))

    return jsonify({
        'term': current_term.to_dict(),
        'courses': courses_data,
        'total_target_hours': total_target,
        'total_actual_hours': total_actual,
        'attention_alerts': attention_alerts,
        'distinction_readiness_score': min(100, readiness_score),
        'spaced_revision_queue': spaced_queue[:8]
    }), 200

