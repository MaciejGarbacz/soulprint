import React, { useEffect, useRef } from 'react';

const SynthwaveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Grid properties
    const gridSpacing = 50;
    let offset = 0;
    
    // Particle system
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 1 + 0.5
    }));

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(41, 0, 102, 0.9)');
      gradient.addColorStop(0.5, 'rgba(103, 0, 139, 0.8)');
      gradient.addColorStop(1, 'rgba(184, 0, 208, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }

      // Horizontal lines with perspective effect
      for (let y = offset; y < canvas.height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Update and draw particles
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.size / 3})`;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.y -= particle.speed;
        if (particle.y < 0) {
          particle.y = canvas.height;
          particle.x = Math.random() * canvas.width;
        }
      });

      // Animate grid
      offset = (offset + 0.5) % gridSpacing;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default SynthwaveBackground;