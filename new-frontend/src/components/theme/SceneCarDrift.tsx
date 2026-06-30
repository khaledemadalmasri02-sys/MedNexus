/* eslint-disable react-hooks/immutability */
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Points, PerspectiveCamera } from "three";

const pointer = new THREE.Vector2();
const targetPointer = new THREE.Vector2();

function generateTireSmokePositions() {
  const count = 120;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 1] = Math.random() * 4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 10;
  }
  return { positions: pos };
}

function generateSpeedLinePositions() {
  const count = 60;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 10;
    pos[i * 3 + 2] = -25 - Math.random() * 35;
  }
  return pos;
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

const CELL_RAW = 9.99;
const ORIENT_DEG: Record<number, number> = { 0: 0, 10: 180, 16: 90, 22: 270 };

const TRACK_CELLS: [number, number, string, number][] = [
  [-3, -3, "track-corner", 16],
  [-2, -3, "track-straight", 22],
  [-1, -3, "track-straight", 22],
  [0, -3, "track-corner", 0],
  [-3, -2, "track-straight", 0],
  [0, -2, "track-straight", 0],
  [-3, -1, "track-corner", 10],
  [-2, -1, "track-corner", 0],
  [0, -1, "track-straight", 0],
  [-2, 0, "track-straight", 10],
  [0, 0, "track-finish", 0],
  [-2, 1, "track-straight", 10],
  [0, 1, "track-straight", 0],
  [-2, 2, "track-corner", 10],
  [-1, 2, "track-straight", 16],
  [0, 2, "track-corner", 22],
];

const ASSET_BASE = "/racing-assets/";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function TrackPiece({ url, position, rotation }: { url: string; position: [number, number, number]; rotation: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} />;
}

function RacingTrack() {
  const trackPieces = useMemo(() => {
    return TRACK_CELLS.map(([gx, gz, key, orient]) => ({
      key: `${gx}-${gz}-${key}`,
      url: `${ASSET_BASE}${key}.glb`,
      position: [(gx + 0.5) * CELL_RAW * 0.6, -2, (gz + 0.5) * CELL_RAW * 0.6] as [number, number, number],
      rotation: THREE.MathUtils.degToRad(ORIENT_DEG[orient] ?? 0),
    }));
  }, []);

  return (
    <group>
      {trackPieces.map((piece) => (
        <TrackPiece key={piece.key} url={piece.url} position={piece.position} rotation={piece.rotation} />
      ))}
    </group>
  );
}

function DriftCar() {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(`${ASSET_BASE}vehicle-truck-yellow.glb`);

  const car = useMemo(() => {
    const clone = scene.clone();
    clone.scale.setScalar(0.4);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set(0xf59e0b);
          mat.roughness = 0.4;
          mat.metalness = 0.6;
        }
      }
    });
    return clone;
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    const speed = 0.4;
    const driftAngle = Math.sin(t * 0.4) * 0.5;
    const circularX = Math.sin(t * speed) * 5;
    const circularZ = Math.cos(t * speed) * 5;

    groupRef.current.position.x = circularX;
    groupRef.current.position.z = circularZ - 10;
    groupRef.current.position.y = 0.2;

    const targetRotation = -t * speed + Math.PI / 2;
    groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, targetRotation + driftAngle, 0.04);

    groupRef.current.position.x += pointer.x * 0.2;
  });

  return (
    <group ref={groupRef}>
      <primitive object={car} />
      <pointLight position={[0, 2, 0]} color="#06B6D4" intensity={5} distance={8} decay={2} />
    </group>
  );
}

function TireSmoke() {
  const pointsRef = useRef<Points>(null);
  const { positions } = useMemo(() => generateTireSmokePositions(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 1] += 0.03;
      arr[i * 3] += Math.sin(t + i) * 0.01;
      if (arr[i * 3 + 1] > 5) {
        arr[i * 3] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 10;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#666666"
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function SpeedLines() {
  const linesRef = useRef<Points>(null);
  const positions = useMemo(() => generateSpeedLinePositions(), []);

  useFrame(() => {
    if (!linesRef.current) return;
    const arr = linesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3 + 2] += 0.6;
      if (arr[i * 3 + 2] > 0) {
        arr[i * 3 + 2] = -60;
        arr[i * 3] = (Math.random() - 0.5) * 40;
        arr[i * 3 + 1] = Math.random() * 10;
      }
    }
    linesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#06B6D4"
        transparent
        opacity={0.25}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function NeonLights() {
  const lights = useMemo(() => {
    return [
      { pos: [-10, 4, -12] as [number, number, number], color: "#06B6D4" },
      { pos: [10, 4, -12] as [number, number, number], color: "#EC4899" },
      { pos: [-10, 4, -25] as [number, number, number], color: "#EC4899" },
      { pos: [10, 4, -25] as [number, number, number], color: "#06B6D4" },
      { pos: [0, 4, -35] as [number, number, number], color: "#F97316" },
    ];
  }, []);

  return (
    <group>
      {lights.map((light, i) => (
        <group key={i}>
          <mesh position={[light.pos[0], light.pos[1] - 2, light.pos[2]]}>
            <cylinderGeometry args={[0.04, 0.04, 4, 8]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.5} />
          </mesh>
          <mesh position={light.pos}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={light.color}
              emissive={light.color}
              emissiveIntensity={4}
            />
          </mesh>
          <pointLight
            position={light.pos}
            color={light.color}
            intensity={6}
            distance={20}
            decay={2}
          />
        </group>
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
    const targetZ = 20 + Math.cos(t * 0.05) * 2;
    cam.position.z = lerp(cam.position.z, targetZ, 0.008);
    cam.position.x = lerp(cam.position.x, ptr.x * 1.5, 0.015);
    cam.position.y = lerp(cam.position.y, ptr.y * 0.8 + 3, 0.015);
    cam.lookAt(0, -1, -15);
  });

  return null;
}

export default function SceneCarDrift() {
  const groupRef = useRef<Group>(null);
  const ptr = usePointer();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.005;
    groupRef.current.rotation.x = lerp(
      groupRef.current.rotation.x,
      ptr.y * 0.03,
      0.02
    );
    groupRef.current.position.x = lerp(
      groupRef.current.position.x,
      ptr.x * 0.2,
      0.015
    );
  });

  return (
    <>
      <CameraController />

      <color attach="background" args={["#0A0A0F"]} />
      <fog attach="fog" args={["#0A0A0F", 25, 90]} />

      <ambientLight intensity={0.1} color="#1a1a3e" />
      <hemisphereLight args={["#06B6D4", "#1a1a2e", 0.2]} />
      <directionalLight
        position={[10, 20, -5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <group ref={groupRef}>
        <RacingTrack />
        <DriftCar />
        <TireSmoke />
        <SpeedLines />
        <NeonLights />
      </group>
    </>
  );
}

useGLTF.preload([
  `${ASSET_BASE}track-straight.glb`,
  `${ASSET_BASE}track-corner.glb`,
  `${ASSET_BASE}track-bump.glb`,
  `${ASSET_BASE}track-finish.glb`,
  `${ASSET_BASE}track-tents.glb`,
  `${ASSET_BASE}vehicle-truck-yellow.glb`,
]);
