import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// Update the NeonShaderMaterial definition
const NeonShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    glowColor: { value: new THREE.Color(0x00ffff) },
    pulseIntensity: { value: 5.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 glowColor;
    uniform float pulseIntensity;
    varying vec2 vUv;
    void main() {
      // Increased frequency and amplitude for a more noticeable pulse effect
      float glow = (sin(time * 3.0) * 0.5 + 0.5) * pulseIntensity;
      vec3 color = glowColor * (1.0 + glow);
      gl_FragColor = vec4(color, 0.7);
    }
  `
};

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
    orbitControls.enablePan = true;
    orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;
    orbitControls.panSpeed = 0.8; // Adjust pan sensitivity

    // Setup post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,  // bloom strength
      0.4,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);

    // Extract node and edge data from graphData
    const nodeTrace = graphData.data.find((item) => item.mode && item.mode.includes('markers'));
    const lineTrace = graphData.data.find((item) => item.mode && item.mode.includes('lines'));

    // Create node meshes
    const nodeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const nodeMeshes = {};
    const createNodeMaterial = (color) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        emissive: color,
        emissiveIntensity: 0.2
      });
      return material;
    };
    if (nodeTrace) {
      nodeTrace.x.forEach((x, i) => {
        const y = nodeTrace.y[i];
        const label = nodeTrace.text[i];
        const id = nodeTrace.ids[i];
        const content = nodeData.get(id)
          ? nodeData.get(id).content
          : 'Loading content...';
        
        // Create single node with glow effect built in
        const nodeMaterial = createNodeMaterial(0xC0C0C0);
        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        nodeMesh.userData = { id, label, content, defaultColor: new THREE.Color(0xC0C0C0) };
        nodeMesh.position.set(x * 10, y * 10, 0);
        
        // Add glow as a child mesh with slightly larger geometry
        const glowGeometry = new THREE.SphereGeometry(0.7, 32, 32);
        const glowMaterial = new THREE.ShaderMaterial({
          ...NeonShaderMaterial,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          uniforms: {
            ...NeonShaderMaterial.uniforms,
            pulseIntensity: { value: 0.0 } // Initially no pulsing
          }
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.renderOrder = -1; // Render behind the parent node
        glowMesh.raycast = () => {};
        nodeMesh.add(glowMesh);

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
    const createEdgeMaterial = () => {
      return new THREE.ShaderMaterial({
        ...NeonShaderMaterial,
        transparent: true,
        uniforms: {
          ...NeonShaderMaterial.uniforms,
          glowColor: { value: new THREE.Color(0x008080) }, // Set to dark cyan
          pulseIntensity: { value: 0.0 }  // Initially no pulsing
        }
      });
    };
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
          const lineMaterial = createEdgeMaterial();
          const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
          lineMesh.userData = { startNode, endNode };
          scene.add(lineMesh);
          edges.push(lineMesh);
        }
      }
    }

    // Setup drag controls and tooltip handling
    const allDraggableObjects = [...nodes];
    nodes.forEach(node => {
      // Add all child meshes (glow and sprite) to draggable objects
      node.children.forEach(child => {
        allDraggableObjects.push(child);
      });
    });

    // Only allow parent node meshes to be draggable
    const dragControls = new DragControls(nodes, camera, renderer.domElement);

    dragControls.addEventListener('dragstart', (event) => {
      orbitControls.enabled = false;
      tooltip.style.display = 'none';
      
      // If dragging a child mesh, switch to dragging the parent node
      const draggedObject = event.object;
      if (draggedObject.parent && nodes.includes(draggedObject.parent)) {
        dragControls.transformGroup = true;
        event.object = draggedObject.parent;
      }
      
      // Store original position for potential collision resolution
      event.object.userData.dragStartPosition = event.object.position.clone();
    });

    dragControls.addEventListener('drag', (event) => {
      const dragged = event.object;
      dragged.position.z = 0; // Keep node in plane
      
      // Update connected edges
      edges.forEach((edge) => {
        if (edge.userData.startNode === dragged || edge.userData.endNode === dragged) {
          edge.geometry.setFromPoints([
            edge.userData.startNode.position,
            edge.userData.endNode.position
          ]);
          edge.geometry.attributes.position.needsUpdate = true;
        }
      });
    });

    dragControls.addEventListener('dragend', () => {
      orbitControls.enabled = true;
      dragControls.transformGroup = false;
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

      // Reset all nodes to their default state
      nodes.forEach((node) => {
        node.material.color.copy(node.userData.defaultColor);
        node.scale.setScalar(1.0);
        if (node.children[0].material.uniforms) {
          node.children[0].material.uniforms.pulseIntensity.value = 0.0; // No pulsing by default
        }
      });

      // Reset all edges to their default state: no pulsing and dark cyan color
      edges.forEach(edge => {
        edge.material.uniforms.pulseIntensity.value = 0.0;
        edge.material.uniforms.glowColor.value.set(0x008080); // dark cyan
      });

      if (intersects.length > 0 && intersects[0].object.userData?.label) {
        const hovered = intersects[0].object;
        const primaryHoverColor = 0x00ffff; // neon cyan
        hovered.material.color.set(primaryHoverColor);
        // Increase glow intensity for hovered node
        if (hovered.children[0].material.uniforms) {
          hovered.children[0].material.uniforms.pulseIntensity.value = 2.0; // Adjust as needed
        }
        // Enhance connected edges with pronounced pulsing glow and update adjacent nodes
        edges.forEach(edge => {
          if (edge.userData.startNode === hovered || edge.userData.endNode === hovered) {
            edge.material.uniforms.pulseIntensity.value = 2.5; // Adjust as needed
            edge.material.uniforms.glowColor.value.set(primaryHoverColor);
            // Determine the adjacent node
            const adjacent = edge.userData.startNode === hovered ? edge.userData.endNode : edge.userData.startNode;
            if (adjacent) {
              adjacent.material.color.set(primaryHoverColor);
              if (adjacent.children[0].material.uniforms) {
                adjacent.children[0].material.uniforms.pulseIntensity.value = 2.0; // Same intensity as hovered
              }
            }
          }
        });
      }
    };
    const onMouseLeave = () => {
      tooltip.style.display = 'none';
      // Reset nodes
      nodes.forEach((node) => {
        node.material.color.copy(node.userData.defaultColor);
        if (node.children[0].material.uniforms) {
          node.children[0].material.uniforms.pulseIntensity.value = 0.0; // No pulsing by default
        }
      });
      // Reset edges to default appearance: no pulsing and dark cyan color
      edges.forEach(edge => {
        edge.material.uniforms.pulseIntensity.value = 0.0;
        edge.material.uniforms.glowColor.value.set(0x008080);
      });
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);

    // Animation loop
    const clock = new THREE.Clock();
    let frameId;
    const animateScene = () => {
      frameId = requestAnimationFrame(animateScene);
      const time = clock.getElapsedTime();

      // Update shader uniforms
      edges.forEach(edge => {
        edge.material.uniforms.time.value = time;
      });
      nodes.forEach(node => {
        if (node.children[0].material.uniforms) {
          node.children[0].material.uniforms.time.value = time;
        }
      });

      orbitControls.update();
      updateEdgePositions();
      composer.render();
    };
    animateScene();

    // Clean up callback on unmount
    return () => {
      // Reset node positions
      nodes.forEach(node => {
        if (node.userData.originalPosition) {
          node.position.copy(node.userData.originalPosition);
        }
      });

      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
      orbitControls.dispose();
      dragControls.dispose();
      cancelAnimationFrame(frameId);
      renderer.dispose();
      composer.dispose();
      // Clean up tooltip if it exists
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };
};