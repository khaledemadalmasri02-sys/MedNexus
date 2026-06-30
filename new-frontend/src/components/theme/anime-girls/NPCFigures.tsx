import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

const NPC_CONFIGS = [
  { pos: [-3.8, -6] as [number, number], color: "#2D2D3A", height: 1.6, hasBag: true },
  { pos: [3.8, -12] as [number, number], color: "#333340", height: 1.55, hasBackpack: true },
  { pos: [-3.8, -18] as [number, number], color: "#3D3D4A", height: 1.5, hasCane: true },
  { pos: [3.8, -24] as [number, number], color: "#282838", height: 1.65, hasBag: false },
  { pos: [-3.8, -30] as [number, number], color: "#3A3030", height: 1.58, hasBackpack: true },
  { pos: [3.8, -36] as [number, number], color: "#2D3A2D", height: 1.62, hasBag: false },
];

export function NPCFigures() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const cfg = NPC_CONFIGS[i];
      if (!cfg) return;
      // Subtle idle sway
      child.rotation.y = Math.sin(t * 0.5 + i * 2.1) * 0.03;
      child.position.y = Math.sin(t * 0.8 + i * 1.3) * 0.008;
    });
  });

  return (
    <group ref={groupRef}>
      {NPC_CONFIGS.map((cfg, i) => (
        <group key={i} position={[cfg.pos[0], 0, cfg.pos[1]]}>
          {/* Body */}
          <mesh position={[0, cfg.height * 0.35, 0]}>
            <capsuleGeometry args={[0.12, cfg.height * 0.35, 3, 6]} />
            <meshStandardMaterial color={cfg.color} roughness={0.8} />
          </mesh>
          {/* Head */}
          <mesh position={[0, cfg.height * 0.68, 0]}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color="#F5D0B0" roughness={0.7} />
          </mesh>
          {/* Legs */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.05, cfg.height * 0.1, 0]}>
              <capsuleGeometry args={[0.06, cfg.height * 0.3, 3, 6]} />
              <meshStandardMaterial color={cfg.color} roughness={0.8} />
            </mesh>
          ))}
          {/* Accessories */}
          {cfg.hasBag && (
            <mesh position={[0.2, cfg.height * 0.35, 0]}>
              <boxGeometry args={[0.12, 0.15, 0.08]} />
              <meshStandardMaterial color="#4A3728" roughness={0.7} />
            </mesh>
          )}
          {cfg.hasBackpack && (
            <mesh position={[0, cfg.height * 0.4, -0.12]}>
              <boxGeometry args={[0.18, 0.22, 0.1]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
          )}
          {cfg.hasCane && (
            <mesh position={[0.2, cfg.height * 0.35, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.8, 4]} />
              <meshStandardMaterial color="#6B4423" roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
