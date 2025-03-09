import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import SynthwaveBackground from './components/SynthwaveBackground';
import { initGraph } from './graph/GraphManager';

// SVG Icons
const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414M17.95 17.95l1.414 1.414M6.05 6.05L4.636 4.636M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
  </svg>
);

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [userInput, setUserInput] = useState('');
  const [followUpTopics, setFollowUpTopics] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoHovered, setInfoHovered] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [graphData, setGraphData] = useState(null);

  // References for Three.js and tooltip management
  const threeContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const nodeDataRef = useRef(new Map());

  // Fetch initial data for topic, question, LLM response 
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
  useEffect(() => { fetchInitialData(); }, []);

  // Toggle dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle submit and other UI actions
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ user_input: userInput, topic, question })
      });
      if (response.ok) {
        const data = await response.json();
        setFollowUpTopics(data.follow_up_topics);
        setUserInput('');
        setShowSuccess(true);
        setShowNextButton(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error submitting user input:', error);
    }
  };
  const handleNextQuestion = () => window.location.reload();
  const handleGenerateAnswer = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate_answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      setUserInput(data.generated_answer);
    } catch (error) {
      console.error('Error generating answer:', error);
    } finally { setIsGenerating(false); }
  };
  const handleBanTopic = async () => {
    try {
      const response = await fetch('/api/ban_topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (response.ok) { alert("Topic banned successfully"); window.location.reload(); }
      else alert("Failed to ban topic");
    } catch (error) { console.error("Error banning topic:", error); }
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
    } catch (error) { console.error('Error downloading nodes data:', error); }
  };

  // Graph handling
  const handleShowGraph = async () => {
    try {
      const graphResponse = await fetch('/api/graph');
      const graphResponseText = await graphResponse.text();
      if (graphResponseText.trim().startsWith('{')) {
        const figJSON = JSON.parse(graphResponseText);
        setGraphData(figJSON);
        const nodesResponse = await fetch('/api/download_nodes');
        const nodesData = await nodesResponse.json();
        const nodeMap = new Map();
        nodesData.forEach(node => {
          nodeMap.set(node.id, {
            topic: node.topic,
            content: node.conversation_log || "No conversation recorded"
          });
        });
        nodeDataRef.current = nodeMap;
        setShowGraph(true);
      } else {
        console.error("Response is not valid JSON");
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };
  const toggleGraph = async () => {
    if (showGraph) setShowGraph(false);
    else await handleShowGraph();
  };

  useEffect(() => {
    let cleanup;
    if (showGraph && graphData && threeContainerRef.current) {
      cleanup = initGraph({
        container: threeContainerRef.current,
        graphData,
        darkMode,
        nodeData: nodeDataRef.current,
      });
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [showGraph, graphData, darkMode]);

  return (
    <div className="min-h-screen relative">
      <SynthwaveBackground />
      <div className="min-h-screen text-gray-900 dark:text-gray-100 relative bg-transparent/0">
        {/* Outer container to limit width */}
        <div className="max-w-5xl mx-auto px-4">
          {/* Hamburger menu button and dark/light toggle remain unchanged */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="absolute top-4 left-4 z-50 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            <HamburgerIcon />
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          
          {/* Padding before title */}
          <div className="pt-20"></div>
          
          {/* Hamburger menu overlay */}
          {menuOpen && (
            <div className="absolute top-16 left-4 z-50 bg-white dark:bg-gray-900 p-4 rounded shadow-md flex flex-col space-y-2">
              <Button type="button" onClick={() => { handleGenerateAnswer(); setMenuOpen(false); }} variant="secondary">
                Generate Answer
              </Button>
              <Button type="button" onClick={() => { handleDownloadNodes(); setMenuOpen(false); }} variant="secondary">
                Download Conversation Data
              </Button>
            </div>
          )}

          {/* Title with neon effect centered */}
          <div className="w-5/6 mx-auto text-center">
            <h1 className="neon text-4xl font-bold mb-8 text-[#9b59b6] dark:text-white">
              Welcome to Soulprint
            </h1>
          </div>

          {/* Main conversation card */}
          <Card className="card mb-4 mx-auto">
            <CardHeader className="relative mt-4">
              <CardTitle className="neon text-[#9b59b6] dark:text-white">
                Today's topic of conversation: {topic}
              </CardTitle>
              {/* Info icon and tooltip */}
              <div 
                className="absolute top-0 right-0 p-2" 
                onMouseEnter={() => setInfoHovered(true)} 
                onMouseLeave={() => setInfoHovered(false)}
              >
                <div className="relative">
                  <InfoIcon />
                  {infoHovered && (
                    <div className="absolute right-0 mt-1 w-64 bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm">
                      <p><strong>Generate Answer:</strong> Generates a suggested answer.</p>
                      <p><strong>Download Conversation Data:</strong> Downloads the current graph data.</p>
                      <p><strong>Ban Topic:</strong> Removes the current topic.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2"><strong>Question:</strong> {question}</p>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col space-y-2 h-auto">
                  <textarea 
                    value={userInput}
                    onChange={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                      setUserInput(e.target.value);
                    }}
                    placeholder="Enter your answer" 
                    className={`mb-2 w-full p-2 border rounded resize-none ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                    rows={2}
                  />
                  <div className="flex flex-wrap space-x-4 mt-2">
                    <Button type="submit" variant="secondary">
                      Submit
                    </Button>
                    <Button type="button" onClick={handleBanTopic} variant="destructive">
                      Ban Topic
                    </Button>
                    <Button type="button" onClick={toggleGraph} variant="secondary">
                      {showGraph ? 'Hide Graph' : 'Show Graph'}
                    </Button>
                    {showNextButton && (
                      <Button type="button" onClick={handleNextQuestion} variant="default">
                        Next Question
                      </Button>
                    )}
                  </div>
                </div>
              </form>
              {showSuccess && <p className="mt-2 text-green-500">Submitted successfully!</p>}
            </CardContent>
          </Card>

          {/* Graph container with its own background and styling */}
          {showGraph && (
            <Card className="card mb-4 mx-auto">
              <CardContent>
                <div
                  ref={threeContainerRef}
                  id="three-graph-container"
                  className="w-full"
                  style={{ aspectRatio: '1 / 0.8' }}  // width:height = 1:0.8 (20% shorter than a square)
                />
              </CardContent>
            </Card>
          )}

          {/* Follow-up Topics Card */}
          {followUpTopics.length > 0 && (
            <Card className="card mb-4">
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
      </div>
    </div>
  );
};

export default App;