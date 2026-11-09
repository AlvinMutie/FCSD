from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, session
from ..models import (
    db,
    User,
    Skill,
    LearningStage,
    LearningTask,
    LearningSession,
    LearningEvidence,
)

skills_bp = Blueprint('skills', __name__, url_prefix='/api/skills')

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)

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
# 4 Technical Tracks
# ==========================================

@skills_bp.route('/tracks', methods=['GET'])
def list_tracks():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    tracks = Skill.query.filter_by(user_id=user.id).order_by(Skill.id.asc()).all()
    total_weekly_target = sum(t.weekly_target_hours for t in tracks)
    total_weekly_logged = sum(t.weekly_hours_logged for t in tracks)

    return jsonify({
        'tracks': [t.to_dict() for t in tracks],
        'total_weekly_target': total_weekly_target,
        'total_weekly_logged': total_weekly_logged,
        'completion_percentage': round((total_weekly_logged / max(1.0, total_weekly_target)) * 100, 1)
    }), 200

@skills_bp.route('/tracks', methods=['POST'])
def create_track():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    track_name = data.get('track_name', '').strip()
    if not track_name:
        return jsonify({'error': 'Skill name is required'}), 400

    current_level = data.get('current_level', 'Beginner')
    weekly_target = float(data.get('weekly_target_hours', 3.0))
    color_hex = data.get('color_hex', '#10b981')
    initial_goal = data.get('initial_goal', '').strip()

    skill = Skill(
        user_id=user.id,
        track_name=track_name,
        current_level=current_level,
        weekly_target_hours=weekly_target,
        color_hex=color_hex
    )
    db.session.add(skill)
    db.session.flush()

    # Create an initial stage for this skill
    stage_title = initial_goal or f'{track_name} Fundamentals & Practice'
    stage = LearningStage(
        skill_id=skill.id,
        title=stage_title,
        order_index=1,
        status='In Progress'
    )
    db.session.add(stage)
    db.session.flush()

    # Initial starter task
    starter_task = LearningTask(
        stage_id=stage.id,
        title=f'Setup environment & core concepts for {track_name}',
        description=f'Hands-on kickoff session for {track_name}',
        estimated_hours=1.0,
        is_completed=False
    )
    db.session.add(starter_task)
    db.session.commit()

    return jsonify({'message': 'Skill created successfully', 'track': skill.to_dict()}), 201

