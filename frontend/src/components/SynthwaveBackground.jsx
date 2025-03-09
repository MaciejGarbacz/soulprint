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
    
    // Sun properties
    const sunGradient = {
      y: canvas.height * 0.5,
      size: canvas.width * 0.15
    };

    // Particle system
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 1 + 0.5,
      color: `hsl(${Math.random() * 60 + 280}, 100%, 70%)`
    }));

    // Mountains
    const mountains = [
      { height: 0.5, color: '#2d0a4e' },
      { height: 0.3, color: '#4c0c8c' },
      { height: 0.2, color: '#6a0fb2' }
    ];

    const drawMountains = (height, color) => {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      // Create jagged mountain effect
      for (let x = 0; x <= canvas.width; x += 50) {
        const y = canvas.height - (Math.sin(x * 0.01) + 1) * canvas.height * height;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.fill();
    };

    const draw = () => {
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create sunset gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#000033');
      gradient.addColorStop(0.5, '#4a0072');
      gradient.addColorStop(1, '#ff007f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw sun
      const sunY = sunGradient.y + Math.sin(offset * 0.05) * 20;
      const sunX = canvas.width / 2;
      const sunRadius = sunGradient.size;
      const sunGradientFill = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
      sunGradientFill.addColorStop(0, 'rgba(255, 255, 0, 1)');
      sunGradientFill.addColorStop(1, 'rgba(255, 69, 0, 0)');
      ctx.fillStyle = sunGradientFill;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

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

      // Draw mountains
      mountains.forEach(mountain => drawMountains(mountain.height, mountain.color));

      // Update and draw particles
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.fillStyle = particle.color;
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