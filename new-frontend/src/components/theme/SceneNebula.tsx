/* eslint-disable react-hooks/immutability */
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, Group, Points, PerspectiveCamera } from "three";

/* ─── pointer tracking (shared) ─── */
const pointer = new THREE.Vector2();
const targetPointer = new THREE.Vector2();

function generateNebulaClouds() {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 10;
    return {
      position: [
        Math.cos(angle) * radius,
        Math.random() * 9 - 4,
        -12 - Math.random() * 28,
      ] as [number, number, number],
      scale: [
        2.2 + Math.random() * 3.4,
        1.1 + Math.random() * 2.2,
        1.0,
      ] as [number, number, number],
      rotation: [
        Math.PI / 2 + Math.random() * 0.4,
        0,
        Math.random() * Math.PI,
      ] as [number, number, number],
      driftSpeed: 0.15 + Math.random() * 0.25,
      breatheSpeed: 0.2 + Math.random() * 0.3,
      breatheAmount: 0.1 + Math.random() * 0.1,
      hue: i % 3 === 0 ? "#8B5CF6" : "#38BDF8",
    };
  });
}

function generateFloatingOrbs() {
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const radius = 3.2 + (i % 6) * 1.35;
    return {
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle * 1.7) * 1.8,
        -8 - (i % 5) * 3.2,
      ] as [number, number, number],
      scale: 0.7 + (i % 4) * 0.22 + Math.random() * 0.35,
      color: i % 2 === 0 ? "#38BDF8" : "#8B5CF6",
      floatSpeed: 0.5 + Math.random() * 1.0,
      floatOffset: Math.random() * Math.PI * 2,
    };
  });
}

function generateStarField() {
  const count = 200;
  const pos = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 30;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    sz[i] = 0.03 + Math.random() * 0.12;
  }
  return { positions: pos, sizes: sz };
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

/* ─── lerp helper ─── */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ═══════════════════════════════════════
   MODEL 1: Nebula Core
   ═══════════════════════════════════════ */
function NebulaCore() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Breathing scale
    const breathe = 1 + Math.sin(t * 0.4) * 0.08 + Math.sin(t * 0.17) * 0.04;
    meshRef.current.scale.setScalar(breathe);

    // Slow rotation
    meshRef.current.rotation.y = t * 0.05;
    meshRef.current.rotation.x = Math.sin(t * 0.03) * 0.1;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
      <mesh ref={meshRef} position={[0, 0, -3.5]}>
        <icosahedronGeometry args={[1.8, 4]} />
        <MeshDistortMaterial
          color="#1E3A5F"
          emissive="#38BDF8"
          emissiveIntensity={2.5}
          roughness={0.25}
          metalness={0.0}
          transparent
          opacity={0.85}
          distort={0.35}
          speed={1.5}
        />
      </mesh>
    </Float>
  );
}

/* ═══════════════════════════════════════
   MODEL 2: Energy Rings (4 rings)
   ═══════════════════════════════════════ */
