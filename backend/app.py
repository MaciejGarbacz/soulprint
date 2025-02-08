import os
from flask import Flask, render_template, request, jsonify
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from datetime import datetime
from database import init_db
from models.node import db, Node, Link
from mistralai import Mistral

# Define the base topics
BASE_TOPICS = [
    "Hobbies", "Work", "Family", "Health", "Travel",
    "Education", "Technology", "Entertainment", "Goals", "Lifestyle"
]

# Initialize the Mistral client
api_key = "API_KEY"  # Ensure your API key is set in your environment
mistral_client = Mistral(api_key=api_key)

def create_app():
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ai_model.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize the database
    init_db(app)

    # Initialize Flask-Admin
    admin = Admin(app, name='Admin', template_mode='bootstrap3')
    admin.add_view(ModelView(Node, db.session, name='Nodes'))
    admin.add_view(ModelView(Link, db.session, name='Links'))

    # Add the base topic initialization
    with app.app_context():
        initialize_base_topics()

    # Route to display topics information
    @app.route('/topics', methods=['GET'])
    def show_topics():
        topics_data = []
        topics = Node.query.all()

        for topic in topics:
            volume = len(topic.conversation_log.split('\n')) if topic.conversation_log else 0
            topics_data.append({
                'topic': topic.topic,
                'volume': volume,
                'last_update': topic.updated_at.strftime('%Y-%m-%d %H:%M:%S') if topic.updated_at else "N/A"
            })

        return jsonify({'topics': topics_data}), 200

    @app.route('/')
    def serve():
        return app.send_static_file('index.html')

    @app.route('/api/initial_data', methods=['GET'])
    def get_initial_data():
        topic_of_conversation = get_oldest_topic()
        question = get_llm_response(get_message(topic_of_conversation))
        return jsonify({
            'topic': topic_of_conversation,
            'question': question
        })

    @app.route('/api/submit', methods=['POST'])
    def submit_input():
        data = request.json

        user_input = data['user_input']
        topic_of_conversation = data['topic']
        question = data['question']

        update_node_conversation_log(topic_of_conversation, question, user_input)

        node = Node.query.filter_by(topic=topic_of_conversation).first()
        question_answer = f"Q: {question}\nA: {user_input}"
        follow_up_topics = get_follow_up_topics(question_answer)

        for follow_up_topic in follow_up_topics:
            create_child_node(parent=node, topic=follow_up_topic)

        return jsonify({
            'follow_up_topics': follow_up_topics
        })

    @app.route('/api/generate_answer', methods=['POST'])
    def generate_answer():
        data = request.json
        question = data['question']

        # Generate an answer using the AI model
        generated_answer = get_llm_response(f"Please provide a brief answer to the following question: {question}")

        return jsonify({
            'generated_answer': generated_answer
        })

    @app.route('/api/download_nodes', methods=['GET'])
    def download_nodes():
        nodes = Node.query.all()
        nodes_data = []

        for node in nodes:
            node_data = {
                'id': node.id,
                'topic': node.topic,
                'conversation_log': node.conversation_log,
                'updated_at': node.updated_at.isoformat() if node.updated_at else None,
                'parent_id': node.parent_id,
                'children': [child.id for child in node.children]
            }
            nodes_data.append(node_data)

        return jsonify(nodes_data)
    
    
    @app.route('/api/ban_topic', methods=['POST'])
    def ban_topic():
        data = request.json
        app.logger.debug("Received data: %s", data)
        
        topic_of_conversation = data.get('topic')
        if not topic_of_conversation:
            app.logger.debug("No topic provided in the request.")
            return jsonify({"message": "Topic parameter missing."}), 400

        # Log the topic value received.
        app.logger.debug("Looking up node with topic: '%s' and status: 'active'", topic_of_conversation)

        node = Node.query.filter_by(topic=topic_of_conversation, status="active").first()
        
        if node:
            app.logger.debug("Found node: %s", node)
            node.status = "inactive"
            db.session.commit()
            app.logger.debug("Node %s set to inactive.", node)
            return jsonify({"message": f"Topic '{node.topic}' banned successfully."}), 200

        app.logger.debug("No active node found with topic: '%s'", topic_of_conversation)
        return jsonify({"message": "Active topic not found."}), 404

    # Add a route to clear the database
    @app.route('/api/clear_database', methods=['POST'])
    def clear_database():
        try:
            db.session.query(Link).delete()
            db.session.query(Node).delete()
            db.session.commit()
            return jsonify({"message": "Database cleared successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    return app
# Function to check if base topics exist and add them if missing
def initialize_base_topics():
    for topic in BASE_TOPICS:
        existing_node = Node.query.filter_by(topic=topic).first()
        if not existing_node:
            new_node = Node(
                topic=topic,
                conversation_log="",  # Initially empty
                updated_at=datetime.utcnow()  # Set the updated_at field to the current time
            )
            db.session.add(new_node)
    db.session.commit()

# Function to get the node with the oldest updated_at timestamp
def get_oldest_topic():
    oldest_node = Node.query.filter_by(status="active").order_by(Node.updated_at).first()
    return oldest_node.topic if oldest_node else "No active topics available"

def get_follow_up_topics(question_answer):
    try:
        prompt = f"""You're tasked with creating the most accurate user model possible by suggesting new conversation topics. 
        Based on this question/answer combination, provide 3 concise follow-up topics that are relevant to the user's experience 
        and can help explore the user's interests, habits, or deeper aspects of their personality. 
        These topics should be short and descriptive, ideally limited to a few words each. 
        Avoid overly long or vague suggestions. Don't add special characters. Don't add words like "topic".

        Examples of good output:
        "Favourite Ourdoor Activities",
        "Memories of Christmas",
        "Bookstore Visits".
        
        Examples of bad output:
        **Favorite Outdoor Activities**: Explore their interest in camping, hiking, or other outdoor pursuits. (too long, special chars)
        **Music Influences**: Ask about their tastes in music and if they play any instruments like their dad. (too long, special chars)
        **Family Traditions**: Discuss any other memorable family traditions or rituals they have. (too long, special chars)

        Question and Answer:
        {question_answer}
        """

        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": prompt}]
        )
        # Parse the response into a list of topics (assuming the response is a newline-separated list)
        topics = response.choices[0].message.content.split("\n")
        return [topic.strip() for topic in topics[:3] if topic.strip()]  # Limit to 3 topics and clean up whitespace
    except Exception as e:
        return [f"Error generating follow-up topics: {str(e)}"]


def create_child_node(parent, topic):
    new_node = Node(
        topic=topic,
        conversation_log="",  # Initially empty
        updated_at=datetime.utcnow(),  # Set the current time
        parent=parent  # Set the parent node
    )
    db.session.add(new_node)
    db.session.commit()

# Function to send a message to Mistral and get the response
def get_llm_response(message):
    try:
        chat_response = mistral_client.chat.complete(
            model="mistral-large-latest",  # Use the Mistral model
            messages=[
                {"role": "user", "content": message}
            ]
        )
        return chat_response.choices[0].message.content  # Get the response from the LLM
    except Exception as e:
        return f"Error getting response: {str(e)}"

# Function to update the conversation log of the node
def update_node_conversation_log(topic, question, user_input):
    node = Node.query.filter_by(topic=topic).first()
    if node:
        # Append the question and the user input, tagging each entry
        if node.conversation_log:
            node.conversation_log += f"\nQ: {question}\nA: {user_input}"
        else:
            node.conversation_log = f"Q: {question}\nA: {user_input}"

        node.updated_at = datetime.utcnow()  # Adjust the update time to current
        db.session.commit()

def get_message(topic_of_conversation):
    node = Node.query.filter_by(topic=topic_of_conversation).first()
    conversation_log = node.conversation_log if node and node.conversation_log else "No previous conversation."

    return f"""You are an assistant in an application that aims to build the most accurate user model 
    through conversation. You will be given the topic of conversation along with the previous conversation 
    log. Please output a question that will be directed to the user as a prompt for their answer about 
    this topic. Aim to make the question engaging and do not be afraid to dig into sensitive topics.

    The topic of conversation is: {topic_of_conversation}.

    Previous conversation log: {conversation_log}

    Answer only with the question you wish to ask the user. Do not provide any other text."""

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
