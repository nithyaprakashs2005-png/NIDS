import logging
import os
from flask import Flask, request, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, decode_token
from database import init_db, get_db
from middleware.nids import log_activity, run_nids_checks
from routes.predict import predict_bp
from routes.kyc import kyc_bp
from routes.status import status_bp
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.simulate import simulate_bp

from datetime import timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Security: Restrict CORS to specific origins if defined in .env
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*').split(',')
CORS(app, resources={r'/*': {'origins': allowed_origins}})

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
if not app.config['JWT_SECRET_KEY']:
    logger.warning("JWT_SECRET_KEY not set in environment! Falling back to insecure development key.")
    app.config['JWT_SECRET_KEY'] = 'dev-insecure-sentinel-fallback'

# Tokens expire after 24 hours (rather than never)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(predict_bp)
app.register_blueprint(kyc_bp)
app.register_blueprint(status_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(simulate_bp)

# ── NIDS Global Middleware ──────────────────────────────────────────────
SKIP_NIDS_PATHS = {'/auth/login', '/auth/register', '/', '/status', '/health'}

@app.before_request
def nids_request_hook():
    """Run NIDS checks on every authenticated request."""
    if request.path in SKIP_NIDS_PATHS or request.method == 'OPTIONS':
        return
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return
    token = auth_header.split(' ', 1)[1]
    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        conn = get_db()
        user = conn.execute("SELECT last_ip FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        last_ip = user['last_ip'] if user else None
        run_nids_checks(user_id, last_ip)
        log_activity(user_id, f'{request.method} {request.path}', 'ok')
    except Exception:
        # Silently skip NIDS if token is invalid - handled by specific @jwt_required routes
        pass 


# ── Standard Routes ─────────────────────────────────────────────────────
@app.route('/')
def index():
    return {'project': 'Sentinel Gate API', 'status': 'Running',
            'endpoints': ['/health', '/status', '/predict', '/auth/login', '/admin/stats']}, 200

@app.errorhandler(404)
def not_found(e):
    return {'error': 'Endpoint not found'}, 404

@app.errorhandler(500)
def server_error(e):
    logger.exception('Unhandled exception on %s', request.path)
    return {'error': 'Internal server error', 'message': str(e) if app.debug else 'Contact Admin'}, 500


if __name__ == '__main__':
    init_db()
    
    # --- Live Sniffer Initialization ---
    try:
        from utils.sniffer import init_sniffer
        from routes.predict import _perform_inference
        import time
        
        def sniffer_callback(features):
            # Run inference in the sniffer thread
            _perform_inference(features, time.perf_counter())
            
        init_sniffer(app, sniffer_callback)
        logger.info("NIDS Live Sniffer initialized and running in background.")
    except Exception as e:
        logger.error(f"Failed to start Live Sniffer: {e}")

    # Explicitly warn about development mode
    if os.environ.get('FLASK_ENV') == 'development':
        logger.info("Starting Flask in DEVELOPMENT mode.")
    app.run(debug=False, host='0.0.0.0', port=5000)
