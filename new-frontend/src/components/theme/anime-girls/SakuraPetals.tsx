import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";

function generateSakuraData() {
  const count = 80;
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  const drf = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = Math.random() * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    spd[i] = 0.008 + Math.random() * 0.012;
    drf[i] = (Math.random() - 0.5) * 0.015;
  }
  return { positions: pos, speeds: spd, drifts: drf, count };
}

function generateHeartSparkleData() {
  const count = 40;
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  const ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = Math.random() * 6 + 1;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    spd[i] = 0.1 + Math.random() * 0.3;
    ph[i] = Math.random() * Math.PI * 2;
  }
  return { positions: pos, speeds: spd, phases: ph, count };
}

export function SakuraPetalsWarm() {
  const pointsRef = useRef<Points>(null);
  const { positions, speeds, drifts, count } = useMemo(() => generateSakuraData(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i];
      arr[i * 3] += Math.sin(t * 0.5 + i * 0.3) * drifts[i];
      arr[i * 3 + 2] += Math.cos(t * 0.3 + i * 0.7) * drifts[i] * 0.5;
      if (arr[i * 3 + 1] < -0.5) {
        arr[i * 3 + 1] = 10;
        arr[i * 3] = (Math.random() - 0.5) * 14;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#F9A8D4"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function HeartSparkles() {
  const pointsRef = useRef<Points>(null);
  const { positions, speeds, phases, count } = useMemo(() => generateHeartSparkleData(), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.003 * speeds[i];
      arr[i * 3] += Math.sin(t * 1.5 + phases[i]) * 0.002;
      if (arr[i * 3 + 1] > 7) {
        arr[i * 3 + 1] = 1;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#F472B6"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
