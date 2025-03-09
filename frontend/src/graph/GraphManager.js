import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

export const initGraph = ({ container, graphData, darkMode, nodeData }) => {
    if (!container || !graphData) return;

    // Clean up previous renderer if exists
    let renderer = container.__renderer;
    if (renderer) {
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }
    
    // References to nodes and edges for updates
    const nodes = [];
    const edges = [];
    let tooltip = document.getElementById('three-tooltip');

    // Create tooltip if missing
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'three-tooltip';
      tooltip.className =
        'absolute bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-sm z-50 max-w-md';
      tooltip.style.display = 'none';
      tooltip.style.pointerEvents = 'none';
      document.body.appendChild(tooltip);
    }
    
    // Setup scene, camera, renderer
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    const scene = new THREE.Scene();
    const bgColor = darkMode ? 0x0d0d1e : 0xf5f5f5;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 10, 50);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    // Save renderer instance in container so next call can dispose it
    container.__renderer = renderer;

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableRotate = false;
    orbitControls.enablePan = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;

    // Extract node and edge data from graphData
    const nodeTrace = graphData.data.find((item) => item.mode && item.mode.includes('markers'));
    const lineTrace = graphData.data.find((item) => item.mode && item.mode.includes('lines'));

    // Create node meshes
    const nodeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const nodeMeshes = {};
    if (nodeTrace) {
      nodeTrace.x.forEach((x, i) => {
        const y = nodeTrace.y[i];
        const label = nodeTrace.text[i];
        const id = nodeTrace.ids[i];
        const content = nodeData.get(id)
          ? nodeData.get(id).content
          : 'Loading content...';
        const nodeMaterial = new THREE.MeshStandardMaterial({
          color: 0xC0C0C0,
          metalness: 0.8,
          roughness: 0.3,
          emissive: 0x000000,
        });
        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        nodeMesh.userData = { id, label, content, defaultColor: new THREE.Color(0xC0C0C0) };
        nodeMesh.position.set(x * 10, y * 10, 0);
        scene.add(nodeMesh);
        nodes.push(nodeMesh);
        nodeMeshes[id] = nodeMesh;
      });
    }

    // Create text sprites for node titles
    Object.values(nodeMeshes).forEach((node) => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.font = '48px "Inter", sans-serif';
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
      lines.forEach((line) => {
        context.fillText(line, size / 2, yOffset);
        yOffset += lineHeight;
      });
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(0, 1.2, 0);
      sprite.scale.set(6, 6, 1);
      sprite.raycast = () => {};
      sprite.material.depthTest = false;
      sprite.renderOrder = 999;
      node.add(sprite);
    });

    // Create edges connecting nodes
    if (lineTrace) {
      for (let i = 0; i < lineTrace.x.length; i += 3) {
        const x1 = lineTrace.x[i] * 10, y1 = lineTrace.y[i] * 10;
        const x2 = lineTrace.x[i + 1] * 10, y2 = lineTrace.y[i + 1] * 10;
        let startNode = null, endNode = null, minDist1 = Infinity, minDist2 = Infinity;
        Object.values(nodeMeshes).forEach((node) => {
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
            color: 0xff00ff,
            transparent: true,
            opacity: 0.7,
          });
          const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
          lineMesh.userData = { startNode, endNode };
          scene.add(lineMesh);
          edges.push(lineMesh);
        }
      }
    }

    // Setup drag controls and tooltip handling
    const dragControls = new DragControls(nodes, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', () => {
      orbitControls.enabled = false;
      tooltip.style.display = 'none';
    });
    dragControls.addEventListener('drag', (event) => {
      const dragged = event.object;
      dragged.position.z = 0;
      edges.forEach((edge) => {
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
    dragControls.addEventListener('dragend', () => {
      orbitControls.enabled = true;
      setTimeout(resolveCollisions, 200);
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
      edges.forEach((edge) => {
        const start = edge.userData.startNode.position;
        const end = edge.userData.endNode.position;
        edge.geometry.setFromPoints([start, end]);
      });
    };

    // Initial collision resolution before starting the animation loop
    const initialResolveCollisions = () => {
      const collisionDistance = 3.5;
      let iterations = 0;
      let hasCollision = true;
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

    // Mouse hover tooltip implementation
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes, false);

      // Reset all nodes to default silver
      nodes.forEach((node) => {
        node.material.color.copy(node.userData.defaultColor);
      });

      if (intersects.length > 0 && intersects[0].object.userData?.label) {
        const hovered = intersects[0].object;
        // Change color on hover using different colors based on dark mode
        const primaryHoverColor = darkMode ? 0x00ffff : 0x8e44ad;
        hovered.material.color.set(primaryHoverColor);
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX}px`;
        tooltip.style.top = `${event.pageY}px`;
        tooltip.style.color = darkMode ? '#f7fafc' : '#1a202c';
        tooltip.innerHTML = `<strong>${hovered.userData.label}</strong><br/>${hovered.userData.content}`;
      } else {
        tooltip.style.display = 'none';
      }
    };
    const onMouseLeave = () => {
      tooltip.style.display = 'none';
      nodes.forEach((node) => {
        node.material.color.copy(node.userData.defaultColor);
      });
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);

    // Animation loop
    let frameId;
    const animateScene = () => {
      frameId = requestAnimationFrame(animateScene);
      orbitControls.update();
      updateEdgePositions();
      renderer.render(scene, camera);
    };
    animateScene();

    // Clean up callback on unmount
    return () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
      orbitControls.dispose();
      dragControls.dispose();
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
};