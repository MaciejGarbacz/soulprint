# node_service.py
from models.node import Node, db

def create_node(topic, parent_id=None):
    new_node = Node(topic=topic, parent_id=parent_id)
    db.session.add(new_node)
    db.session.commit()
    return new_node

def get_node_by_id(node_id):
    return Node.query.get(node_id)