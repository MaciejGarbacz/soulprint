import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

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
  const tooltipRef = useRef(null);

  // Tooltip helper functions
  const showTooltip = (x, y, data) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'block';
      tooltipRef.current.style.left = `${x}px`;
      tooltipRef.current.style.top = `${y}px`;
      tooltipRef.current.style.color = darkMode ? "#f7fafc" : "#1a202c";
      tooltipRef.current.innerHTML = `<strong>${data.label || "Node"}</strong><br/>${data.content}`;
    }
  };
  const hideTooltip = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  };

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
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
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
    } catch (error) { console.error('Error submitting user input:', error); }
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

  // Three.js initialization and helper functions
  const initThreeJS = () => {
    if (!threeContainerRef.current || !graphData) return;

    // Clean up previous renderer if exists
    if (rendererRef.current) {
      threeContainerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
    // Reset node and edge references
    nodesRef.current = [];
    edgesRef.current = [];

    // Create tooltip element if missing
    if (!tooltipRef.current) {
      tooltipRef.current = document.createElement('div');
      tooltipRef.current.className = 'absolute bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-sm z-50 max-w-md';
      tooltipRef.current.style.display = 'none';
      tooltipRef.current.style.pointerEvents = 'none';
      document.body.appendChild(tooltipRef.current);
    }

    // Setup scene, camera, and renderer
    const width = threeContainerRef.current.clientWidth;
    const height = threeContainerRef.current.clientHeight || 600;
    const scene = new THREE.Scene();
    const bgColor = darkMode ? 0x0d0d1e : 0xf5f5f5;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 10, 50);
    sceneRef.current = scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    threeContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableRotate = false;
    orbitControls.enablePan = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;

    // Extract node and edge data from graphData (from Plotly figure)
    const nodeTrace = graphData.data.find(item => item.mode && item.mode.includes('markers'));
    const lineTrace = graphData.data.find(item => item.mode && item.mode.includes('lines'));

    // Create node meshes
    const nodeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const nodeMeshes = {}; // id mapping
    if (nodeTrace) {
      nodeTrace.x.forEach((x, i) => {
        const y = nodeTrace.y[i];
        const label = nodeTrace.text[i];
        const id = nodeTrace.ids[i];
        const content = nodeDataRef.current.get(id)
          ? nodeDataRef.current.get(id).content
          : "Loading content...";
        const nodeMaterial = new THREE.MeshStandardMaterial({
          color: 0xC0C0C0,        // silver
          metalness: 0.8,
          roughness: 0.3,
          emissive: 0x000000,
        });
        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        // Set default color for later reset.
        nodeMesh.userData.defaultColor = new THREE.Color(0xC0C0C0);
        nodeMesh.position.set(x * 10, y * 10, 0);
        nodeMesh.userData = { ...nodeMesh.userData, id, label, content, defaultColor: nodeMesh.userData.defaultColor };
        scene.add(nodeMesh);
        nodesRef.current.push(nodeMesh);
        nodeMeshes[id] = nodeMesh;
      });
    }

    // Create text sprites for node titles, anchored to nodes (disable raycasting)
    Object.values(nodeMeshes).forEach(node => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      // Updated font to match the app's title style (using a font similar to neon-title)
      context.font = '48px "Oswald", sans-serif';
      context.fillStyle = darkMode ? '#f7fafc' : '#1a202c';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      const wrapText = (ctx, text, maxWidth) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          if (ctx.measureText(currentLine + ' ' + word).width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);
        return lines;
      };
      const label = node.userData.label || 'Node';
      const maxTextWidth = size * 0.8;
      const lines = wrapText(context, label, maxTextWidth);
      const lineHeight = 60;
      const totalTextHeight = lineHeight * lines.length;
      let yOffset = (size - totalTextHeight) / 2;
      lines.forEach(line => { context.fillText(line, size / 2, yOffset); yOffset += lineHeight; });
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      // Offset sprite upward so it doesn't overlap the node:
      sprite.position.set(0, 1.2, 0);
      sprite.scale.set(6, 6, 1);
      sprite.raycast = () => {}; // prevent interference with hover
      sprite.material.depthTest = false;
      sprite.renderOrder = 999;
      node.add(sprite);
    });

    // Create edges connecting nodes
    edgesRef.current = [];
    if (lineTrace) {
      for (let i = 0; i < lineTrace.x.length; i += 3) {
        const x1 = lineTrace.x[i] * 10, y1 = lineTrace.y[i] * 10;
        const x2 = lineTrace.x[i + 1] * 10, y2 = lineTrace.y[i + 1] * 10;
        let startNode = null, endNode = null, minDist1 = Infinity, minDist2 = Infinity;
        Object.values(nodeMeshes).forEach(node => {
          const dx1 = node.position.x - x1, dy1 = node.position.y - y1;
          const dist1 = dx1 * dx1 + dy1 * dy1;
          if (dist1 < minDist1) { minDist1 = dist1; startNode = node; }
          const dx2 = node.position.x - x2, dy2 = node.position.y - y2;
          const dist2 = dx2 * dx2 + dy2 * dy2;
          if (dist2 < minDist2) { minDist2 = dist2; endNode = node; }
        });
        if (startNode && endNode) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            startNode.position, endNode.position
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff00ff, // neon magenta
            transparent: true,
            opacity: 0.7,
          });
          const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
          lineMesh.userData = { startNode, endNode };
          scene.add(lineMesh);
          edgesRef.current.push(lineMesh);
        }
      }
    }

    // Add drag controls with collision animation on dragend
    const dragControls = new DragControls(nodesRef.current, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', (event) => {
      orbitControls.enabled = false;
      hideTooltip();
    });
    dragControls.addEventListener('drag', (event) => {
      const dragged = event.object;
      dragged.position.z = 0;
      edgesRef.current.forEach(edge => {
        if (edge.userData.startNode === dragged || edge.userData.endNode === dragged) {
          const positions = edge.geometry.attributes.position.array;
          positions[0] = edge.userData.startNode.position.x;
          positions[1] = edge.userData.startNode.position.y;
          positions[3] = edge.userData.endNode.position.x;
          positions[4] = edge.userData.endNode.position.y;
          edge.geometry.attributes.position.needsUpdate = true;
        }
      });
    });
    dragControls.addEventListener('dragend', (event) => {
      orbitControls.enabled = true;
      // Animated collision resolution for a visible bounce after drag
      setTimeout(() => { resolveCollisions(); }, 200);
    });

    // Helper functions for bounce animation and collision resolution
    const easeOutElastic = (t) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };
    const animateBounce = (node, targetPos, duration = 600) => {
      const startPos = node.position.clone();
      const startTime = performance.now();
      const animate = () => {
        const t = (performance.now() - startTime) / duration;
        if (t < 1) {
          const easedT = easeOutElastic(t);
          node.position.lerpVectors(startPos, targetPos, easedT);
          updateEdgePositions();
          requestAnimationFrame(animate);
        } else {
          node.position.copy(targetPos);
          updateEdgePositions();
        }
      };
      animate();
    };
    const resolveCollisions = () => {
      const collisionDistance = 5;
      const nodes = nodesRef.current;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < collisionDistance) {
            const overlap = (collisionDistance - distance) / 2;
            const nx = dx / (distance || 0.0001);
            const ny = dy / (distance || 0.0001);
            const targetA = nodeA.position.clone().add(new THREE.Vector3(-nx * overlap, -ny * overlap, 0));
            const targetB = nodeB.position.clone().add(new THREE.Vector3(nx * overlap, ny * overlap, 0));
            animateBounce(nodeA, targetA);
            animateBounce(nodeB, targetB);
          }
        }
      }
    };
    const updateEdgePositions = () => {
      edgesRef.current.forEach(edge => {
        const start = edge.userData.startNode.position;
        const end = edge.userData.endNode.position;
        edge.geometry.setFromPoints([start, end]);
      });
    };

    // Initial collision resolution so the graph renders nicely from the start
    const initialResolveCollisions = () => {
      const collisionDistance = 3.5;
      let iterations = 0;
      let hasCollision = true;
      const nodes = nodesRef.current;
      while (hasCollision && iterations < 50) {
        hasCollision = false;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const dx = nodeB.position.x - nodeA.position.x;
            const dy = nodeB.position.y - nodeA.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < collisionDistance) {
              const overlap = (collisionDistance - distance) / 2;
              const nx = dx / (distance || 0.0001);
              const ny = dy / (distance || 0.0001);
              nodeA.position.add(new THREE.Vector3(-nx * overlap, -ny * overlap, 0));
              nodeB.position.add(new THREE.Vector3(nx * overlap, ny * overlap, 0));
              hasCollision = true;
            }
          }
        }
        iterations++;
      }
      updateEdgePositions();
    };
    initialResolveCollisions();

    // Setup tooltip hover: only show tooltip when hovering directly over a node mesh
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesRef.current, false);
      
      // Reset all nodes to default silver.
      nodesRef.current.forEach(node => {
        node.material.color.copy(node.userData.defaultColor);
      });
      
      if (intersects.length > 0 && intersects[0].object.userData && intersects[0].object.userData.label) {
        const hovered = intersects[0].object;
        // Only pulse when entering a new node.
        if (hoveredNode !== hovered.id) {
          hovered.scale.set(1.1, 1.1, 1.1);
          setTimeout(() => { hovered.scale.set(1, 1, 1); }, 150);
          setHoveredNode(hovered.id);
        }
        // Set hovered node color to neon cyan.
        hovered.material.color.set(0x00ffff);
        // Update adjacent nodes (those sharing an edge) to a darker cyan.
        edgesRef.current.forEach(edge => {
          if (edge.userData.startNode === hovered) {
            edge.userData.endNode.material.color.set(0x008888);
          } else if (edge.userData.endNode === hovered) {
            edge.userData.startNode.material.color.set(0x008888);
          }
        });
        showTooltip(event.pageX, event.pageY, hovered.userData);
      } else {
        hideTooltip();
        setHoveredNode(null);
      }
    };
    const onMouseLeave = () => {
      hideTooltip();
      setHoveredNode(null);
      // Reset all nodes to their default color.
      nodesRef.current.forEach(node => {
        node.material.color.copy(node.userData.defaultColor);
      });
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);
    
    // Animation loop
    const animateScene = () => {
      requestAnimationFrame(animateScene);
      orbitControls.update();
      updateEdgePositions();
      renderer.render(scene, camera);
    };
    animateScene();

    // Clean up on unmount
    return () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
      renderer.dispose();
      orbitControls.dispose();
      dragControls.dispose();
    };
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

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => {
      if (tooltipRef.current) {
        document.body.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showGraph && graphData) {
      initThreeJS();
    }
  }, [showGraph, graphData]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>
      
      {/* Fixed menu toggle at right edge with high z-index */}
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-16 right-4 z-50 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        <HamburgerIcon />
      </button>
      {menuOpen && (
        <div className="fixed top-24 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded shadow-lg">
          <Button type="button" onClick={handleGenerateAnswer} variant="default" className="mb-2 w-full">
            Generate Answer
          </Button>
          <Button type="button" onClick={handleDownloadNodes} variant="default" className="w-full">
            Download Conversation Data
          </Button>
        </div>
      )}

      <div className="container mx-auto p-8 relative">
        <h1 className="neon-title text-4xl font-bold mb-8 text-center">
          Welcome to Soulprint
        </h1>
        <Card className="card mb-4">
          <CardHeader className="relative mt-4">
            <CardTitle>Today's topic of conversation: {topic}</CardTitle>
            {/* Moved onMouseEnter/Leave to the outer container */}
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
              <div className="flex flex-col space-y-2 h-auto">  {/* container with dynamic height */}
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
                {/* Adjusted height to reduce blank space and smaller margin for buttons */}
                <div ref={threeContainerRef} id="three-graph-container" style={{ width: '100%', height: '300px' }} />
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
      
      {showGraph && (
        <div className="container mx-auto p-8">
          <Card className="card mt-4">
            <CardContent>
              <div ref={threeContainerRef} id="three-graph-container" style={{ width: '100%', height: '600px' }} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;