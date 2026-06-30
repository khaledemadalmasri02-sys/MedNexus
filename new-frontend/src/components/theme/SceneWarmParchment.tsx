import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Points } from "three";
import { ShaderBackground } from "./ShaderBackground";

function generateDustData() {
  const count = 120;
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 25;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = -3 - Math.random() * 22;
    vel[i] = 0.005 + Math.random() * 0.015;
  }
  return { positions: pos, velocities: vel };
}

function generateWarmOrbs() {
  return Array.from({ length: 10 }, (_, i) => ({
    position: [
      Math.cos(i / 10 * Math.PI * 2) * (3 + Math.random() * 4),
      Math.sin(i * 0.9) * 2.5,
      -5 - Math.random() * 10,
    ] as [number, number, number],
    scale: 0.4 + Math.random() * 0.6,
    color: i % 3 === 0 ? "#B45309" : i % 3 === 1 ? "#92400E" : "#7C2D12",
    speed: 0.15 + Math.random() * 0.25,
    offset: Math.random() * Math.PI * 2,
  }));
}

function generateLightRays() {
  return Array.from({ length: 5 }, (_, i) => ({
    position: [
      (i - 2) * 4 + (Math.random() - 0.5) * 2,
      6 + Math.random() * 3,
      -12 - Math.random() * 6,
    ] as [number, number, number],
    scale: [0.3 + Math.random() * 0.4, 8 + Math.random() * 4, 1] as [number, number, number],
    opacity: 0.02 + Math.random() * 0.03,
    rotation: (Math.random() - 0.5) * 0.2,
  }));
}

function FloatingDust() {
  const pointsRef = useRef<Points>(null);
  const { positions, velocities } = useMemo(() => generateDustData(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 1] += velocities[i];
      arr[i * 3] += Math.sin(t * 0.2 + i * 0.1) * 0.003;
      if (arr[i * 3 + 1] > 10) {
        arr[i * 3 + 1] = -10;
        arr[i * 3] = (Math.random() - 0.5) * 25;
        arr[i * 3 + 2] = -3 - Math.random() * 22;
      }
    }
    posAttr.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).size = 0.03 + Math.sin(t * 0.2) * 0.005;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#B45309" transparent opacity={0.25} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function WarmOrbs() {
  const groupRef = useRef<Group>(null);
  const orbs = useMemo(() => generateWarmOrbs(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.008;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = orbs[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 0.5;
      const breathe = 1 + Math.sin(t * 0.25 + i) * 0.06;
      mesh.scale.setScalar(cfg.scale * breathe);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((o, i) => (
        <Float key={i} speed={o.speed} floatIntensity={0.12}>
          <mesh position={o.position}>
            <sphereGeometry args={[o.scale, 16, 16]} />
            <meshStandardMaterial color="#FFFDF9" emissive={o.color} emissiveIntensity={0.25} transparent opacity={0.07} roughness={0.6} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function LightRays() {
  const groupRef = useRef<Group>(null);
  const rays = useMemo(() => generateLightRays(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = rays[i].opacity + Math.sin(t * 0.15 + i) * 0.01;
    });
  });

  return (
    <group ref={groupRef}>
      {rays.map((r, i) => (
        <mesh key={i} position={r.position} scale={r.scale} rotation={[0, 0, r.rotation]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#B45309" emissive="#B45309" emissiveIntensity={0.3} transparent opacity={r.opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function SceneWarmParchment() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.005;
  });

  return (
    <>
      <ShaderBackground themeId="warm-parchment" />

      <ambientLight intensity={0.75} color="#FAF7F2" />
      <pointLight position={[0, 6, 4]} intensity={1.0} color="#B45309" distance={22} />
      <pointLight position={[-4, -2, -6]} intensity={0.5} color="#92400E" distance={16} />

      <group ref={groupRef}>
        <FloatingDust />
        <WarmOrbs />
        <LightRays />
      </group>
    </>
  );
}
