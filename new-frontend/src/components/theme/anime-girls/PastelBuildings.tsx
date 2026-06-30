/* eslint-disable react-hooks/immutability */
/* eslint-disable prefer-const */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BUILDING_COLORS = [
  "#F472B6", "#A855F7", "#6366F1", "#22D3EE", "#14B8A6",
  "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6", "#EC4899",
  "#10B981", "#F97316", "#06B6D4", "#D946EF", "#6D28D9",
  "#0EA5E9", "#84CC16", "#F43F5E", "#F472B6", "#22D3EE",
];

const NEON_COLORS = [
  "#FF0080", "#00FFFF", "#FF6600", "#00FF88", "#FF00FF",
  "#FFFF00", "#8800FF", "#FF3366", "#00CCFF", "#FF9900",
  "#CC00FF", "#00FF44", "#FF0066", "#6600FF", "#33FFCC",
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ═══════════════════════════════════════
   Tall tower — hero skyscraper with
   real glass panels + neon crown
   ═══════════════════════════════════════ */
function Skyscraper({ position, width, height, depth, index }: {
  position: [number, number, number]; width: number; height: number; depth: number; color: string; index: number;
}) {
  const neonRefs = useRef<THREE.Mesh[]>([]);

  const glassMat = useMemo(() => {
    const nc = NEON_COLORS[index % NEON_COLORS.length];
    return new THREE.MeshPhysicalMaterial({
      color: "#05050F",
      emissive: new THREE.Color(nc).multiplyScalar(0.08),
      emissiveIntensity: 0.5,
      roughness: 0.05,
      metalness: 0.2,
      transmission: 0.85,
      thickness: 0.3,
      ior: 2.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }, [index]);

  const windowsByFloor = useMemo(() => {
    const rng = seedRandom(index * 43 + 77);
    const floors = Math.floor(height / 0.38);
    const cols = Math.floor(width / 0.32);
    return { floors, cols, rng };
  }, [height, width, index]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + Math.sin(t * 0.4 + index * 1.1) * 0.4;
    if (glassMat) glassMat.emissiveIntensity = 0.3 * pulse;

    neonRefs.current.forEach((m) => {
      if (m) {
        const mat = m.material as THREE.MeshStandardMaterial;
        const flicker = Math.random() < 0.008 ? 0.3 : 1.0;
        mat.emissiveIntensity = (2.5 + Math.sin(t * 0.8 + index + m.userData.phase) * 0.5) * flicker;
      }
    });
  });

  const nc = NEON_COLORS[index % NEON_COLORS.length];
  const nc2 = NEON_COLORS[(index + 5) % NEON_COLORS.length];
  const floors = windowsByFloor.floors;
  const cols = windowsByFloor.cols;

  return (
    <group position={position}>
      {/* Main body */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#06060F" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Glass facade — front */}
      {Array.from({ length: floors }, (_, f) =>
        Array.from({ length: cols }, (_, c) => {
          const lit = windowsByFloor.rng() < 0.75;
          if (!lit) return null;
          return (
            <mesh
              key={`wf_${f}_${c}`}
              position={[-width / 2 + 0.16 + c * 0.32, -height / 2 + 0.18 + f * 0.38, depth / 2 + 0.01]}
              material={glassMat}
            >
              <planeGeometry args={[0.24, 0.16]} />
            </mesh>
          );
        })
      )}

      {/* Glass facade — back */}
      {Array.from({ length: floors }, (_, f) =>
        Array.from({ length: cols }, (_, c) => {
          const lit = windowsByFloor.rng() < 0.7;
          if (!lit) return null;
          return (
            <mesh
              key={`wb_${f}_${c}`}
              position={[-width / 2 + 0.16 + c * 0.32, -height / 2 + 0.18 + f * 0.38, -depth / 2 - 0.01]}
              rotation={[0, Math.PI, 0]}
              material={glassMat}
            >
              <planeGeometry args={[0.24, 0.16]} />
            </mesh>
          );
        })
      )}

      {/* Side glass — left */}
      {Array.from({ length: Math.max(1, floors - 2) }, (_, f) =>
        Array.from({ length: Math.max(1, Math.floor(depth / 0.4)) }, (_, s) => {
          if (windowsByFloor.rng() < 0.6) return null;
          return (
            <mesh
              key={`wsl_${f}_${s}`}
              position={[-width / 2 - 0.01, -height / 2 + 0.3 + f * 0.4, -depth / 2 + 0.2 + s * 0.4]}
              rotation={[0, -Math.PI / 2, 0]}
              material={glassMat}
            >
              <planeGeometry args={[0.28, 0.18]} />
            </mesh>
          );
        })
      )}

      {/* Side glass — right */}
      {Array.from({ length: Math.max(1, floors - 2) }, (_, f) =>
        Array.from({ length: Math.max(1, Math.floor(depth / 0.4)) }, (_, s) => {
          if (windowsByFloor.rng() < 0.6) return null;
          return (
            <mesh
              key={`wsr_${f}_${s}`}
              position={[width / 2 + 0.01, -height / 2 + 0.3 + f * 0.4, -depth / 2 + 0.2 + s * 0.4]}
              rotation={[0, Math.PI / 2, 0]}
              material={glassMat}
            >
              <planeGeometry args={[0.28, 0.18]} />
            </mesh>
          );
        })
      )}

      {/* Neon crown on top */}
      <mesh position={[0, height / 2 + 0.1, depth / 2 + 0.03]} ref={(r) => { if (r) neonRefs.current[0] = r; }} userData={{ phase: 0 }}>
        <boxGeometry args={[width * 0.8, 0.06, 0.02]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2 + 0.1, -depth / 2 - 0.03]} ref={(r) => { if (r) neonRefs.current[1] = r; }} userData={{ phase: 1 }}>
        <boxGeometry args={[width * 0.8, 0.06, 0.02]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>

      {/* Side neon lines */}
      <mesh position={[-width / 2 - 0.02, height * 0.05, 0]} ref={(r) => { if (r) neonRefs.current[2] = r; }} userData={{ phase: 2 }}>
        <boxGeometry args={[0.02, height * 0.9, depth * 0.9]} />
        <meshStandardMaterial color={nc2} emissive={nc2} emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.5} />
      </mesh>
      <mesh position={[width / 2 + 0.02, height * 0.05, 0]} ref={(r) => { if (r) neonRefs.current[3] = r; }} userData={{ phase: 3 }}>
        <boxGeometry args={[0.02, height * 0.9, depth * 0.9]} />
        <meshStandardMaterial color={nc2} emissive={nc2} emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.5} />
      </mesh>

      {/* Neon sign on front */}
      <mesh position={[0, height * 0.18, depth / 2 + 0.06]}>
        <boxGeometry args={[width * 0.6, height * 0.18, 0.04]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>

      {/* Small sign banner */}
      <mesh position={[width * 0.35, height * -0.1, depth / 2 + 0.05]}>
        <boxGeometry args={[width * 0.25, height * 0.08, 0.03]} />
        <meshStandardMaterial color={nc2} emissive={nc2} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>

      {/* Door */}
      <mesh position={[0, -height / 2 + 0.65, depth / 2 + 0.02]}>
        <boxGeometry args={[0.55, 1.2, 0.04]} />
        <meshStandardMaterial color="#030308" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Door glow frame */}
      <mesh position={[0, -height / 2 + 0.65, depth / 2 + 0.04]}>
        <boxGeometry args={[0.6, 1.25, 0.008]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={1.5} toneMapped={false} transparent opacity={0.5} />
      </mesh>

      {/* Ground glow */}
      <mesh position={[0, -height / 2 + 0.03, depth / 2 + 0.01]}>
        <boxGeometry args={[width * 0.9, 0.04, 0.008]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════
   Mid-rise building — smaller, denser
   ═══════════════════════════════════════ */
function MidRise({ position, width, height, depth, index }: {
  position: [number, number, number]; width: number; height: number; depth: number; color: string; index: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);

  const glassMat = useMemo(() => {
    const nc = NEON_COLORS[(index + 3) % NEON_COLORS.length];
    return new THREE.MeshStandardMaterial({
      color: "#08081A",
      emissive: new THREE.Color(nc).multiplyScalar(0.1),
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.0,
      toneMapped: false,
    });
  }, [index]);

  const floors = useMemo(() => Math.floor(height / 0.4), [height]);
  const cols = useMemo(() => Math.floor(width / 0.34), [width]);
  const rng = useMemo(() => seedRandom(index * 57 + 33), [index]);

  const windows = useMemo(() => {
    const result: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.68) {
          result.push({
            pos: [-width / 2 + 0.17 + c * 0.34, -height / 2 + 0.2 + f * 0.4, depth / 2 + 0.012],
            rot: [0, 0, 0],
          });
        }
      }
    }
    return result;
  }, [floors, cols, width, height, depth, rng]);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + Math.sin(state.clock.elapsedTime + index) * 0.1;
    }
  });

  const nc = NEON_COLORS[index % NEON_COLORS.length];
  const nc2 = NEON_COLORS[(index + 7) % NEON_COLORS.length];

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#07070F" roughness={0.55} metalness={0.2} />
      </mesh>

      {/* Front windows */}
      {windows.map((w, i) => (
        <mesh key={i} position={w.pos} rotation={w.rot} material={glassMat}>
          <planeGeometry args={[0.26, 0.18]} />
        </mesh>
      ))}

      {/* Back windows */}
      {Array.from({ length: floors }, (_, f) =>
        Array.from({ length: cols }, (_, c) => {
          if (rng() < 0.65) return null;
          return (
            <mesh key={`b_${f}_${c}`}
              position={[-width / 2 + 0.17 + c * 0.34, -height / 2 + 0.2 + f * 0.4, -depth / 2 - 0.012]}
              rotation={[0, Math.PI, 0]} material={glassMat}>
              <planeGeometry args={[0.26, 0.18]} />
            </mesh>
          );
        })
      )}

      {/* Neon strip top */}
      <mesh position={[0, height / 2, depth / 2 + 0.02]}>
        <boxGeometry args={[width, 0.035, 0.012]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 - 0.02]}>
        <boxGeometry args={[width, 0.035, 0.012]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={3} toneMapped={false} />
      </mesh>

      {/* Side glow */}
      <mesh position={[-width / 2 - 0.012, 0, depth / 2 + 0.02]} ref={lightRef}>
        <boxGeometry args={[0.012, height * 0.7, 0.015]} />
        <meshStandardMaterial color={nc2} emissive={nc2} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[width / 2 + 0.012, 0, depth / 2 + 0.02]}>
        <boxGeometry args={[0.012, height * 0.7, 0.015]} />
        <meshStandardMaterial color={nc2} emissive={nc2} emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Neon sign */}
      <mesh position={[0, height * 0.12, depth / 2 + 0.04]}>
        <boxGeometry args={[width * 0.55, height * 0.14, 0.03]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Door */}
      <mesh position={[0, -height / 2 + 0.5, depth / 2 + 0.02]}>
        <boxGeometry args={[0.4, 0.9, 0.03]} />
        <meshStandardMaterial color="#04040A" roughness={0.2} metalness={0.5} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.5, depth / 2 + 0.035]}>
        <boxGeometry args={[0.45, 0.95, 0.006]} />
        <meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={1.3} toneMapped={false} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════
    Right Side — deep layers
    ═══════════════════════════════════════ */
