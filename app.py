import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
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
api_key =  "API_KEY_HERE"# Ensure your API key is set in your environment
mistral_client = Mistral(api_key=api_key)

def create_app():
    app = Flask(__name__)

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

    @app.route('/', methods=['GET', 'POST'])
    def home():
        topic_of_conversation = get_oldest_topic()
        llm_response = get_llm_response(get_message(topic_of_conversation))  # Initial question

        if request.method == 'POST':
            user_input = request.form['user_input']  # Get the user input from the form
            node = Node.query.filter_by(topic=topic_of_conversation).first()
            
            if node:
                # Update the conversation log with user input
                update_node_conversation_log(topic_of_conversation, user_input)

                # Get the follow-up topics from Mistral based on question/answer
                question_answer = f"Q: {llm_response}\nA: {user_input}"
                follow_up_topics = get_follow_up_topics(question_answer)

                # Create child nodes for each follow-up topic
                for follow_up_topic in follow_up_topics:
                    create_child_node(parent=node, topic=follow_up_topic)

                # Display the follow-up topics to the user
                return render_template('home.html', 
                                    topic_of_conversation=topic_of_conversation, 
                                    llm_response=llm_response, 
                                    follow_up_topics=follow_up_topics)

        return render_template('home.html', topic_of_conversation=topic_of_conversation, llm_response=llm_response)

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
    oldest_node = Node.query.order_by(Node.updated_at).first()  # Orders by 'updated_at' ascending (oldest first)
    return oldest_node.topic if oldest_node else "No topics available"

def get_follow_up_topics(question_answer):
    try:
        prompt = f"""You're tasked with creating the best user model. Based on this question/answer combination, 
        create possible follow-up topics. Answer only with the list of topics, don't provide any other text.
        
        {question_answer}
        """
        
        response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": prompt}]
        )
        # Parse the response into a list of topics (assuming the response is a newline-separated list)
        topics = response.choices[0].message.content.split("\n")
        return [topic.strip() for topic in topics if topic.strip()]  # Clean up whitespace
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
def update_node_conversation_log(topic, user_input):
    node = Node.query.filter_by(topic=topic).first()
    if node:
        # Update the conversation log and adjust the updated_at timestamp
        if node.conversation_log:
            node.conversation_log += f"\n{user_input}"
        else:
            node.conversation_log = user_input
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
