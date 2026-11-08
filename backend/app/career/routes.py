import json
from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, session
from ..models import (
    db,
    User,
    JobOpportunity,
    CVDocument,
    Application,
    InterviewPrep,
    Skill,
    LearningEvidence,
)

career_bp = Blueprint('career', __name__, url_prefix='/api/career')

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

def parse_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    except Exception:
        return None

# ==========================================
# Job Opportunities & Pipeline
# ==========================================

@career_bp.route('/opportunities', methods=['GET'])
def list_opportunities():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    stage_filter = request.args.get('stage')
    query = JobOpportunity.query.filter_by(user_id=user.id)
    if stage_filter:
        query = query.filter_by(pipeline_stage=stage_filter)

    items = query.order_by(JobOpportunity.priority.desc(), JobOpportunity.created_at.desc()).all()

    # Stage statistics
    all_opps = JobOpportunity.query.filter_by(user_id=user.id).all()
    stage_counts = {
        'Saved': sum(1 for o in all_opps if o.pipeline_stage == 'Saved'),
        'Preparing': sum(1 for o in all_opps if o.pipeline_stage == 'Preparing'),
        'Applied': sum(1 for o in all_opps if o.pipeline_stage == 'Applied'),
        'Interview': sum(1 for o in all_opps if o.pipeline_stage == 'Interview'),
        'Offer': sum(1 for o in all_opps if o.pipeline_stage == 'Offer'),
        'Rejected': sum(1 for o in all_opps if o.pipeline_stage == 'Rejected'),
    }

    return jsonify({
        'opportunities': [o.to_dict() for o in items],
        'stage_counts': stage_counts,
        'total_count': len(all_opps)
    }), 200

