import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface DNAHelixProps {
  scrollProgress: number; // 0 to 1
  totalNodes: number;
}

export default function DNAHelix({ scrollProgress, totalNodes }: DNAHelixProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const glowPath1Ref = useRef<SVGPathElement>(null);
  const glowPath2Ref = useRef<SVGPathElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);
  const nodesRef = useRef<SVGGElement>(null);

  // Generate the DNA helix path data
  const generateHelixPath = (
    amplitude: number,
    frequency: number,
    phaseOffset: number,
    width: number,
    height: number,
    segments: number
  ): string => {
    const points: string[] = [];
    const centerX = width / 2;
    const stepY = height / segments;

    for (let i = 0; i <= segments; i++) {
      const y = i * stepY;
      const angle = (i / segments) * Math.PI * 2 * frequency + phaseOffset;
      const x = centerX + Math.sin(angle) * amplitude;
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }

    return points.join(' ');
  };

  // Generate bridge connections between helix strands
  const generateBridges = (
    amplitude: number,
    frequency: number,
    width: number,
    height: number,
    bridgeCount: number
  ): string[] => {
    const bridges: string[] = [];
    const centerX = width / 2;
    const stepY = height / bridgeCount;

    for (let i = 0; i < bridgeCount; i++) {
      const y = i * stepY + stepY / 2;
      const t = i / bridgeCount;
      const angle = t * Math.PI * 2 * frequency;
      const x1 = centerX + Math.sin(angle) * amplitude;
      const x2 = centerX + Math.sin(angle + Math.PI) * amplitude;
      bridges.push(`M ${x1} ${y} L ${x2} ${y}`);
    }

    return bridges;
  };

  const svgWidth = 400;
  const svgHeight = 5000;
  const amplitude = 80;
  const frequency = 6;
  const segments = 200;

  const path1 = generateHelixPath(amplitude, frequency, 0, svgWidth, svgHeight, segments);
  const path2 = generateHelixPath(amplitude, frequency, Math.PI, svgWidth, svgHeight, segments);
  const bridges = generateBridges(amplitude, frequency, svgWidth, svgHeight, 24);

  // Calculate total path length for progress drawing
  const totalLength = 8000; // approximate

  useEffect(() => {
    if (!path1Ref.current || !path2Ref.current) return;

    // Animate path drawing based on scroll progress
    const drawLength = totalLength * scrollProgress;

    gsap.to([path1Ref.current, path2Ref.current], {
      strokeDashoffset: totalLength - drawLength,
      duration: 0.1,
      ease: 'none',
    });

    gsap.to([glowPath1Ref.current, glowPath2Ref.current], {
      strokeDashoffset: totalLength - drawLength,
      duration: 0.1,
      ease: 'none',
    });

    if (progressPathRef.current) {
      gsap.to(progressPathRef.current, {
        strokeDashoffset: totalLength - drawLength,
        duration: 0.1,
        ease: 'none',
      });
    }

    // Animate nodes
    if (nodesRef.current) {
      const nodes = nodesRef.current.querySelectorAll('.dna-node');
      nodes.forEach((node, index) => {
        const nodeProgress = index / (totalNodes - 1);
        const isActive = Math.abs(scrollProgress - nodeProgress) < 0.08;
        const isPast = scrollProgress > nodeProgress;

        gsap.to(node, {
          opacity: isPast ? 0.4 : isActive ? 1 : 0.2,
          scale: isActive ? 1.3 : isPast ? 0.7 : 0.5,
          duration: 0.4,
          ease: 'power2.out',
        });

        // Glow effect for active node
        const glow = node.querySelector('.node-glow');
        if (glow) {
          gsap.to(glow, {
            opacity: isActive ? 0.8 : 0,
            scale: isActive ? 2 : 0.5,
            duration: 0.4,
          });
        }

        // Ring pulse for active node
        const ring = node.querySelector('.node-ring');
        if (ring) {
          gsap.to(ring, {
            opacity: isActive ? 0.6 : 0,
            scale: isActive ? 1.8 : 1,
            duration: 0.4,
          });
        }
      });
    }
  }, [scrollProgress, totalNodes]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gradient for primary helix strand */}
        <linearGradient id="helixGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="30%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
        </linearGradient>

        {/* Gradient for secondary helix strand */}
        <linearGradient id="helixGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
          <stop offset="30%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Strong glow for active elements */}
        <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Bridge gradient */}
        <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Background glow paths (wider, blurred) */}
      <path
        ref={glowPath1Ref}
        d={path1}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="6"
        strokeLinecap="round"
        filter="url(#strongGlow)"
        opacity="0.15"
        style={{
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength,
        }}
      />
      <path
        ref={glowPath2Ref}
        d={path2}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="6"
        strokeLinecap="round"
        filter="url(#strongGlow)"
        opacity="0.15"
        style={{
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength,
        }}
      />

      {/* Primary helix strands */}
      <path
        ref={path1Ref}
        d={path1}
        fill="none"
        stroke="url(#helixGradient1)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#glowFilter)"
        style={{
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength,
        }}
      />
      <path
        ref={path2Ref}
        d={path2}
        fill="none"
        stroke="url(#helixGradient2)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#glowFilter)"
        style={{
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength,
        }}
      />

      {/* Bridge connections */}
      {bridges.map((bridge, i) => (
        <path
          key={i}
          d={bridge}
          fill="none"
          stroke="url(#bridgeGradient)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity={scrollProgress > i / bridges.length ? 0.4 : 0.05}
          style={{
            transition: 'opacity 0.5s ease',
          }}
        />
      ))}

      {/* Progress indicator path */}
      <path
        ref={progressPathRef}
        d={path1}
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.1"
        style={{
          strokeDasharray: totalLength,
          strokeDashoffset: totalLength,
        }}
      />

      {/* Feature nodes */}
      <g ref={nodesRef}>
        {Array.from({ length: totalNodes }).map((_, i) => {
          const t = i / (totalNodes - 1);
          const y = t * svgHeight;
          const angle = t * Math.PI * 2 * frequency;
          const x = svgWidth / 2 + Math.sin(angle) * amplitude;
          const isLeft = i % 2 === 0;

          return (
            <g
              key={i}
              className="dna-node"
              transform={`translate(${isLeft ? x - 60 : x + 60}, ${y})`}
              style={{ opacity: 0.2 }}
            >
              {/* Node glow */}
              <circle
                className="node-glow"
                r="20"
                fill={isLeft ? '#3B82F6' : '#8B5CF6'}
                opacity="0"
                filter="url(#strongGlow)"
              />

              {/* Node ring */}
              <circle
                className="node-ring"
                r="12"
                fill="none"
                stroke={isLeft ? '#3B82F6' : '#8B5CF6'}
                strokeWidth="1.5"
                opacity="0"
              />

              {/* Node dot */}
              <circle
                r="6"
                fill={isLeft ? '#3B82F6' : '#8B5CF6'}
                filter="url(#glowFilter)"
              />

              {/* Connection line to helix */}
              <line
                x1={isLeft ? 60 : -60}
                y1="0"
                x2="0"
                y2="0"
                stroke={isLeft ? '#3B82F6' : '#8B5CF6'}
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="4 4"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
