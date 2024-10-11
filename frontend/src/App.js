import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const App = () => {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [userInput, setUserInput] = useState('');
  const [followUpTopics, setFollowUpTopics] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/initial_data');
      const data = await response.json();
      setTopic(data.topic);
      setQuestion(data.question);
      setLlmResponse(data.llm_response);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_input: userInput, topic: topic, question: question }),
      });
      const data = await response.json();
      setFollowUpTopics(data.follow_up_topics);
      setUserInput('');
    } catch (error) {
      console.error('Error submitting user input:', error);
    }
  };

  const handleGenerateAnswer = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate_answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question }),
      });
      const data = await response.json();
      setUserInput(data.generated_answer);
    } catch (error) {
      console.error('Error generating answer:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadNodes = async () => {
    try {
      const response = await fetch('/api/download_nodes');
      const data = await response.json();
      
      // Create a Blob with the JSON data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      // Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary <a> element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nodes_data.json';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading nodes data:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Soulprint</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Today's topic of conversation: {topic}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2"><strong>Question:</strong> {question}</p>
          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter your answer"
              className="mb-2"
            />
            <div className="flex space-x-2">
              <Button type="submit">Submit</Button>
              <Button type="button" onClick={handleGenerateAnswer} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Answer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {followUpTopics.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Follow-up Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {followUpTopics.map((topic, index) => (
                <li key={index}>{topic}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Button onClick={handleDownloadNodes}>Download Conversation Data</Button>
    </div>
  );
};

export default App;