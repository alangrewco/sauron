# backend/app/extensions.py

# This file creates and holds the singleton, uninitialized instances of our services.
# They will be initialized later by the application factory.

from .db.manager import DatabaseManager

db_manager = DatabaseManager()
