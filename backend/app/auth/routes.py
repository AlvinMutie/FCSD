from flask import Blueprint, request, jsonify, session
from ..models import db, User, UserSettings

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    display_name = data.get('display_name', '').strip()

    if not email or not password or not display_name:
        return jsonify({'error': 'Email, password, and display name are required.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    user = User(email=email, display_name=display_name)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # Create default settings
    settings = UserSettings(user_id=user.id)
    db.session.add(settings)
    db.session.commit()

    session['user_id'] = user.id
    return jsonify({
        'message': 'Account created successfully.',
        'user': user.to_dict(),
        'settings': settings.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    session['user_id'] = user.id
    settings = user.settings or UserSettings(user_id=user.id)
    if not user.settings:
        db.session.add(settings)
        db.session.commit()

    return jsonify({
        'message': 'Login successful.',
        'user': user.to_dict(),
        'settings': settings.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'authenticated': False, 'user': None}), 200

    user = db.session.get(User, user_id)
    if not user:
        session.pop('user_id', None)
        return jsonify({'authenticated': False, 'user': None}), 200

    settings = user.settings
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)
        db.session.commit()

    return jsonify({
        'authenticated': True,
        'user': user.to_dict(),
        'settings': settings.to_dict()
    }), 200

