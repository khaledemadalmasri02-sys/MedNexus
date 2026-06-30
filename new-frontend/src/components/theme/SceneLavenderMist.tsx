import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import type { Group, Mesh, Points } from "three";
import { ShaderBackground } from "./ShaderBackground";

function generateSoftOrbs() {
  return Array.from({ length: 14 }, (_, i) => ({
    position: [
      Math.cos(i / 14 * Math.PI * 2) * (2.5 + Math.random() * 5),
      Math.sin(i * 0.7) * 2,
      -4 - Math.random() * 12,
    ] as [number, number, number],
    scale: 0.3 + Math.random() * 0.7,
    color: i % 3 === 0 ? "#7C3AED" : i % 3 === 1 ? "#6D28D9" : "#4F46E5",
    speed: 0.2 + Math.random() * 0.3,
    offset: Math.random() * Math.PI * 2,
  }));
}

function generateMistParticles() {
  const count = 60;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = -6 - Math.random() * 14;
  }
  return { positions: pos };
}

function generateCloudData() {
  return Array.from({ length: 6 }, () => ({
    position: [
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 8,
      -8 - Math.random() * 10,
    ] as [number, number, number],
    scale: [2 + Math.random() * 3, 0.8 + Math.random() * 1.2, 1] as [number, number, number],
    speed: 0.05 + Math.random() * 0.1,
  }));
}

function SoftOrbs() {
  const groupRef = useRef<Group>(null);
  const orbs = useMemo(() => generateSoftOrbs(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.01;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = orbs[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 0.5;
      const pulse = 1 + Math.sin(t * 0.35 + i) * 0.08;
      mesh.scale.setScalar(cfg.scale * pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((o, i) => (
        <Float key={i} speed={o.speed} floatIntensity={0.12}>
          <mesh position={o.position}>
            <sphereGeometry args={[o.scale, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" emissive={o.color} emissiveIntensity={0.3} transparent opacity={0.06} roughness={0.4} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function GentleWaves() {
  const pointsRef = useRef<Points>(null);
  const { positions } = useMemo(() => generateMistParticles(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + arr[i * 3] * 0.1) * 0.008;
      arr[i * 3] += Math.cos(t * 0.2 + arr[i * 3 + 2] * 0.1) * 0.005;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#7C3AED" transparent opacity={0.3} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function MistClouds() {
  const groupRef = useRef<Group>(null);
  const clouds = useMemo(() => generateCloudData(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      mesh.position.x = clouds[i].position[0] + Math.sin(t * clouds[i].speed + i) * 2;
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.position} scale={c.scale}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#EDE9FE" emissive="#7C3AED" emissiveIntensity={0.15} transparent opacity={0.04} roughness={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function SceneLavenderMist() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.007;
  });

  return (
    <>
      <ShaderBackground themeId="lavender-mist" />

      <ambientLight intensity={0.7} color="#F5F3FF" />
      <pointLight position={[0, 5, 5]} intensity={1.2} color="#7C3AED" distance={24} />
      <pointLight position={[-5, -3, -8]} intensity={0.6} color="#6D28D9" distance={18} />
      <pointLight position={[4, 2, -10]} intensity={0.4} color="#4F46E5" distance={16} />

      <group ref={groupRef}>
        <SoftOrbs />
        <GentleWaves />
        <MistClouds />
      </group>

      <Sparkles count={50} size={2} speed={0.1} color="#7C3AED" opacity={0.2} scale={[20, 12, 25]} />
    </>
  );
}
