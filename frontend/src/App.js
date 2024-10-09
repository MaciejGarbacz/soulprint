import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const App = () => {
  const [topic, setTopic] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [userInput, setUserInput] = useState('');
  const [followUpTopics, setFollowUpTopics] = useState([]);
  
  // New flag to track if the initial LLM response has been set
  const [initialResponseSet, setInitialResponseSet] = useState(false);

  useEffect(() => {
    if (!initialResponseSet) {
      fetchInitialData();
    }
  }, [initialResponseSet]); // Only fetch once when component mounts

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/initial_data');
      const data = await response.json();
      setTopic(data.topic);
      setLlmResponse(data.llm_response);
      setInitialResponseSet(true);  // Mark initial response as set
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
        body: JSON.stringify({ user_input: userInput }),
      });
      const data = await response.json();

      // Only update follow-up topics on form submission, not the initial response
      setFollowUpTopics(data.follow_up_topics);
      setUserInput('');
    } catch (error) {
      console.error('Error submitting user input:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Your AI Model</h1>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Today's topic of conversation: {topic}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show only the initial LLM response when the component first loads */}
          {!initialResponseSet ? (
            <p>Loading...</p>  // Loading state while data is being fetched
          ) : (
            <>
              <p className="mb-2"><strong>Mistral's Response:</strong></p>
              <p className="mb-4">{llmResponse}</p>
            </>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter your message"
              className="mb-2"
            />
            <Button type="submit">Submit</Button>
          </form>
        </CardContent>
      </Card>

      {/* Show follow-up topics if they exist */}
      {followUpTopics.length > 0 && (
        <Card>
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
    </div>
  );
};

export default App;
