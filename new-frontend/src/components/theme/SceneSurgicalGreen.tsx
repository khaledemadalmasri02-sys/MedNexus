import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Points } from "three";
import { ShaderBackground } from "./ShaderBackground";

function generateOrganicBlobs() {
  return Array.from({ length: 8 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 6,
      -6 - Math.random() * 8,
    ] as [number, number, number],
    scale: 0.8 + Math.random() * 1.2,
    color: i % 2 === 0 ? "#0F766E" : "#15803D",
    speed: 0.15 + Math.random() * 0.2,
    offset: Math.random() * Math.PI * 2,
  }));
}

function generateSoftGlowOrbs() {
  return Array.from({ length: 6 }, (_, i) => ({
    position: [
      Math.cos(i / 6 * Math.PI * 2) * 4,
      Math.sin(i * 0.7) * 2,
      -10 - Math.random() * 4,
    ] as [number, number, number],
    scale: 0.2 + Math.random() * 0.3,
    color: i % 2 === 0 ? "#0F766E" : "#0369A1",
    speed: 0.2 + Math.random() * 0.3,
    offset: Math.random() * Math.PI * 2,
  }));
}

function generateFlowingParticles() {
  const count = 100;
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = -4 - Math.random() * 16;
    vel[i] = 0.01 + Math.random() * 0.02;
  }
  return { positions: pos, velocities: vel };
}

function OrganicBlobs() {
  const groupRef = useRef<Group>(null);
  const blobs = useMemo(() => generateOrganicBlobs(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = blobs[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 0.6;
      const breathe = 1 + Math.sin(t * 0.3 + i) * 0.05;
      mesh.scale.setScalar(cfg.scale * breathe);
    });
  });

  return (
    <group ref={groupRef}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.position}>
          <sphereGeometry args={[b.scale, 20, 20]} />
          <MeshDistortMaterial color="#F0FDF4" emissive={b.color} emissiveIntensity={0.2} transparent opacity={0.06} distort={0.3} speed={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FlowingParticles() {
  const pointsRef = useRef<Points>(null);
  const { positions, velocities } = useMemo(() => generateFlowingParticles(), []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 1] += velocities[i];
      if (arr[i * 3 + 1] > 8) {
        arr[i * 3 + 1] = -8;
        arr[i * 3] = (Math.random() - 0.5) * 20;
        arr[i * 3 + 2] = -4 - Math.random() * 16;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#15803D" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function SoftGlow() {
  const groupRef = useRef<Group>(null);
  const orbs = useMemo(() => generateSoftGlowOrbs(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.01;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = orbs[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 0.5;
      const pulse = 1 + Math.sin(t * 0.4 + i) * 0.12;
      mesh.scale.setScalar(cfg.scale * pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((o, i) => (
        <Float key={i} speed={o.speed} floatIntensity={0.15}>
          <mesh position={o.position}>
            <icosahedronGeometry args={[o.scale, 1]} />
            <meshStandardMaterial color="#FFFFFF" emissive={o.color} emissiveIntensity={0.5} transparent opacity={0.1} roughness={0.3} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function MeshDistortMaterial(props: { color: string; emissive: string; emissiveIntensity: number; transparent: boolean; opacity: number; distort: number; speed: number; roughness: number }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.emissiveIntensity = props.emissiveIntensity + Math.sin(state.clock.elapsedTime * props.speed) * 0.1;
    }
  });
  return <meshStandardMaterial ref={ref} color={props.color} emissive={props.emissive} emissiveIntensity={props.emissiveIntensity} transparent={props.transparent} opacity={props.opacity} roughness={props.roughness} />;
}

export default function SceneSurgicalGreen() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.006;
  });

  return (
    <>
      <ShaderBackground themeId="surgical-green" />

      <ambientLight intensity={0.65} color="#F0FDF4" />
      <pointLight position={[0, 5, 5]} intensity={1.2} color="#0F766E" distance={25} />
      <pointLight position={[-4, -2, -8]} intensity={0.6} color="#15803D" distance={18} />

      <group ref={groupRef}>
        <OrganicBlobs />
        <FlowingParticles />
        <SoftGlow />
      </group>
    </>
  );
}
