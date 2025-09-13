# backend/app/db/manager.py
import os
import psycopg2
import logging
from functools import wraps

# --- The Decorator to Handle Reconnections ---
# (This part remains the same)
def handle_db_reconnection(func):
    @wraps(func)
    def wrapper(db_manager, *args, **kwargs):
        try:
            return func(db_manager, *args, **kwargs)
        except psycopg2.OperationalError as e:
            logging.warning(f"[DB] OperationalError caught: {e}. Reconnecting and trying again...")
            db_manager.connect()
            return func(db_manager, *args, **kwargs)
    return wrapper

class DatabaseManager:
    """
    A resilient database manager that is initialized with the Flask app.
    """
    def __init__(self):
        # Don't connect on initialization. Wait for init_app.
        self.conn_str = None
        self.conn = None

    def init_app(self, app):
        """
        Initializes the database connection using the Flask app's configuration.
        This is the new, critical part.
        """
        self.conn_str = app.config.get('DATABASE_URL')
        if not self.conn_str:
            raise ValueError("DATABASE_URL not set in Flask config.")
        self.connect()

    def connect(self):
        """Closes any existing connection and establishes a new one."""
        if not self.conn_str:
            logging.error("[DB] DatabaseManager not initialized. Call init_app first.")
            return
        try:
            if self.conn and not self.conn.closed:
                self.conn.close()
            logging.info("[DB] Connecting to the database...")
            self.conn = psycopg2.connect(self.conn_str)
            logging.info("[DB] Connection successful.")
        except psycopg2.OperationalError as e:
            logging.error(f"[DB] Could not connect to the database: {e}")
            self.conn = None

    def get_connection(self):
        """Provides the current connection, reconnecting if necessary."""
        if self.conn is None or self.conn.closed:
            logging.warning("[DB] Database connection found closed. Reconnecting...")
            self.connect()
        return self.conn

    def close(self):
        """Closes the database connection cleanly."""
        if self.conn and not self.conn.closed:
            self.conn.close()
            logging.info("[DB] Database connection closed.")