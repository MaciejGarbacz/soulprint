# database.py
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy object
db = SQLAlchemy()

def init_db(app):
    """
    Bind the Flask app with SQLAlchemy and create tables.
    """
    db.init_app(app)
    
    with app.app_context():
        db.create_all()  # Create tables based on the models
