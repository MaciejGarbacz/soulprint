from flask import Blueprint, request, jsonify
from services.node_service import create_node, get_node_by_id

# Ensure blueprint name is unique and consistent
node_blueprint = Blueprint('node', __name__, url_prefix='/nodes')

@node_blueprint.route('/create', methods=['POST'])
def create():
    data = request.json
    topic = data.get('topic')
    parent_id = data.get('parent_id', None)
    new_node = create_node(topic, parent_id)
    return jsonify({"message": "Node created", "node_id": new_node.id})

@node_blueprint.route('/<int:node_id>', methods=['GET'])
def get_node(node_id):
    node = get_node_by_id(node_id)
    if node:
        return jsonify({
            "id": node.id,
            "topic": node.topic,
            "conversation_log": node.conversation_log,
            "updated_at": node.updated_at,
            "parent_id": node.parent_id
        })
    return jsonify({"message": "Node not found"}), 404
