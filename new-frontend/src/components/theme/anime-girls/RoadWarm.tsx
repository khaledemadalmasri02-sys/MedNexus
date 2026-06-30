import { useMemo } from "react";

const CHERRYBLOSSOM_COLORS = ["#FBCFE8", "#F9A8D4", "#F472B6"];

export function RoadWarm() {
  const treePositions = useMemo(() => [
    [-4.5, -8], [4.5, -12], [-4.5, -20], [4.5, -25], [-4.5, -30],
  ] as [number, number][], []);

  const puddlePositions = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      position: [(Math.sin(i * 127.1) * 0.5) * 4, 0.01, -5 - i * 8] as [number, number, number],
      radius: 0.3 + Math.abs(Math.sin(i * 43.7)) * 0.5,
    })), []);

  return (
    <group>
      {/* Road */}
      <mesh position={[0, 0.01, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 60]} />
        <meshStandardMaterial color="#E5E0D8" roughness={0.7} />
      </mesh>

      {/* Lane markings */}
      {Array.from({ length: 25 }, (_, i) => (
        <mesh key={i} position={[0, 0.015, -2 - i * 2.3]}>
          <boxGeometry args={[0.015, 0.4, 0.01]} />
          <meshBasicMaterial color="#FDE68A" />
        </mesh>
      ))}

      {/* Sidewalks */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.2, 0.075, -18]}>
          <boxGeometry args={[1.2, 0.15, 60]} />
          <meshStandardMaterial color="#F5EDE0" roughness={0.8} />
        </mesh>
      ))}

      {/* Crosswalk */}
      {Array.from({ length: 8 }, (_, ci) => (
        <mesh key={ci} position={[-3 + ci * 0.85, 0.02, -15]}>
          <boxGeometry args={[0.5, 0.01, 1.2]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
        </mesh>
      ))}

      {/* Puddles */}
      {puddlePositions.map((p, i) => (
        <mesh key={i} position={p.position} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[p.radius, 16]} />
          <meshStandardMaterial color="#E8E0F0" roughness={0.05} metalness={0.1} />
        </mesh>
      ))}

      {/* Cherry Blossom Trees */}
      {treePositions.map(([tx, tz], ti) => (
        <group key={ti} position={[tx, 0, tz]}>
          {/* Trunk */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 8]} />
            <meshStandardMaterial color="#5C4033" roughness={0.9} />
          </mesh>
          {/* Foliage clusters */}
          {Array.from({ length: 8 }, (_, fi) => {
            const angle = (fi / 8) * Math.PI * 2;
            const r = 0.4 + Math.abs(Math.sin(fi * 3.7 + ti)) * 0.5;
            return (
              <mesh key={fi} position={[Math.cos(angle) * r, 1.2 + Math.abs(Math.sin(fi * 2.3)) * 0.6, Math.sin(angle) * r]}>
                <sphereGeometry args={[0.2 + Math.abs(Math.sin(fi * 5.1 + ti)) * 0.25, 8, 6]} />
                <meshStandardMaterial color={CHERRYBLOSSOM_COLORS[fi % 3]} roughness={0.8} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}
