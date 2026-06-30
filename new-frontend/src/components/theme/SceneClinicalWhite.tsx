import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Points } from "three";
import { ShaderBackground } from "./ShaderBackground";

function generateFloatingCells() {
  return Array.from({ length: 12 }, (_, i) => ({
    position: [
      Math.cos(i / 12 * Math.PI * 2) * (3 + Math.random() * 5),
      Math.sin(i * 0.8) * 2,
      -4 - Math.random() * 10,
    ] as [number, number, number],
    scale: 0.3 + Math.random() * 0.5,
    color: i % 2 === 0 ? "#0EA5E9" : "#10B981",
    speed: 0.2 + Math.random() * 0.3,
    offset: Math.random() * Math.PI * 2,
  }));
}

function generateMicroParticles() {
  const count = 80;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 25;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = -3 - Math.random() * 20;
  }
  return { positions: pos };
}

function DNAHelix() {
  const groupRef = useRef<Group>(null);

  const points = useMemo(() => {
    const count = 40;
    const left: [number, number, number][] = [];
    const right: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 4;
      const y = (i / count) * 10 - 5;
      left.push([Math.cos(t) * 1.2, y, Math.sin(t) * 1.2 - 8]);
      right.push([Math.cos(t + Math.PI) * 1.2, y, Math.sin(t + Math.PI) * 1.2 - 8]);
    }
    return { left, right };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.6 + i * 0.2) * 0.1;
      mesh.scale.setScalar(pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {points.left.map((pos, i) => (
        <mesh key={`l-${i}`} position={pos}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#0EA5E9" emissive="#0EA5E9" emissiveIntensity={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
      {points.right.map((pos, i) => (
        <mesh key={`r-${i}`} position={pos}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.8} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingCells() {
  const groupRef = useRef<Group>(null);
  const cells = useMemo(() => generateFloatingCells(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.012;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = cells[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 0.4;
      mesh.rotation.y = t * 0.02 + i;
    });
  });

  return (
    <group ref={groupRef}>
      {cells.map((c, i) => (
        <Float key={i} speed={c.speed} floatIntensity={0.1}>
          <mesh position={c.position}>
            <icosahedronGeometry args={[c.scale, 1]} />
            <meshStandardMaterial color="#FFFFFF" emissive={c.color} emissiveIntensity={0.3} transparent opacity={0.08} roughness={0.4} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function MicroParticles() {
  const pointsRef = useRef<Points>(null);
  const { positions } = useMemo(() => generateMicroParticles(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    (pointsRef.current.material as THREE.PointsMaterial).size = 0.04 + Math.sin(t * 0.3) * 0.008;
    pointsRef.current.rotation.y = t * 0.003;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#0EA5E9" transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function SceneClinicalWhite() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.008;
  });

  return (
    <>
      <ShaderBackground themeId="clinical-white" />

      <ambientLight intensity={0.7} color="#F8FAFC" />
      <pointLight position={[0, 5, 5]} intensity={1.5} color="#0EA5E9" distance={25} />
      <pointLight position={[-5, -3, -8]} intensity={0.8} color="#10B981" distance={20} />

      <group ref={groupRef}>
        <FloatingCells />
        <DNAHelix />
        <MicroParticles />
      </group>
    </>
  );
}