function EnergyRings() {
  const groupRef = useRef<Group>(null);

  const rings = useMemo(
    () => [
      { radius: 4.6, color: "#38BDF8", rotOffset: 0, speed: -0.03, tilt: [82, 0, 0] },
      { radius: 6.15, color: "#8B5CF6", rotOffset: 45, speed: 0.05, tilt: [82, 0, 45] },
      { radius: 7.7, color: "#38BDF8", rotOffset: 90, speed: -0.04, tilt: [82, 0, 90] },
      { radius: 9.25, color: "#22D3EE", rotOffset: 135, speed: 0.06, tilt: [82, 0, 135] },
    ],
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const ring = child as Mesh;
      const cfg = rings[i];
      if (!cfg) return;
      const baseZ = ((cfg.rotOffset * Math.PI) / 180);
      ring.rotation.z = baseZ + t * cfg.speed;

      // Pulsing emission
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 3 + Math.sin(t * 0.5 + i * 1.5) * 1.5;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -3.5]}>
      {rings.map((r, i) => (
        <mesh
          key={i}
          rotation={[(r.tilt[0] * Math.PI) / 180, (r.tilt[1] * Math.PI) / 180, (r.tilt[2] * Math.PI) / 180]}
        >
          <torusGeometry args={[r.radius, 0.012, 8, 180]} />
          <meshStandardMaterial
            color={r.color}
            emissive={r.color}
            emissiveIntensity={3}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════
   MODEL 3: Nebula Clouds (11 volumetric clouds)
   ═══════════════════════════════════════ */
function NebulaClouds() {
  const groupRef = useRef<Group>(null);
  const clouds = useMemo(() => generateNebulaClouds(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const cloud = child as Mesh;
      const cfg = clouds[i];
      if (!cfg) return;

      // Drift
      cloud.position.z = cfg.position[2] + t * cfg.driftSpeed * 0.1;
      if (cloud.position.z > 5) cloud.position.z = cfg.position[2];

      // Breathing
      const s = cfg.scale;
      const breathe = 1 + Math.sin(t * cfg.breatheSpeed) * cfg.breatheAmount;
      cloud.scale.set(s[0] * breathe, s[1] * breathe, s[2] * breathe);
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.position} rotation={c.rotation} scale={c.scale}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            color="#0A1628"
            emissive={c.hue}
            emissiveIntensity={0.8}
            transparent
            opacity={0.06}
            roughness={0.9}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════
   MODEL 4: Floating Orbs (18 orbs)
   ═══════════════════════════════════════ */
function FloatingOrbs() {
  const groupRef = useRef<Group>(null);
  const orbs = useMemo(() => generateFloatingOrbs(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Parent orbital rotation
    groupRef.current.rotation.y = t * 0.008;

    // Individual float
    groupRef.current.children.forEach((child, i) => {
      const orb = child as Mesh;
      const cfg = orbs[i];
      if (!cfg) return;
      orb.position.y = cfg.position[1] + Math.sin(t * cfg.floatSpeed + cfg.floatOffset) * 0.5;
      const pulse = 1 + Math.sin(t * 0.3 + i) * 0.1;
      orb.scale.setScalar(cfg.scale * pulse);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((o, i) => (
        <Float key={i} speed={o.floatSpeed} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={o.position}>
            <icosahedronGeometry args={[o.scale, 2]} />
            <meshStandardMaterial
              color="#1E3A5F"
              emissive={o.color}
              emissiveIntensity={1.5}
              transparent
              opacity={0.15}
              roughness={0.28}
              metalness={0.05}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════
   MODEL 5: Star Field
   ═══════════════════════════════════════ */
function StarField() {
  const pointsRef = useRef<Points>(null);
  const { positions, sizes } = useMemo(() => generateStarField(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = 0.08 + Math.sin(t * 0.2) * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#FFFFFF"
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════
   Camera Controller (orbit + parallax + dolly)
   ═══════════════════════════════════════ */
function CameraController() {
  const { camera } = useThree();
  const ptr = usePointer();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cam = camera as PerspectiveCamera;

    // Subtle dolly: 22 → 20 → 22 over ~24s
    const dollyZ = 21 + Math.cos(t * 0.05) * 1;
    cam.position.z = lerp(cam.position.z, dollyZ, 0.01);

    // Mouse parallax on camera
    cam.position.x = lerp(cam.position.x, ptr.x * 0.65, 0.02);
    cam.position.y = lerp(cam.position.y, ptr.y * 0.35, 0.02);
  });

  return null;
}

/* ═══════════════════════════════════════
   Main Scene Export
   ═══════════════════════════════════════ */
export default function SceneNebula() {
  const groupRef = useRef<Group>(null);
  const ptr = usePointer();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow auto-rotation
    groupRef.current.rotation.y = t * 0.016;

    // Mouse parallax on group
    groupRef.current.rotation.x = lerp(
      groupRef.current.rotation.x,
      ptr.y * 0.07,
      0.03
    );
    groupRef.current.position.x = lerp(
      groupRef.current.position.x,
      ptr.x * 0.55,
      0.025
    );
  });

  return (
    <>
      <CameraController />

      {/* Lighting — matches Blender spec */}
      <ambientLight intensity={0.12} color="#0A1628" />
      <pointLight position={[0, 0, 0]} intensity={3} color="#38BDF8" distance={20} />
      <pointLight position={[3, 2, -8]} intensity={1.5} color="#8B5CF6" distance={15} />
      <pointLight position={[-4, -1, -12]} intensity={1} color="#22D3EE" distance={12} />
      <directionalLight position={[0, 10, 10]} intensity={0.15} color="#1E293B" />
      <spotLight
        position={[0, 5, -15]}
        intensity={1.5}
        color="#38BDF8"
        angle={0.785}
        penumbra={0.3}
      />

      <group ref={groupRef}>
        <NebulaCore />
        <EnergyRings />
        <NebulaClouds />
        <FloatingOrbs />
      </group>

      <StarField />

      <Sparkles
        count={130}
        size={4.2}
        speed={0.22}
        color="#38BDF8"
        opacity={0.5}
      />

      {/* Fog matching theme.bgDeep #080B1F */}
      <fog attach="fog" args={["#080B1F", 16, 96]} />
    </>
  );
}