function RightSide() {
  const rows = useMemo(() => {
    const r: { x: number; zStart: number; buildings: { w: number; h: number; d: number }[] }[] = [];
    let rng = seedRight(100);
    let x = 24;

    r.push({ x: x, zStart: -3, buildings: [
      { w: 3.5, h: 14 + rng() * 8, d: 3.5 },
      { w: 2.8, h: 9 + rng() * 6, d: 2.8 },
    ]});
    x += 7;
    r.push({ x: x, zStart: -3, buildings: [
      { w: 2.2, h: 5 + Math.floor(rng() * 3), d: 2.2 },
      { w: 1.8, h: 7 + rng() * 4, d: 1.8 },
      { w: 2.0, h: 12 + rng() * 6, d: 2.0 },
      { w: 2.5, h: 6 + rng() * 3, d: 2.5 },
    ]});
    x += 6;
    r.push({ x: x, zStart: -3, buildings: [
      { w: 2, h: 16 + rng() * 6, d: 2 },
      { w: 1.6, h: 4 + rng() * 3, d: 1.6 },
      { w: 2.4, h: 10 + rng() * 5, d: 2.4 },
    ]});
    x += 6;
    r.push({ x: x, zStart: -3, buildings: [
      { w: 1.8, h: 6 + rng() * 4, d: 1.8 },
      { w: 2.0, h: 14 + rng() * 8, d: 2.0 },
      { w: 1.5, h: 18 + rng() * 6, d: 1.5 },
    ]});

    return r;
  }, []);

  return (
    <group>
      {rows.map((row, rowIdx) => {
        let z = row.zStart;
        return row.buildings.map((b, i) => {
          const idx = rowIdx * 10 + i + 50;
          const yPos = b.h / 2;
          const zPos = z - b.d / 2 - 0.5;
          z -= b.d + 0.8 + seedRight(200 + idx)() * 1.2;

          if (b.h > 8) {
            return (
              <Skyscraper
                key={idx}
                position={[row.x, yPos, zPos]}
                width={b.w} height={b.h} depth={b.d}
                color={BUILDING_COLORS[idx % BUILDING_COLORS.length]}
                index={idx}
              />
            );
          }
          return (
            <MidRise
              key={idx}
              position={[row.x, yPos, zPos]}
              width={b.w} height={b.h} depth={b.d}
              color={BUILDING_COLORS[idx % BUILDING_COLORS.length]}
              index={idx}
            />
          );
        });
      })}
    </group>
  );
}

