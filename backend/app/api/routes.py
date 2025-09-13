from flask import Blueprint

api = Blueprint('api', __name__)

@api.route("/")
def index():
    return "<p>Hello, World!</p>"

@api.route("/trajectories", methods=['GET', 'POST'])
def trajectories():
    if request.method == 'POST':
        pass
    elif request.method == 'GET':
        pass
    return "<p>Hello, World! TRAJECTORy</p>"