import sqlite3
import bcrypt
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), 'sentinel.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        kyc_status TEXT NOT NULL DEFAULT 'PENDING',
        risk_score INTEGER DEFAULT 0,
        failed_attempts INTEGER DEFAULT 0,
        last_ip TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    )''')

    # KYC table
    c.execute('''CREATE TABLE IF NOT EXISTS kyc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        name TEXT,
        dob TEXT,
        address TEXT,
        id_number TEXT,
        document_path TEXT,
        photo_path TEXT,
        status TEXT DEFAULT 'PENDING',
        kyc_score INTEGER DEFAULT 0,
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        verified_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # Activity logs table
    c.execute('''CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        action TEXT,
        endpoint TEXT,
        status TEXT,
        method TEXT
    )''')

    # Alerts table
    c.execute('''CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        type TEXT,
        risk_score INTEGER DEFAULT 0,
        risk_level TEXT,
        ip_address TEXT,
        description TEXT,
        is_resolved INTEGER DEFAULT 0
    )''')

    conn.commit()

    # Seed default users
    admin_email = 'admin@sentinel.com'
    user_email = 'user@sentinel.com'
    existing = c.execute(
        "SELECT email FROM users WHERE email IN (?, ?)", (admin_email, user_email)
    ).fetchall()
    existing_emails = [r[0] for r in existing]

    if admin_email not in existing_emails:
        hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
        c.execute(
            "INSERT INTO users (username, email, password_hash, role, kyc_status) VALUES (?, ?, ?, ?, ?)",
            ('System Admin', admin_email, hashed, 'ADMIN', 'VERIFIED')
        )
        logger.info("Seeded admin user: admin@sentinel.com")

    if user_email not in existing_emails:
        hashed = bcrypt.hashpw(b'user123', bcrypt.gensalt()).decode()
        c.execute(
            "INSERT INTO users (username, email, password_hash, role, kyc_status) VALUES (?, ?, ?, ?, ?)",
            ('Demo User', user_email, hashed, 'USER', 'PENDING')
        )
        logger.info("Seeded demo user: user@sentinel.com / user123")

    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")
