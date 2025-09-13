# backend/app/api/__init__.py
from flask import Blueprint

# Create a Blueprint for the API
api_blueprint = Blueprint('api', __name__)

# Import the routes to register them with the blueprint
from . import routes