/* ═══════════════════════════════════════
   Left Side — deep layers
   ═══════════════════════════════════════ */
function LeftSide() {
  const rows = useMemo(() => {
    let rng = seedLeft(200);
    return Array.from({ length: 4 }, (_, rowIdx) => {
      const xOffset = 24 + rowIdx * 6;
      const count = 2 + Math.floor(rng() * 3);
      const buildings = Array.from({ length: count }, () => ({
        w: 1.5 + rng() * 2.5,
        h: 4 + rng() * 14,
        d: 1.5 + rng() * 2,
      }));
      return { xOffset, buildings };
    });
  }, []);

  return (
    <group>
      {rows.map((row, rowIdx) => {
        let z = -3;
        return row.buildings.map((b, i) => {
          const idx = rowIdx * 10 + i + 100;
          const yPos = b.h / 2;
          const zPos = z - b.d / 2 - 0.5;
          z -= b.d + 0.8 + seedLeft(300 + idx)() * 1.2;

          if (b.h > 8) {
            return (
              <Skyscraper
                key={idx}
                position={[-row.xOffset, yPos, zPos]}
                width={b.w} height={b.h} depth={b.d}
                color={BUILDING_COLORS[idx % BUILDING_COLORS.length]}
                index={idx}
              />
            );
          }
          return (
            <MidRise
              key={idx}
              position={[-row.xOffset, yPos, zPos]}
              width={b.w} height={b.h} depth={b.d}
              color={BUILDING_COLORS[idx % BUILDING_COLORS.length]}
              index={idx}
            />
          );
        });
      })}
    </group>
  );
}

