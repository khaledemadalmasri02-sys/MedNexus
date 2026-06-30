/* eslint-disable react-hooks/immutability */
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Trail } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Points, PerspectiveCamera } from "three";

const pointer = new THREE.Vector2();
const targetPointer = new THREE.Vector2();

function generateEmberData() {
  const count = 400;
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 1] = -12 + Math.random() * 4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 8;
    vel[i * 3] = (Math.random() - 0.5) * 0.012;
    vel[i * 3 + 1] = 0.02 + Math.random() * 0.04;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.012;
    const pick = Math.random();
    if (pick < 0.3) c.setHSL(0.12, 0.95, 0.6 + Math.random() * 0.2);
    else if (pick < 0.6) c.setHSL(0.06, 0.9, 0.5 + Math.random() * 0.15);
    else if (pick < 0.85) c.setHSL(0.0, 0.85, 0.45 + Math.random() * 0.1);
    else c.setHSL(0.08, 1.0, 0.75);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    siz[i] = 0.03 + Math.random() * 0.08;
  }
  return { positions: pos, velocities: vel, colors: col, sizes: siz };
}

function generateSphereData() {
  const count = 18;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const radius = 3.2 + (i % 6) * 1.3;
    return {
      position: [
        Math.cos(angle) * radius,
        -5.4 + Math.random() * 7,
        -8 - Math.random() * 18,
      ] as [number, number, number],
      scale: 0.35 + Math.random() * 0.65,
      color: i % 3 === 0 ? "#F97316" : i % 3 === 1 ? "#DC2626" : "#7C2D12",
      floatSpeed: 0.3 + Math.random() * 0.4,
      floatOffset: i * 0.7,
      pulseOffset: i * 0.5,
      rotSpeed: 0.05 + Math.random() * 0.1,
    };
  });
}

function generateFloatingEmbers() {
  return Array.from({ length: 30 }, () => ({
    position: [
      (Math.random() - 0.5) * 16,
      -2 + Math.random() * 10,
      -5 - Math.random() * 20,
    ] as [number, number, number],
    scale: 0.08 + Math.random() * 0.15,
    speed: 0.3 + Math.random() * 0.5,
    offset: Math.random() * Math.PI * 2,
    color: Math.random() > 0.5 ? "#FDE68A" : "#F97316",
  }));
}

function generateDistantRocks() {
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 14 + Math.random() * 8;
    return {
      position: [
        Math.cos(angle) * radius,
        -4 + Math.random() * 2,
        -10 - Math.random() * 25,
      ] as [number, number, number],
      scale: [
        0.8 + Math.random() * 1.5,
        0.5 + Math.random() * 1,
        0.8 + Math.random() * 1.2,
      ] as [number, number, number],
      rotation: [
        Math.random() * 0.3,
        Math.random() * Math.PI,
        Math.random() * 0.3,
      ] as [number, number, number],
    };
  });
}

function usePointer() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      targetPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  useFrame(() => {
    pointer.x = THREE.MathUtils.lerp(pointer.x, targetPointer.x, 0.03);
    pointer.y = THREE.MathUtils.lerp(pointer.y, targetPointer.y, 0.03);
  });
  return pointer;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function EmberParticles() {
  const pointsRef = useRef<Points>(null);
  const { positions, velocities, colors, sizes } = useMemo(() => generateEmberData(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const colAttr = pointsRef.current.geometry.attributes.color;
    const sizeAttr = pointsRef.current.geometry.attributes.size;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += velocities[i * 3] + Math.sin(t * 0.5 + i * 0.1) * 0.003;
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2] + Math.cos(t * 0.3 + i * 0.05) * 0.002;
      if (arr[i * 3 + 1] > 8) {
        arr[i * 3] = (Math.random() - 0.5) * 20;
        arr[i * 3 + 1] = -12;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 8;
      }
    }
    posAttr.needsUpdate = true;
    if (sizeAttr) sizeAttr.needsUpdate = true;
    if (colAttr) colAttr.needsUpdate = true;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.9 + Math.sin(t * 2) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors={true}
      />
    </points>
  );
}