@career_bp.route('/opportunities', methods=['POST'])
def create_opportunity():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    company = data.get('company', '').strip()

    if not title or not company:
        return jsonify({'error': 'Job Title and Company name are required'}), 400

    opp = JobOpportunity(
        user_id=user.id,
        title=title,
        company=company,
        location=data.get('location', 'Nairobi / Remote').strip(),
        job_type=data.get('job_type', 'Internship'),
        description=data.get('description', '').strip() or None,
        requirements=data.get('requirements', '').strip() or None,
        application_url=data.get('application_url', '').strip() or None,
        closing_date=parse_iso_date(data.get('closing_date')),
        priority=int(data.get('priority', 3)),
        pipeline_stage=data.get('pipeline_stage', 'Saved'),
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(opp)
    db.session.flush()

    if opp.pipeline_stage in ['Applied', 'Interview']:
        app_record = Application(job_id=opp.id)
        db.session.add(app_record)

    db.session.commit()
    return jsonify({'message': 'Opportunity saved', 'opportunity': opp.to_dict()}), 201

@career_bp.route('/opportunities/<int:opp_id>/stage', methods=['PATCH'])
def update_stage(opp_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    opp = JobOpportunity.query.filter_by(id=opp_id, user_id=user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    data = request.get_json() or {}
    new_stage = data.get('pipeline_stage')
    if not new_stage:
        return jsonify({'error': 'pipeline_stage is required'}), 400

    opp.pipeline_stage = new_stage

    # Create associated application record if moved to Applied/Interview/Offer and none exists
    if new_stage in ['Applied', 'Interview', 'Offer'] and not opp.application:
        app_record = Application(
            job_id=opp.id,
            applied_date=date.today(),
            notes=f"Moved to {new_stage} stage"
        )
        db.session.add(app_record)

    db.session.commit()
    return jsonify({'message': f'Stage updated to {new_stage}', 'opportunity': opp.to_dict()}), 200

@career_bp.route('/opportunities/<int:opp_id>', methods=['DELETE'])
def delete_opportunity(opp_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    opp = JobOpportunity.query.filter_by(id=opp_id, user_id=user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    db.session.delete(opp)
    db.session.commit()
    return jsonify({'message': 'Opportunity deleted'}), 200

# ==========================================
# CV Document Management
# ==========================================

@career_bp.route('/cvs', methods=['GET'])
@career_bp.route('/cv-documents', methods=['GET'])
def list_cvs():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    cvs = CVDocument.query.filter_by(user_id=user.id).order_by(CVDocument.updated_at.desc()).all()
    cv_list = [c.to_dict() for c in cvs]
    return jsonify({'cvs': cv_list, 'cv_documents': cv_list}), 200

@career_bp.route('/cvs', methods=['POST'])
@career_bp.route('/cv-documents', methods=['POST'])
def add_cv():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    category = data.get('category', 'General IT')

    if not title:
        return jsonify({'error': 'CV Title is required'}), 400

    cv = CVDocument(
        user_id=user.id,
        title=title,
        category=category,
        file_path=data.get('file_path', '').strip() or None,
        notes=data.get('notes', '').strip() or None
    )
    db.session.add(cv)
    db.session.commit()
    cv_dict = cv.to_dict()
    return jsonify({'message': 'CV version recorded', 'cv': cv_dict, 'cv_document': cv_dict}), 201

@career_bp.route('/cvs/<int:cv_id>', methods=['DELETE'])
@career_bp.route('/cv-documents/<int:cv_id>', methods=['DELETE'])
def delete_cv(cv_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    cv = CVDocument.query.filter_by(id=cv_id, user_id=user.id).first()
    if not cv:
        return jsonify({'error': 'CV document not found'}), 404

    db.session.delete(cv)
    db.session.commit()
    return jsonify({'message': 'CV version deleted'}), 200

# ==========================================
# Interview Preparation
# ==========================================

@career_bp.route('/interviews', methods=['GET'])
def list_interviews():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    interviews = (
        InterviewPrep.query.join(Application).join(JobOpportunity)
        .filter(JobOpportunity.user_id == user.id)
        .order_by(InterviewPrep.scheduled_at.asc())
        .all()
    )
    return jsonify({'interviews': [i.to_dict() for i in interviews]}), 200

@career_bp.route('/interviews', methods=['POST'])
def create_interview():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    opp_id = data.get('opportunity_id')
    scheduled_at = parse_iso_datetime(data.get('scheduled_at'))

    if not opp_id or not scheduled_at:
        return jsonify({'error': 'Opportunity ID and scheduled_at are required'}), 400

    opp = JobOpportunity.query.filter_by(id=opp_id, user_id=user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    app_record = opp.application
    if not app_record:
        app_record = Application(job_id=opp.id)
        db.session.add(app_record)
        db.session.flush()

    interview = InterviewPrep(
        application_id=app_record.id,
        scheduled_at=scheduled_at,
        interview_type=data.get('interview_type', 'Technical'),
        company_research=data.get('company_research', '').strip() or None,
        technical_questions=data.get('technical_questions', '').strip() or None,
        checklist_json=json.dumps(data.get('checklist', [
            {'item': 'Review company engineering tech stack', 'done': False},
            {'item': 'Prepare 2-minute elevator pitch & projects overview', 'done': False},
            {'item': 'Practice common Python & networking technical questions', 'done': False},
            {'item': 'Prepare questions for the interview panel', 'done': False}
        ]))
    )
    db.session.add(interview)
    db.session.commit()
    return jsonify({'message': 'Interview prep recorded', 'interview': interview.to_dict()}), 201

# ==========================================
# Transparent Skills-Gap Analysis
# ==========================================

@career_bp.route('/skills-gap/<int:opportunity_id>', methods=['GET'])
def skills_gap_analysis(opportunity_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    opp = JobOpportunity.query.filter_by(id=opportunity_id, user_id=user.id).first()
    if not opp:
        return jsonify({'error': 'Opportunity not found'}), 404

    # Extract requirements keywords
    req_text = f"{opp.requirements or ''} {opp.description or ''}".lower()

    # User's technical tracks & project evidence
    user_skills = Skill.query.filter_by(user_id=user.id).all()
    evidence_items = LearningEvidence.query.join(Skill).filter(Skill.user_id == user.id).all()

    matched_skills = []
    gap_skills = []
    demonstrated_projects = []

    # Check for core domains
    domain_keywords = {
        'Python': ['python', 'django', 'flask', 'pandas', 'backend'],
        'Cybersecurity': ['security', 'owasp', 'wireshark', 'vulnerability', 'penetration', 'firewall'],
        'Web Development': ['javascript', 'react', 'html', 'css', 'typescript', 'frontend', 'rest api', 'tailwind'],
        'Networking': ['networking', 'cisco', 'tcp/ip', 'dns', 'subnetting', 'routing', 'switching'],
        'Databases': ['sql', 'database', 'mysql', 'sqlite', 'postgresql', 'orm']
    }

    for domain, kws in domain_keywords.items():
        in_job = any(kw in req_text for kw in kws)
        if in_job:
            # Check if user has corresponding track or project evidence
            has_track = any(domain.lower() in s.track_name.lower() for s in user_skills)
            has_evidence = any(any(kw in e.title.lower() or kw in (e.description or '').lower() for kw in kws) for e in evidence_items)

            if has_track and has_evidence:
                matched_skills.append({
                    'skill': domain,
                    'status': 'Strong Match',
                    'detail': 'Track active and demonstrated via practical project evidence.'
                })
            elif has_track:
                matched_skills.append({
                    'skill': domain,
                    'status': 'Developing',
                    'detail': 'Learning track active; attach a portfolio project as proof.'
                })
            else:
                gap_skills.append({
                    'skill': domain,
                    'suggestion': f"Spend time in the {domain} track or complete a demonstration task before applying."
                })

    return jsonify({
        'opportunity': opp.to_dict(),
        'matched_skills': matched_skills,
        'gap_skills': gap_skills,
        'readiness_indicator': (
            'High Match' if len(matched_skills) >= 2 and len(gap_skills) <= 1
            else 'Moderate Match' if len(matched_skills) >= 1
            else 'Prerequisites Needed'
        )
    }), 200

