import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group } from "three";

export function CafeShop({ position }: { position: [number, number, number] }) {
  const lightsRef = useRef<Group>(null);

  useFrame((state) => {
    if (!lightsRef.current) return;
    const t = state.clock.elapsedTime;
    lightsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(t * 2 + i * 0.8) * 0.5;
    });
  });

  const [px, py, pz] = position;
  void px; void py; void pz;

  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[3, 2.5, 2.5]} />
        <meshStandardMaterial color="#FFF7ED" roughness={0.7} />
      </mesh>
      {/* Rounded top */}
      <mesh position={[0, 2.45, 0]} scale={[3 / 2.5, 0.3, 1]}>
        <sphereGeometry args={[1.25, 16, 8]} />
        <meshStandardMaterial color="#FFF7ED" roughness={0.7} />
      </mesh>
      {/* Glass windows */}
      {[-0.8, 0.8].map((wx) => (
        <mesh key={wx} position={[wx, 1.3, 1.26]}>
          <boxGeometry args={[1.0, 2.0, 0.05]} />
          <meshStandardMaterial color="#FFF7FB" transparent opacity={0.5} roughness={0.1} />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.6, 1.26]}>
        <boxGeometry args={[0.7, 1.2, 0.05]} />
        <meshStandardMaterial color="#FFF7FB" transparent opacity={0.5} roughness={0.1} />
      </mesh>

      {/* Outdoor seating */}
      {([[-1.0, 2.0], [0, 2.5], [1.0, 2.0]] as [number, number][]).map(([tx, tz], ti) => (
        <group key={ti} position={[tx, 0, tz]}>
          {/* Table */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <meshStandardMaterial color="#D4A574" roughness={0.7} />
          </mesh>
          {/* Chairs */}
          {[0, 1].map((ci) => {
            const angle = ci * Math.PI + ti * 0.5;
            return (
              <mesh key={ci} position={[Math.cos(angle) * 0.45, 0.25, Math.sin(angle) * 0.45]}
                    rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.25, 0.5, 0.25]} />
                <meshStandardMaterial color="#E5E7EB" metalness={0.4} roughness={0.4} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Hanging sign */}
      <mesh position={[0, 2.9, 1.5]}>
        <boxGeometry args={[1.0, 0.3, 0.05]} />
        <meshStandardMaterial color="#F472B6" roughness={0.5} />
      </mesh>

      {/* A-frame sign */}
      <mesh position={[1.5, 0.4, 1.5]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.03]} />
        <meshStandardMaterial color="#D4A574" roughness={0.7} />
      </mesh>

      {/* Flower pots */}
      {[0, 1, 2, 3].map((fi) => (
        <group key={fi} position={[-1.0 + fi * 0.6, 0.6, 1.3]}>
          <mesh><boxGeometry args={[0.12, 0.15, 0.12]} /><meshStandardMaterial color="#92400E" roughness={0.8} /></mesh>
          <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.05, 6, 4]} /><meshStandardMaterial color={["#F472B6", "#FBCFE8", "#FB923C"][fi % 3]} roughness={0.7} /></mesh>
        </group>
      ))}

      {/* String lights */}
      <group ref={lightsRef}>
        {Array.from({ length: 12 }, (_, li) => {
          const lx = -1.5 + li * 0.28;
          const ly = 2.6 + Math.sin(li * 0.5) * 0.08;
          return (
            <mesh key={li} position={[lx, ly, 1.4]}>
              <sphereGeometry args={[0.025, 6, 4]} />
              <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={1.5} />
            </mesh>
          );
        })}
      </group>

      {/* Chalkboard */}
      <mesh position={[1.2, 1.5, 1.26]}>
        <boxGeometry args={[0.4, 0.5, 0.03]} />
        <meshStandardMaterial color="#1A2E1A" roughness={0.9} />
      </mesh>
    </group>
  );
}
