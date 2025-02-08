# backend/models/node.py
from datetime import datetime
from database import db  # Import the db instance from database.py

class Node(db.Model):
    __tablename__ = 'nodes'

    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String, nullable=False)
    conversation_log = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Self-referencing foreign key for parent-child relationships
    parent_id = db.Column(db.Integer, db.ForeignKey('nodes.id'), nullable=True)
    parent = db.relationship('Node', remote_side=[id], backref='children')
    # New status column
    status = db.Column(db.String, default="active")

    def __repr__(self):
        return f"<Node {self.topic} ({self.status})>"
    
class Link(db.Model):
    __tablename__ = 'links'

    id = db.Column(db.Integer, primary_key=True)
    source_node_id = db.Column(db.Integer, db.ForeignKey('nodes.id'), nullable=False)
    target_node_id = db.Column(db.Integer, db.ForeignKey('nodes.id'), nullable=False)
    direction = db.Column(db.String(20), default='unidirectional')

    source_node = db.relationship('Node', foreign_keys=[source_node_id])
    target_node = db.relationship('Node', foreign_keys=[target_node_id])

    def __repr__(self):
        return f"<Link {self.source_node_id} -> {self.target_node_id} ({self.direction})>"