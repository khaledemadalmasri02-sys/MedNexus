import { useMemo } from "react";

export function StreetLampsCute() {
  const lamps = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const seed = i * 73 + 17;
      const rng = () => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      return {
        position: [side * (2.5 + rng() * 1.2), 0, -4 - i * 5 - rng() * 2] as [number, number, number],
        color: i % 3 === 0 ? "#F472B6" : i % 3 === 1 ? "#FB923C" : "#67E8F9",
      };
    });
  }, []);

  return (
    <group>
      {lamps.map((l, i) => (
        <group key={i} position={l.position}>
          <mesh position={[0, 1.75, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 3.5, 8]} />
            <meshStandardMaterial color="#E5E7EB" metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[0, 3.6, 0]} scale={[1, 0.8, 1]}>
            <sphereGeometry args={[0.12, 16, 8]} />
            <meshStandardMaterial color="#FFF7FB" emissive="#FFF7FB" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <torusGeometry args={[0.08, 0.01, 8, 12]} />
            <meshStandardMaterial color="#F472B6" metalness={0.2} roughness={0.4} />
          </mesh>
          <pointLight position={[0, 3.6, 0]} intensity={0.15} color="#FFF7FB" distance={4} />
        </group>
      ))}
    </group>
  );
}
