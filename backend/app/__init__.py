import os
from flask import Flask
from flask_cors import CORS
from .config import Config
from .models import db, User, UserSettings
from .auth.routes import auth_bp
from .settings.routes import settings_bp
from .dashboard.routes import dashboard_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend Vite dev server (usually localhost:5173 or localhost:3000)
    CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'])

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(dashboard_bp)

    with app.app_context():
        db.create_all()
        # Seed default student user if none exists
        if not User.query.first():
            student = User(
                email='student@jkuat.ac.ke',
                display_name='JKUAT SODeL Scholar',
                timezone='Africa/Nairobi'
            )
            student.set_password('Password123!')
            db.session.add(student)
            db.session.flush()

            settings = UserSettings(user_id=student.id)
            db.session.add(settings)
            db.session.commit()

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'healthy', 'service': 'MyLife OS API'}, 200

    return app
