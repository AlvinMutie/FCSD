"""
MyLife OS — Projects API routes (Phase 8)
"""
from datetime import date
from flask import Blueprint, request, jsonify, session
from ..models import db, User, Project, ProjectMilestone, MilestoneTask

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)


def parse_iso_date(d_str):
    if not d_str:
        return None
    try:
        return date.fromisoformat(d_str)
    except Exception:
        return None


# ==========================================
# Projects CRUD
# ==========================================

@projects_bp.route('', methods=['GET'])
def list_projects():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    status_filter = request.args.get('status')
    query = Project.query.filter_by(user_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter)

    projects = query.order_by(Project.priority.desc(), Project.created_at.desc()).all()

    stats = {
        'total': len(projects),
        'in_progress': sum(1 for p in projects if p.status == 'In Progress'),
        'completed': sum(1 for p in projects if p.status == 'Completed'),
        'planning': sum(1 for p in projects if p.status == 'Planning'),
    }

    return jsonify({'projects': [p.to_dict() for p in projects], 'stats': stats}), 200


@projects_bp.route('', methods=['POST'])
def create_project():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Project title is required'}), 400

    project = Project(
        user_id=user.id,
        title=title,
        description=data.get('description', '').strip() or None,
        status=data.get('status', 'Planning'),
        project_type=data.get('project_type', 'Portfolio'),
        linked_skill_track=data.get('linked_skill_track', '').strip() or None,
        github_url=data.get('github_url', '').strip() or None,
        live_url=data.get('live_url', '').strip() or None,
        start_date=parse_iso_date(data.get('start_date')),
        target_completion=parse_iso_date(data.get('target_completion')),
        priority=int(data.get('priority', 3)),
        tags=data.get('tags', '').strip() or None,
    )
    db.session.add(project)
    db.session.commit()
    return jsonify({'message': 'Project created', 'project': project.to_dict()}), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    project = Project.query.filter_by(id=project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    return jsonify({
        'project': project.to_dict(),
        'milestones': [m.to_dict() for m in project.milestones],
    }), 200


@projects_bp.route('/<int:project_id>', methods=['PATCH'])
def update_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    project = Project.query.filter_by(id=project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json() or {}
    for field in ['title', 'description', 'status', 'project_type',
                  'linked_skill_track', 'github_url', 'live_url', 'tags']:
        if field in data:
            val = data[field]
            setattr(project, field, val.strip() if isinstance(val, str) else val)
    for date_field in ['start_date', 'target_completion', 'actual_completion']:
        if date_field in data:
            setattr(project, date_field, parse_iso_date(data[date_field]))
    if 'priority' in data:
        project.priority = int(data['priority'])

    db.session.commit()
    return jsonify({'message': 'Project updated', 'project': project.to_dict()}), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    project = Project.query.filter_by(id=project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted'}), 200


# ==========================================
# Milestones
# ==========================================

@projects_bp.route('/<int:project_id>/milestones', methods=['POST'])
def add_milestone(project_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    project = Project.query.filter_by(id=project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Milestone title is required'}), 400

    max_order = max((m.order_index for m in project.milestones), default=0)
    milestone = ProjectMilestone(
        project_id=project.id,
        title=title,
        description=data.get('description', '').strip() or None,
        order_index=max_order + 1,
        due_date=parse_iso_date(data.get('due_date')),
    )
    db.session.add(milestone)
    db.session.commit()
    return jsonify({'message': 'Milestone added', 'milestone': milestone.to_dict()}), 201


@projects_bp.route('/milestones/<int:milestone_id>', methods=['DELETE'])
def delete_milestone(milestone_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    milestone = db.session.get(ProjectMilestone, milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404

    project = Project.query.filter_by(id=milestone.project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(milestone)
    db.session.commit()
    return jsonify({'message': 'Milestone deleted'}), 200


# ==========================================
# Tasks
# ==========================================

@projects_bp.route('/milestones/<int:milestone_id>/tasks', methods=['POST'])
def add_task(milestone_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    milestone = db.session.get(ProjectMilestone, milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404

    project = Project.query.filter_by(id=milestone.project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Task title is required'}), 400

    max_order = max((t.order_index for t in milestone.tasks), default=0)
    task = MilestoneTask(
        milestone_id=milestone.id,
        title=title,
        is_completed=False,
        order_index=max_order + 1,
        estimated_hours=data.get('estimated_hours'),
        notes=data.get('notes', '').strip() or None,
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': 'Task added', 'task': task.to_dict()}), 201


@projects_bp.route('/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    task = db.session.get(MilestoneTask, task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    milestone = db.session.get(ProjectMilestone, task.milestone_id)
    project = Project.query.filter_by(id=milestone.project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Unauthorized'}), 403

    task.is_completed = not task.is_completed
    db.session.commit()
    return jsonify({'task': task.to_dict(), 'project_completion': project.completion_percentage}), 200


@projects_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    task = db.session.get(MilestoneTask, task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    milestone = db.session.get(ProjectMilestone, task.milestone_id)
    project = Project.query.filter_by(id=milestone.project_id, user_id=user.id).first()
    if not project:
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200

