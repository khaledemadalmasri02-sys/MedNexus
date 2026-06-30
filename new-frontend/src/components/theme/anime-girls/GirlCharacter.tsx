import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group, Mesh } from "three";

const CYAN = "#67E8F9";
const HAIR_BASE = "#D4789C";
const HAIR_HL = "#F0A0C8";
const JACKET = "#F472B6";
const SHIRT = "#FFFFFF";
const SKIRT = "#BE185D";
const SKIN = "#F5D0B0";
const BAG_MAIN = "#FDA4AF";




export function AnimeGirlCharacter() {
  const groupRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const bagRef = useRef<Group>(null);
  const hair1Ref = useRef<Group>(null);
  const hair2Ref = useRef<Group>(null);
  const skirtRef = useRef<Group>(null);
  const shoeLRef = useRef<Mesh>(null);
  const shoeRRef = useRef<Mesh>(null);
  const hpLedLRef = useRef<Mesh>(null);
  const hpLedRRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const wc = t * 2.5;

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(wc) * 0.4;
      leftLegRef.current.rotation.z = Math.sin(wc) * 0.03;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(wc + Math.PI) * 0.4;
      rightLegRef.current.rotation.z = Math.sin(wc + Math.PI) * 0.03;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(wc + Math.PI) * 0.35;
      leftArmRef.current.rotation.z = 0.05;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = Math.sin(wc) * 0.35;
      rightArmRef.current.rotation.z = -0.05;
    }
    if (headRef.current) {
      headRef.current.position.y = 1.58 + Math.sin(wc * 2) * 0.012;
      headRef.current.rotation.z = Math.sin(wc) * 0.02;
      headRef.current.rotation.x = Math.sin(wc * 0.5) * 0.01;
    }
    if (bagRef.current) {
      bagRef.current.position.y = 0.95 + Math.abs(Math.sin(wc)) * 0.025;
      bagRef.current.rotation.z = Math.sin(wc) * 0.04;
    }
    if (hair1Ref.current) {
      hair1Ref.current.rotation.x = Math.sin(wc - 0.3) * 0.05;
      hair1Ref.current.rotation.z = Math.sin(wc * 0.8) * 0.03;
    }
    if (hair2Ref.current) {
      hair2Ref.current.rotation.x = Math.sin(wc - 0.5) * 0.07;
      hair2Ref.current.rotation.z = Math.sin(wc * 0.8 + 1) * 0.04;
    }
    if (skirtRef.current) {
      skirtRef.current.rotation.z = Math.sin(wc) * 0.06;
      skirtRef.current.rotation.x = Math.sin(wc * 0.5) * 0.02;
    }
    groupRef.current.position.y = Math.abs(Math.sin(wc)) * 0.02;
    groupRef.current.rotation.z = Math.sin(wc) * 0.03;

    // LED flicker
    const sMat = shoeLRef.current?.material as THREE.MeshStandardMaterial;
    if (sMat) sMat.emissiveIntensity = 0.15 + Math.sin(t * 2.5) * 0.1;
    const sMat2 = shoeRRef.current?.material as THREE.MeshStandardMaterial;
    if (sMat2) sMat2.emissiveIntensity = 0.15 + Math.sin(t * 2.5 + 1) * 0.1;

    const hpMat = hpLedLRef.current?.material as THREE.MeshStandardMaterial;
    if (hpMat) hpMat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.15;
    const hpMat2 = hpLedRRef.current?.material as THREE.MeshStandardMaterial;
    if (hpMat2) hpMat2.emissiveIntensity = 0.3 + Math.sin(t * 3 + 1.5) * 0.15;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <group ref={headRef} position={[0, 1.58, 0]}>
        <mesh><sphereGeometry args={[0.36, 12, 10]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
        {/* Hair back */}
        <mesh position={[0, 0.06, -0.02]}><sphereGeometry args={[0.38, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshBasicMaterial color={HAIR_BASE} /></mesh>
        {/* Bangs */}
        {[[-0.14, 0.08, 0.12], [0.10, 0.10, 0.14], [0, 0.14, 0.16], [-0.22, 0.06, 0.10], [0.20, 0.06, 0.11]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} rotation={[0.3 + i * 0.05, 0, (i % 3 - 1) * 0.15]}>
            <coneGeometry args={[0.04, 0.1, 4]} /><meshStandardMaterial color={i % 2 === 0 ? HAIR_HL : HAIR_BASE} roughness={0.85} />
          </mesh>
        ))}
        {/* Side locks */}
        {[-1, 1].map((side) => [0, 1, 2].map((j) => (
          <mesh key={`sl${side}_${j}`} position={[side * (0.32 + j * 0.02), -0.04 - j * 0.03, -0.04 - j * 0.08]}
                 rotation={[-0.2 - j * 0.1, 0, side * 0.25]}>
            <coneGeometry args={[0.035, 0.14, 4]} /><meshStandardMaterial color={HAIR_BASE} roughness={0.85} />
          </mesh>
        )))}
        {/* Eyes */}
        {[-1, 1].map((side) => (
          <group key={`eye_${side}`}>
            <mesh position={[side * 0.09, -0.02, 0.22]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#FFF" /></mesh>
            <mesh position={[side * 0.09, 0.0, 0.24]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color={HAIR_BASE} /></mesh>
            <mesh position={[side * 0.07, 0.02, 0.28]}><sphereGeometry args={[0.01, 6, 4]} /><meshBasicMaterial color={CYAN} /></mesh>
          </group>
        ))}
        {/* Nose */}
        <mesh position={[0, -0.02, 0.16]}><sphereGeometry args={[0.02, 6, 4]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
        {/* Mouth */}
        <mesh position={[0, -0.09, 0.12]}><boxGeometry args={[0.04, 0.012, 0.01]} /><meshStandardMaterial color="#E8A0B8" roughness={0.6} /></mesh>
        {/* Ears */}
        {[-1, 1].map((s) => (
          <mesh key={`ear_${s}`} position={[s * 0.34, 0.0, 0.0]}><sphereGeometry args={[0.025, 6, 4]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
        ))}
        {/* Hair clips */}
        {[-1, 1].map((s) => (
          <mesh key={`clip_${s}`} position={[s * 0.30, 0.08, 0.12]}><sphereGeometry args={[0.02, 6, 4]} /><meshStandardMaterial color={JACKET} emissive={JACKET} emissiveIntensity={0.1} /></mesh>
        ))}
        {/* Headphones */}
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.38, 0.022, 6, 20, Math.PI]} /><meshStandardMaterial color={JACKET} roughness={0.4} /></mesh>
        {[-1, 1].map((s) => (
          <group key={`hp_${s}`}>
            <mesh position={[s * 0.36, -0.02, 0.0]}><torusGeometry args={[0.06, 0.03, 8, 12]} /><meshStandardMaterial color={JACKET} roughness={0.4} /></mesh>
            <mesh ref={s === -1 ? hpLedLRef : hpLedRRef} position={[s * 0.36, -0.02, 0.04]}>
              <torusGeometry args={[0.05, 0.008, 6, 12]} /><meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[s * 0.36, -0.02, 0.09]}><sphereGeometry args={[0.012, 6, 4]} /><meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.3} /></mesh>
          </group>
        ))}
      </group>

      {/* Neck */}
      <mesh position={[0, 1.34, 0]}><cylinderGeometry args={[0.05, 0.06, 0.12, 6]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>

      {/* Torso (Jacket) */}
      <mesh position={[0, 1.07, 0]}><boxGeometry args={[0.52, 0.45, 0.22]} /><meshStandardMaterial color={JACKET} roughness={0.7} /></mesh>
      {/* Shirt collar */}
      <mesh position={[0, 1.18, 0.05]}><boxGeometry args={[0.18, 0.06, 0.12]} /><meshStandardMaterial color={SHIRT} roughness={0.8} /></mesh>

      {/* Skirt */}
      <group ref={skirtRef}>
        <mesh position={[0, 0.62, 0]}><boxGeometry args={[0.56, 0.15, 0.28]} /><meshStandardMaterial color={SKIRT} roughness={0.75} /></mesh>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.30, 1.05, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.065, 0.2, 3, 6]} /><meshStandardMaterial color={JACKET} roughness={0.7} /></mesh>
        <mesh position={[0, -0.30, 0]}><capsuleGeometry args={[0.055, 0.18, 3, 6]} /><meshStandardMaterial color={JACKET} roughness={0.7} /></mesh>
        <mesh position={[0, -0.44, 0]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.30, 1.05, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.065, 0.2, 3, 6]} /><meshStandardMaterial color={JACKET} roughness={0.7} /></mesh>
        <mesh position={[0, -0.30, 0]}><capsuleGeometry args={[0.055, 0.18, 3, 6]} /><meshStandardMaterial color={JACKET} roughness={0.7} /></mesh>
        <mesh position={[0, -0.44, 0]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={SKIN} roughness={0.7} /></mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.11, 0.55, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.085, 0.16, 3, 6]} /><meshStandardMaterial color={SHIRT} roughness={0.6} /></mesh>
        <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.07, 0.14, 3, 6]} /><meshStandardMaterial color={SHIRT} roughness={0.6} /></mesh>
        <mesh ref={shoeLRef} position={[0, -0.38, 0.03]}><boxGeometry args={[0.1, 0.06, 0.16]} /><meshStandardMaterial color={JACKET} emissive={JACKET} emissiveIntensity={0.2} roughness={0.4} /></mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.11, 0.55, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.085, 0.16, 3, 6]} /><meshStandardMaterial color={SHIRT} roughness={0.6} /></mesh>
        <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.07, 0.14, 3, 6]} /><meshStandardMaterial color={SHIRT} roughness={0.6} /></mesh>
        <mesh ref={shoeRRef} position={[0, -0.38, 0.03]}><boxGeometry args={[0.1, 0.06, 0.16]} /><meshStandardMaterial color={JACKET} emissive={JACKET} emissiveIntensity={0.2} roughness={0.4} /></mesh>
      </group>

      {/* Shoulder Bag */}
      <group ref={bagRef} position={[0.22, 0.95, 0]}>
        <mesh><sphereGeometry args={[0.11, 8, 6]} /><meshStandardMaterial color={BAG_MAIN} roughness={0.6} /></mesh>
        <mesh position={[0, 0.07, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#FB7185" roughness={0.6} /></mesh>
        <mesh position={[0, 0.12, 0.02]}><sphereGeometry args={[0.015, 6, 4]} /><meshStandardMaterial color={JACKET} emissive={JACKET} emissiveIntensity={0.2} /></mesh>
      </group>
    </group>
  );
}