function MoltenSpheres() {
  const groupRef = useRef<Group>(null);
  const spheres = useMemo(() => generateSphereData(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.012;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = spheres[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.floatSpeed + cfg.floatOffset) * 0.7;
      mesh.rotation.y = t * cfg.rotSpeed + i;
      mesh.rotation.x = Math.sin(t * 0.3 + i) * 0.2;
      const m = mesh.material;
      if (!m) return;
      const mat = (Array.isArray(m) ? m[0] : m) as THREE.MeshStandardMaterial;
      if (!mat) return;
      mat.emissiveIntensity = 1.8 + Math.sin(t * 0.6 + cfg.pulseOffset) * 0.8;
    });
  });

  return (
    <group ref={groupRef}>
      {spheres.map((s, i) => (
        <mesh key={i} position={s.position} scale={s.scale}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial
            color="#1B0B07"
            emissive={s.color}
            emissiveIntensity={1.8}
            transparent
            opacity={0.75}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloatingEmbers() {
  const groupRef = useRef<Group>(null);
  const embers = useMemo(() => generateFloatingEmbers(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as Mesh;
      const cfg = embers[i];
      if (!cfg) return;
      mesh.position.y = cfg.position[1] + Math.sin(t * cfg.speed + cfg.offset) * 1.5;
      mesh.position.x = cfg.position[0] + Math.sin(t * 0.3 + cfg.offset) * 0.5;
      mesh.rotation.y = t * 0.5 + i;
      mesh.rotation.z = Math.sin(t * 0.4 + i) * 0.3;
    });
  });

  return (
    <group ref={groupRef}>
      {embers.map((e, i) => (
        <Trail key={i} width={0.4} length={8} color={e.color} attenuation={(t) => t * t}>
          <mesh position={e.position} scale={e.scale}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={e.color}
              emissive={e.color}
              emissiveIntensity={3}
              roughness={0.2}
            />
          </mesh>
        </Trail>
      ))}
    </group>
  );
}

function DistantRocks() {
  const rocks = useMemo(() => generateDistantRocks(), []);

  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.position} scale={r.scale} rotation={r.rotation}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#1B0B07"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const ptr = usePointer();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cam = camera as PerspectiveCamera;
    const dollyZ = 22 + Math.cos(t * 0.04) * 2;
    cam.position.z = lerp(cam.position.z, dollyZ, 0.008);
    cam.position.x = lerp(cam.position.x, ptr.x * 0.8, 0.015);
    cam.position.y = lerp(cam.position.y, ptr.y * 0.5 - 0.5, 0.015);
    cam.lookAt(0, -1.5, -8);
  });

  return null;
}

export default function SceneEmber() {
  const groupRef = useRef<Group>(null);
  const ptr = usePointer();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.008;
    groupRef.current.rotation.x = lerp(
      groupRef.current.rotation.x,
      ptr.y * 0.04,
      0.02
    );
    groupRef.current.position.x = lerp(
      groupRef.current.position.x,
      ptr.x * 0.35,
      0.02
    );
  });

  return (
    <>
      <CameraController />

      <ambientLight intensity={0.08} color="#1B0B07" />
      <pointLight position={[0, -1.5, -5]} intensity={15} color="#F97316" distance={25} decay={1.5} />
      <pointLight position={[0, -4, -10]} intensity={8} color="#F59E0B" distance={20} decay={1.5} />
      <pointLight position={[4, 2, -12]} intensity={4} color="#FB7185" distance={15} decay={2} />
      <pointLight position={[-6, 0, -8]} intensity={5} color="#FDE68A" distance={12} decay={2} />
      <pointLight position={[0, 8, 5]} intensity={2} color="#2A130C" distance={30} decay={1} />

      <group ref={groupRef}>
        <EmberParticles />
        <MoltenSpheres />
        <FloatingEmbers />
        <DistantRocks />
      </group>

      <Sparkles
        count={200}
        size={3.5}
        speed={0.25}
        color="#F59E0B"
        opacity={0.4}
        scale={[30, 15, 40]}
      />
      <Sparkles
        count={80}
        size={5}
        speed={0.15}
        color="#FB7185"
        opacity={0.25}
        scale={[25, 12, 35]}
      />

      <fog attach="fog" args={["#130806", 12, 75]} />
    </>
  );
}
