# backend/config.py
import os
from dotenv import load_dotenv

# Load environment variables from a .env file in the 'backend' directory
load_dotenv()

class Config:
    """Base configuration class."""
    # Load the database URL and Cohere API key from environment variables
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set. Please create a .env file.")

    COHERE_API_KEY = os.environ.get('COHERE_API_KEY')
    if not COHERE_API_KEY:
        raise ValueError("COHERE_API_KEY environment variable not set. Please create a .env file.")

    # Basic Flask app configurations
    SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(24))
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')
    TESTING = False