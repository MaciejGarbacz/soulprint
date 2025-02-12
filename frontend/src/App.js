import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

// New HamburgerIcon definition for the menu trigger
const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414M17.95 17.95l1.414 1.414M6.05 6.05L4.636 4.636M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [userInput, setUserInput] = useState('');
  const [followUpTopics, setFollowUpTopics] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState(null);
  // New state for controlling the menu visibility
  const [menuOpen, setMenuOpen] = useState(false);

  // Create a ref for the Plotly container
  const plotlyRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
      if (response.ok) {
        const data = await response.json();
        setFollowUpTopics(data.follow_up_topics);
        setUserInput('');
        setShowSuccess(true);
        setShowNextButton(true);
        setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
      }
    } catch (error) {
      console.error('Error submitting user input:', error);
    }
  };

  const handleNextQuestion = () => {
    window.location.reload(); // Refresh the page to load the next question
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

  const handleBanTopic = async () => {
    try {
      const response = await fetch('/api/ban_topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic })
      });
      if (response.ok) {
        // Optionally display a message or refresh the question
        alert("Topic banned successfully");
        window.location.reload();
      } else {
        alert("Failed to ban topic");
      }
    } catch (error) {
      console.error("Error banning topic:", error);
    }
  };

  const handleDownloadNodes = async () => {
    try {
      const response = await fetch('/api/download_nodes');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nodes_data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading nodes data:', error);
    }
  };

  // Update handleShowGraph to fetch JSON and draw using Plotly
  const handleShowGraph = async () => {
    console.log("Show Graph button clicked");
    try {
      const response = await fetch('/api/graph');
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      // Optionally check if it starts with '{' indicating valid JSON
      if (responseText.trim().startsWith('{')) {
        const figJSON = JSON.parse(responseText);
        console.log('Received graph JSON:', figJSON);
        setGraphData(figJSON);
        setShowGraph(true);
      } else {
        console.error("Response is not valid JSON");
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  // Once the graph container is rendered and we have data, render the Plotly graph.
  useEffect(() => {
    console.log("useEffect triggered:", { showGraph, graphData, container: plotlyRef.current });
    if (showGraph && graphData && plotlyRef.current) {
      console.log("Rendering Plotly graph to container:", plotlyRef.current);
      Plotly.newPlot(plotlyRef.current, graphData.data, graphData.layout);
    } else {
      if (!plotlyRef.current) {
        console.log("plotlyRef.current is null");
      }
    }
  }, [showGraph, graphData]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative">
      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* New fixed menu on the right side */}
      <div 
        className="fixed right-4 top-20 z-50"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer">
          <HamburgerIcon />
        </div>
        {menuOpen && (
          <div className="mt-2 bg-white dark:bg-gray-800 shadow-lg rounded p-2 flex flex-col gap-2">
            <Button 
              type="button" 
              onClick={handleGenerateAnswer} 
              disabled={isGenerating} 
              variant="outline"
            >
              {isGenerating ? 'Generating...' : 'Generate Answer'}
            </Button>
            <Button 
              type="button" 
              onClick={handleDownloadNodes} 
              variant="destructive"
            >
              Download Conversation Data
            </Button>
          </div>
        )}
      </div>

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
                <Button type="submit" variant="secondary">Submit</Button>
                {/* Removed Generate Answer button here */}
                {showNextButton && (
                  <Button type="button" onClick={handleNextQuestion} variant="default">Next Question</Button>
                )}
                <Button type="button" onClick={handleBanTopic} variant="destructive">Ban Topic</Button>
              </div>
            </form>
            {showSuccess && (
              <p className="mt-2 text-green-500">Submitted successfully!</p>
            )}
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
        {/* Removed the Download Conversation Data button from here */}
        <div className="flex space-x-2">
          <Button onClick={handleShowGraph} variant="primary">
            Show Graph
          </Button>
        </div>
        {showGraph && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Graph Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={plotlyRef}
                id="plotly-div"
                style={{ width: '100%', height: '600px' }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;