/* ═══════════════════════════════════════
   Center spine — 3 adjacent buildings
   with street gaps (original block)
   ═══════════════════════════════════════ */
const CENTER_BLOCKS = (() => {
  const rng = seedCenter(42);
  const blocks: { side: number; xOff: number; buildings: { w: number; h: number; d: number; z: number }[] }[] = [];
  for (let block = 0; block < 6; block++) {
    for (let side = -1; side <= 1; side += 2) {
      const xOff = 3.5 + rng() * 2;
      let z = -3 - block * 9;
      const buildings = Array.from({ length: 3 }, () => {
        const w = 1.6 + rng() * 1.2;
        const h = 4 + rng() * 10;
        const d = 1.3 + rng() * 1.2;
        const zPos = z - d / 2;
        z -= d + 0.3 + seedCenter(500 + w * 100 + h)() * 0.4;
        return { w, h, d, z: zPos };
      });
      blocks.push({ side, xOff, buildings });
    }
  }
  return blocks;
})();

function CenterSpine() {
  return (
    <group>
      {CENTER_BLOCKS.flatMap((block, blockIdx) =>
        block.buildings.map((b, i) => {
          const idx = blockIdx * 6 + (block.side === -1 ? i : i + 3);
          const pos: [number, number, number] = [block.side * block.xOff, b.h / 2, b.z];
          const Building = b.h > 8 ? Skyscraper : MidRise;
          return <Building key={idx} position={pos} width={b.w} height={b.h} depth={b.d} color={BUILDING_COLORS[idx % BUILDING_COLORS.length]} index={idx} />;
        })
      )}
    </group>
  );
}

