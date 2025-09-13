# backend/run.py
from app import create_app
from config import Config
import os

# Create the Flask app instance using the application factory pattern.
# This allows for better testability and configuration management.
app = create_app(config_class=Config)

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5001))
    # Running with debug=False is recommended for production.
    # Set DEBUG=True in your .env file for development.
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])