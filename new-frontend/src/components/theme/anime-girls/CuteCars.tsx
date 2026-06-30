/* eslint-disable react-hooks/refs */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

const CAR_COLORS = ["#FBCFE8", "#BFDBFE", "#FDE68A"];

export function CuteCars() {
  const groupRef = useRef<Group>(null);

  const cars = useRef([
    { x: -1.5, zStart: -8, speed: 0, color: CAR_COLORS[0], parked: true },
    { x: 1.5, zStart: -20, speed: 1.2, color: CAR_COLORS[1], parked: false },
    { x: -1.5, zStart: -30, speed: 0, color: CAR_COLORS[2], parked: true },
  ]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const car = cars.current[i];
      if (!car.parked) {
        child.position.z = car.zStart - (t * car.speed) % 40;
        if (child.position.z < -55) child.position.z = car.zStart + 10;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {cars.current.map((car, i) => (
        <group key={i} position={[car.x, 0, car.zStart]}>
          {/* Body */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[1.5, 0.7, 0.45]} />
            <meshStandardMaterial color={car.color} metalness={0.3} roughness={0.35} />
          </mesh>
          {/* Cabin */}
          <mesh position={[0.05, 0.7, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.4]} />
            <meshStandardMaterial color={car.color} metalness={0.3} roughness={0.35} />
          </mesh>
          {/* Wheels */}
          {[[-0.5, 0.22], [0.5, 0.22], [-0.5, -0.22], [0.5, -0.22]].map(([wx, wz], j) => (
            <mesh key={j} position={[wx, 0.05, wz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
              <meshStandardMaterial color="#1A1A2E" roughness={0.8} />
            </mesh>
          ))}
          {/* Headlights */}
          {[-0.25, 0.25].map((hx, j) => (
            <mesh key={j} position={[hx, 0.35, 0.23]}>
              <sphereGeometry args={[0.05, 6, 4]} />
              <meshStandardMaterial color="#FDE68A" emissive="#FDE68A" emissiveIntensity={0.8} />
            </mesh>
          ))}
          {/* Antenna */}
          <mesh position={[0.3, 1.0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.3, 4]} />
            <meshStandardMaterial color="#333" roughness={0.5} />
          </mesh>
          {/* Heart mirror */}
          <mesh position={[0.7, 0.5, 0.22]}>
            <sphereGeometry args={[0.03, 6, 4]} />
            <meshStandardMaterial color="#F472B6" emissive="#F472B6" emissiveIntensity={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