/* ═══════════════════════════════════════
   Helper: seeded RNG for layers
   ═══════════════════════════════════════ */
function seedRight(s: number) {
  let v = s;
  return () => { v = (v * 16807 + 0) % 2147483647; return (v - 1) / 2147483646; };
}
function seedLeft(s: number) {
  let v = s;
  return () => { v = (v * 16807 + 0) % 2147483647; return (v - 1) / 2147483646; };
}
function seedCenter(s: number) {
  let v = s;
  return () => { v = (v * 16807 + 0) % 2147483647; return (v - 1) / 2147483646; };
}

/* ═══════════════════════════════════════
   Street with neon lights between blocks
   ═══════════════════════════════════════ */
function NeonStreet({ zCenter, length }: { zCenter: number; length: number }) {
  return (
    <group position={[0, 0.012, zCenter]}>
      {/* Wet asphalt road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, length]} />
        <meshStandardMaterial color="#06060C" roughness={0.25} metalness={0.7} />
      </mesh>
      {/* Center line */}
      {Array.from({ length: Math.floor(length / 3) }, (_, i) => (
        <mesh key={i} position={[0, 0.004, -length / 2 + i * 3 + 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 1.5]} />
          <meshStandardMaterial color="#FF8800" emissive="#FF6600" emissiveIntensity={0.2} toneMapped={false} />
        </mesh>
      ))}
      {/* Sidewalks with neon edge */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 2.5, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.0, length]} />
            <meshStandardMaterial color="#0A0A12" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[s * 2.5, 0.09, 0]}>
            <boxGeometry args={[1.0, 0.015, length]} />
            <meshStandardMaterial color="#FF0080" emissive="#FF0080" emissiveIntensity={0.3} toneMapped={false} transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
      {/* Neon street lamps */}
      {Array.from({ length: Math.floor(length / 5) }, (_, i) => {
        const lz = -length / 2 + i * 5 + 2.5;
        const nc = NEON_COLORS[i % NEON_COLORS.length];
        return (
          <group key={i} position={[3.2, 0, lz]}>
            <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.02, 0.025, 3.2, 6]} /><meshStandardMaterial color="#1A1A2E" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[0, 3.2, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color={nc} emissive={nc} emissiveIntensity={2} toneMapped={false} /></mesh>
            <pointLight position={[0, 3.2, 0]} intensity={0.12} color={nc} distance={4} />
          </group>
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════
   Main export
   ═══════════════════════════════════════ */
export function PastelBuildings() {
  return (
    <group>
      {/* Center — 3 adjacent buildings per side */}
      <CenterSpine />

      {/* Right deep layers */}
      <RightSide />

      {/* Left deep layers */}
      <LeftSide />

      {/* Streets between center blocks */}
      {Array.from({ length: 5 }, (_, i) => (
        <NeonStreet key={`street_${i}`} zCenter={-8 - i * 9} length={10} />
      ))}
    </group>
  );
}
