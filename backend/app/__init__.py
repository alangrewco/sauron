# backend/app/__init__.py
from flask import Flask
from config import Config

# Import the db_manager instance from extensions
from .extensions import db_manager

# Import the ChatbotService CLASS, not an instance
from .services.chatbot import ChatbotService

# Create the chatbot_service instance here, outside the factory,
# and pass its dependency (db_manager) to its constructor.
chatbot_service = ChatbotService(db_manager=db_manager)

def create_app(config_class=Config):
    """
    Application factory pattern to create and configure the Flask app.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- INITIALIZE EXTENSIONS ---
    # Now we initialize the instances that we created above.
    db_manager.init_app(app)
    chatbot_service.init_app(app)
    # -----------------------------

    # Import and register the API blueprint
    from .api import api_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api')

    return app