@skills_bp.route('/tracks/<int:skill_id>', methods=['PUT'])
def update_track(skill_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Track not found'}), 404

    data = request.get_json() or {}
    if 'track_name' in data and data['track_name'].strip():
        skill.track_name = data['track_name'].strip()
    if 'current_level' in data:
        skill.current_level = data['current_level']
    if 'weekly_target_hours' in data:
        skill.weekly_target_hours = float(data['weekly_target_hours'])
    if 'color_hex' in data:
        skill.color_hex = data['color_hex']

    db.session.commit()
    return jsonify({'message': 'Track updated', 'track': skill.to_dict()}), 200

@skills_bp.route('/tracks/<int:skill_id>', methods=['DELETE'])
def delete_track(skill_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Track not found'}), 404

    db.session.delete(skill)
    db.session.commit()
    return jsonify({'message': 'Skill removed successfully'}), 200

# ==========================================
# Learning Roadmaps (Stages & Tasks)
# ==========================================

@skills_bp.route('/tracks/<int:skill_id>/roadmap', methods=['GET'])
def get_roadmap(skill_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Track not found'}), 404

    stages = LearningStage.query.filter_by(skill_id=skill.id).order_by(LearningStage.order_index.asc()).all()
    return jsonify({
        'track': skill.to_dict(),
        'stages': [s.to_dict() for s in stages]
    }), 200

@skills_bp.route('/tracks/<int:skill_id>/stages', methods=['POST'])
def add_stage(skill_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Track not found'}), 404

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Stage title is required'}), 400

    order_idx = LearningStage.query.filter_by(skill_id=skill.id).count() + 1
    stage = LearningStage(
        skill_id=skill.id,
        title=title,
        order_index=order_idx,
        status='In Progress'
    )
    db.session.add(stage)
    db.session.commit()
    return jsonify({'message': 'Stage created', 'stage': stage.to_dict()}), 201

@skills_bp.route('/stages/<int:stage_id>/tasks', methods=['POST'])
def add_task(stage_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    stage = LearningStage.query.join(Skill).filter(LearningStage.id == stage_id, Skill.user_id == user.id).first()
    if not stage:
        return jsonify({'error': 'Stage not found'}), 404

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Task title is required'}), 400

    task = LearningTask(
        stage_id=stage.id,
        title=title,
        description=data.get('description', '').strip() or None,
        estimated_hours=float(data.get('estimated_hours', 2.0))
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Learning task added', 'task': task.to_dict()}), 201

@skills_bp.route('/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    task = LearningTask.query.join(LearningStage).join(Skill).filter(
        LearningTask.id == task_id, Skill.user_id == user.id
    ).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    task.is_completed = not task.is_completed
    task.completed_at = datetime.now(timezone.utc) if task.is_completed else None
    db.session.commit()
    return jsonify({'message': 'Task toggled', 'task': task.to_dict()}), 200

# ==========================================
# Learning Sessions & Reflections
# ==========================================

@skills_bp.route('/sessions', methods=['GET'])
def list_sessions():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill_id = request.args.get('skill_id', type=int)
    query = LearningSession.query.join(Skill).filter(Skill.user_id == user.id)
    if skill_id:
        query = query.filter(LearningSession.skill_id == skill_id)

    sessions = query.order_by(LearningSession.session_date.desc()).limit(20).all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200

@skills_bp.route('/sessions', methods=['POST'])
def record_session():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    skill_id = data.get('skill_id')
    topic_studied = data.get('topic_studied', '').strip()
    duration_mins = int(data.get('duration_mins', 60))

    if not skill_id or not topic_studied:
        return jsonify({'error': 'Skill ID and Topic Studied are required'}), 400

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Skill not found'}), 404

    session_obj = LearningSession(
        skill_id=skill.id,
        task_id=data.get('task_id'),
        duration_mins=duration_mins,
        topic_studied=topic_studied,
        key_learnings=data.get('key_learnings', '').strip() or None,
        difficulties_faced=data.get('difficulties_faced', '').strip() or None,
        next_steps=data.get('next_steps', '').strip() or None
    )
    db.session.add(session_obj)
    db.session.commit()
    return jsonify({'message': 'Learning session recorded', 'session': session_obj.to_dict()}), 201

# ==========================================
# Practical Evidence (GitHub, Projects, Demos)
# ==========================================

@skills_bp.route('/evidence', methods=['GET'])
def list_evidence():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    skill_id = request.args.get('skill_id', type=int)
    query = LearningEvidence.query.join(Skill).filter(Skill.user_id == user.id)
    if skill_id:
        query = query.filter(LearningEvidence.skill_id == skill_id)

    evidence_items = query.order_by(LearningEvidence.date_achieved.desc()).all()
    return jsonify({'evidence': [e.to_dict() for e in evidence_items]}), 200

@skills_bp.route('/evidence', methods=['POST'])
def add_evidence():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    skill_id = data.get('skill_id')
    title = data.get('title', '').strip()
    url_or_path = data.get('url_or_path', '').strip()

    if not skill_id or not title or not url_or_path:
        return jsonify({'error': 'Skill ID, Title, and URL/Path are required'}), 400

    skill = Skill.query.filter_by(id=skill_id, user_id=user.id).first()
    if not skill:
        return jsonify({'error': 'Skill not found'}), 404

    evidence = LearningEvidence(
        skill_id=skill.id,
        title=title,
        evidence_type=data.get('evidence_type', 'GitHub'),
        url_or_path=url_or_path,
        description=data.get('description', '').strip() or None
    )
    db.session.add(evidence)
    db.session.commit()
    return jsonify({'message': 'Practical evidence added', 'evidence': evidence.to_dict()}), 201

@skills_bp.route('/evidence/<int:evidence_id>', methods=['DELETE'])
def delete_evidence(evidence_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    evidence = LearningEvidence.query.join(Skill).filter(
        LearningEvidence.id == evidence_id, Skill.user_id == user.id
    ).first()
    if not evidence:
        return jsonify({'error': 'Evidence not found'}), 404

    db.session.delete(evidence)
    db.session.commit()
    return jsonify({'message': 'Evidence deleted'}), 200

