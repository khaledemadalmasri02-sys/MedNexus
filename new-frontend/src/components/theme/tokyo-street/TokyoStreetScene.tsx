/* eslint-disable react-hooks/immutability */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function ConcreteMaterial({ color, roughness = 0.85 }: { color: string; roughness?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={roughness}
      metalness={0.02}
      clearcoat={0.05}
      clearcoatRoughness={0.9}
      envMapIntensity={0.25}
      sheen={0.1}
      sheenRoughness={0.8}
    />
  );
}

function GlassMaterial({ tint = '#88ccff' }: { tint?: string }) {
  return (
    <meshStandardMaterial
      color={tint}
      roughness={0.15}
      metalness={0.1}
      transparent
      opacity={0.25}
    />
  );
}

function EmissiveMaterial({ color, intensity = 2 }: { color: string; intensity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      roughness={0.2}
      metalness={0.6}
      toneMapped={false}
    />
  );
}

function Building({ position, size, color, seed, style }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  seed: number;
  style: 'modern' | 'classic' | 'tower';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [w, h, d] = size;
  const rng = useMemo(() => seededRandom(seed), [seed]);

  const windowRows = Math.floor(h / 1.1);
  const windowCols = Math.max(2, Math.floor(w / 0.9));

  const windows = useMemo(() => {
    const result: Array<{
      pos: [number, number, number];
      lit: boolean;
      intensity: number;
      isFront: boolean;
    }> = [];
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const pseudoRand = rng();
        if (pseudoRand > 0.25) {
          const isLit = rng() > 0.4;
          result.push({
            pos: [
              -w / 2 + 0.4 + col * ((w - 0.8) / windowCols),
              0.8 + row * 1.1,
              d / 2 + 0.01,
            ],
            lit: isLit,
            intensity: 0.6 + rng() * 0.8,
            isFront: true,
          });
          if (rng() > 0.5) {
            result.push({
              pos: [
                -w / 2 + 0.4 + col * ((w - 0.8) / windowCols),
                0.8 + row * 1.1,
                -d / 2 - 0.01,
              ],
              lit: isLit,
              intensity: 0.5 + rng() * 0.6,
              isFront: false,
            });
          }
        }
      }
    }
    return result;
  }, [windowRows, windowCols, w, d, rng]);

  const signColor = useMemo(() => {
    const options = ['#ff0033', '#00ccff', '#ff6600', '#00ff66', '#ff00cc', '#ffff00', '#ff3366'];
    return options[Math.floor(rng() * options.length)];
  }, [rng]);

  const signPos = useMemo<[number, number, number]>(() => [
    rng() * (w * 0.2),
    h * 0.35 + rng() * h * 0.2,
    d / 2 + 0.12,
  ], [rng, w, h, d]);

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <ConcreteMaterial color={color} />
      </mesh>

      {style === 'tower' && (
        <>
          <mesh position={[0, h + 0.25, 0]} castShadow>
            <boxGeometry args={[w + 0.3, 0.5, d + 0.3]} />
            <ConcreteMaterial color="#333333" roughness={0.7} />
          </mesh>
          <mesh position={[w * 0.3, h + 1.2, d * 0.3]}>
            <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
            <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[w * 0.3, h + 2.3, d * 0.3]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <EmissiveMaterial color="#ff0000" intensity={5} />
          </mesh>
        </>
      )}

      {style === 'classic' && (
        <>
          <mesh position={[0, h + 0.15, 0]} castShadow>
            <boxGeometry args={[w + 0.2, 0.3, d + 0.2]} />
            <ConcreteMaterial color="#555555" />
          </mesh>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[-w / 2 + i * (w / 2), h / 2, d / 2 + 0.08]} castShadow>
              <boxGeometry args={[0.2, h, 0.15]} />
              <ConcreteMaterial color="#666666" />
            </mesh>
          ))}
        </>
      )}

      {windows.map((win, i) => (
        <mesh key={i} position={win.pos} rotation={[0, win.isFront ? 0 : Math.PI, 0]}>
          <planeGeometry args={[0.55 + rng() * 0.15, 0.7 + rng() * 0.2]} />
          {win.lit ? (
            <meshStandardMaterial
              color="#ffddaa"
              emissive="#ffaa44"
              emissiveIntensity={win.intensity}
              roughness={0.3}
              transparent
              opacity={0.9}
            />
          ) : (
            <GlassMaterial />
          )}
        </mesh>
      ))}

      <mesh position={signPos}>
        <boxGeometry args={[Math.min(w * 0.7, 3.5), 0.4 + rng() * 0.3, 0.12]} />
        <EmissiveMaterial color={signColor} intensity={3.5} />
      </mesh>
      {rng() > 0.5 && (
        <pointLight
          position={[signPos[0], signPos[1], signPos[2] + 0.5]}
          color={signColor}
          intensity={3}
          distance={5}
        />
      )}

      {Array.from({ length: Math.floor(h / 4) }).map((_, i) => {
        if (rng() > 0.5) return null;
        return (
          <mesh key={`ac-${i}`} position={[(rng() - 0.5) * w * 0.6, 2 + i * 4 + rng() * 2, d / 2 + 0.3]} castShadow>
            <boxGeometry args={[0.6, 0.4, 0.5]} />
            <ConcreteMaterial color="#444444" />
          </mesh>
        );
      })}
    </group>
  );
}

function CoffeeShop() {
  return (
    <group position={[-7, 0, -3]}>
      <mesh position={[0, 8, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 16, 6]} />
        <ConcreteMaterial color="#4a3a3a" roughness={0.88} />
      </mesh>

      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.1, 3, 6.1]} />
        <ConcreteMaterial color="#5a3a2a" roughness={0.9} />
      </mesh>

      <mesh position={[0, 9, 3.06]}>
        <boxGeometry args={[6, 12, 0.1]} />
        <GlassMaterial tint="#99ccff" />
      </mesh>

      {Array.from({ length: 11 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => {
          const isLit = ((row * 7 + col * 13) % 100) / 100 > 0.35;
          return (
            <mesh key={`w-${row}-${col}`} position={[-2.7 + col * 1.35, 1.5 + row * 1.3, 3.12]}>
              <planeGeometry args={[0.95, 0.75]} />
              {isLit ? (
                <meshStandardMaterial
                  color="#ffddaa"
                  emissive="#ffaa44"
                  emissiveIntensity={0.7 + ((row * 3 + col) % 5) * 0.15}
                  roughness={0.3}
                  transparent
                  opacity={0.9}
                />
              ) : (
                <GlassMaterial tint="#99ccff" />
              )}
            </mesh>
          )
        })
      )}

      {[-1.5, 1.5].map((xOff, i) => (
        <group key={`coffee-${i}`}>
          <mesh position={[xOff, 1.3, 3.14]}>
            <planeGeometry args={[3.5, 2.2]} />
            <meshStandardMaterial
              color="#ffcc88"
              emissive="#ff8833"
              emissiveIntensity={1.2}
              roughness={0.3}
              transparent
              opacity={0.88}
            />
           </mesh>
           <mesh position={[xOff, 1.35, 3.08]}>
            <boxGeometry args={[1.6, 2.7, 0.1]} />
            <ConcreteMaterial color="#333333" />
          </mesh>
          <mesh position={[xOff, 1.25, 3.15]}>
            <planeGeometry args={[1.4, 2.5]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 3.5, 3.2]}>
        <boxGeometry args={[4, 0.9, 0.18]} />
        <EmissiveMaterial color="#ff6b35" intensity={4.5} />
      </mesh>
      <pointLight position={[0, 3.5, 4]} color="#ff6b35" intensity={8} distance={6} />

      <mesh position={[0, 3.8, 4.1]} castShadow>
        <boxGeometry args={[5, 0.12, 2.0]} />
        <meshStandardMaterial color="#cc2222" roughness={0.6} metalness={0.3} />
      </mesh>

      <mesh position={[0, 16.2, 0]} castShadow>
        <boxGeometry args={[7.3, 0.4, 6.3]} />
        <ConcreteMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}

function MetroBuilding() {
  return (
    <group position={[7, 0, -2]}>
      <mesh position={[0, 6, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 12, 5]} />
        <ConcreteMaterial color="#5a4a4a" roughness={0.86} />
      </mesh>

      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.1, 2, 5.1]} />
        <ConcreteMaterial color="#4a3020" roughness={0.9} />
      </mesh>

      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => {
          const isLit = ((row * 9 + col * 11) % 100) / 100 > 0.4;
          return (
            <mesh key={`rw-${row}-${col}`} position={[-2.2 + col * 1.4, 1.5 + row * 1.2, 2.56]}>
              <planeGeometry args={[0.85, 0.85]} />
              {isLit ? (
                <meshStandardMaterial
                  color="#ffddaa"
                  emissive="#ffaa44"
                  emissiveIntensity={0.5 + ((row + col) % 4) * 0.2}
                  roughness={0.3}
                  transparent
                  opacity={0.9}
                />
              ) : (
                <GlassMaterial tint="#88aaff" />
              )}
            </mesh>
          );
        })
      )}

      <mesh position={[0, 4, 2.62]}>
        <boxGeometry args={[3, 0.7, 0.15]} />
        <EmissiveMaterial color="#0066cc" intensity={5} />
      </mesh>
      <pointLight position={[0, 4, 3.3]} color="#0066cc" intensity={10} distance={8} />

      <mesh position={[0, 1.75, 3.6]}>
        <boxGeometry args={[3, 3.5, 2]} />
        <meshStandardMaterial color="#1a1a3a" emissive="#222244" emissiveIntensity={0.3} transparent opacity={0.6} roughness={0.2} metalness={0.6} />
      </mesh>

      <mesh position={[0, 1.75, 3.8]}>
        <boxGeometry args={[2.8, 3, 1.5]} />
        <meshStandardMaterial color="#111122" emissive="#222244" emissiveIntensity={0.3} roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.3, 4.3]} receiveShadow>
        <boxGeometry args={[3, 0.6, 2.5]} />
        <ConcreteMaterial color="#444444" />
      </mesh>

      {[0, 1, 2, 3].map(i => (
        <mesh key={`step-${i}`} position={[0, 0.15 + i * 0.15, 3.2 + i * 0.5]} receiveShadow>
          <boxGeometry args={[3, 0.15, 0.5]} />
          <ConcreteMaterial color="#555555" />
        </mesh>
      ))}

      {[-1, 1].map(side => (
        <group key={`rail-${side}`}>
          <mesh position={[side * 1.4, 1.75, 3.6]}>
            <cylinderGeometry args={[0.05, 0.05, 3.5, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.95} roughness={0.15} />
          </mesh>
          {Array.from({ length: 6 }).map((_, p) => (
            <mesh key={p} position={[side * 1.4, 0.4 + p * 0.5, 3.4 + p * 0.35]}>
              <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
              <meshStandardMaterial color="#444444" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[0, 12.175, 0]} castShadow>
        <boxGeometry args={[6.2, 0.35, 5.2]} />
        <ConcreteMaterial color="#3a3a3a" />
      </mesh>
    </group>
  );
}

function Train() {
  const trainRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (trainRef.current) {
      trainRef.current.position.x = -25 + ((state.clock.elapsedTime * 5) % 50);
    }
  });

  return (
    <group ref={trainRef} position={[-25, 0, 0]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[10, 2.8, 2.4]} />
        <meshPhysicalMaterial color="#1a5276" roughness={0.2} metalness={0.75} clearcoat={0.9} clearcoatRoughness={0.15} />
      </mesh>

      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[10.1, 0.15, 2.5]} />
        <ConcreteMaterial color="#222233" />
      </mesh>

      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[10.02, 0.25, 2.42]} />
        <EmissiveMaterial color="#ffffff" intensity={1.5} />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[10.02, 0.15, 2.43]} />
        <EmissiveMaterial color="#0088cc" intensity={2} />
      </mesh>

      <mesh position={[5.2, 1.6, 0]} castShadow>
        <boxGeometry args={[0.4, 2.8, 2.4]} />
        <meshPhysicalMaterial color="#1a5276" roughness={0.2} metalness={0.75} clearcoat={0.9} />
      </mesh>

      <mesh position={[5.41, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 1.0]} />
        <meshStandardMaterial color="#88ccff" emissive="#44aaff" emissiveIntensity={1.0} transparent opacity={0.8} />
      </mesh>

      {[-1.21, 1.21].map((z, zi) =>
        Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`win-${zi}-${i}`} position={[-3.5 + i * 1.9, 2.0, z]} rotation={[0, zi === 0 ? 0 : Math.PI, 0]}>
            <planeGeometry args={[1.4, 0.9]} />
            <meshStandardMaterial color="#aaddff" emissive="#4488cc" emissiveIntensity={0.6} transparent opacity={0.7} />
          </mesh>
        ))
      )}

      {[0.8, -0.8].map((z, i) => (
        <group key={`light-${i}`}>
          <mesh position={[5.42, 2.0, z]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <EmissiveMaterial color="#ffffcc" intensity={10} />
          </mesh>
          <spotLight position={[5.5, 2.0, z]} target-position={[15, 0, z]} color="#ffffcc" intensity={15} angle={0.5} penumbra={0.6} distance={25} />
        </group>
      ))}

      {Array.from({ length: 4 }).map((_, i) =>
        [-1.1, 1.1].map((z, zi) => (
          <mesh key={`wheel-${i}-${zi}`} position={[-3.5 + i * 2.5, 0.3, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
            <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.3} />
          </mesh>
        ))
      )}
    </group>
  );
}

function RailTracks() {
  return (
    <group>
      {[-1.3, 1.3].map(z => (
        <mesh key={z} position={[0, 0.12, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 40, 8]} />
          <meshStandardMaterial color="#666666" metalness={0.95} roughness={0.15} />
        </mesh>
      ))}

      {Array.from({ length: 37 }).map((_, i) => (
        <mesh key={i} position={[-18 + i * 1.2, 0.06, 0]} receiveShadow>
          <boxGeometry args={[0.2, 0.1, 3.2]} />
          <ConcreteMaterial color="#2a2a2a" />
        </mesh>
      ))}

      <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 40, 8]} />
        <meshStandardMaterial color="#884400" metalness={0.85} roughness={0.35} />
      </mesh>

      {Array.from({ length: 6 }).map((_, i) => (
        <group key={`pole-${i}`} position={[-16 + i * 6.4, 0, 0]}>
          <mesh position={[0, 2.5, 2.5]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 5, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[0.08, 0.08, 5]} />
            <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 5, 4]} />
            <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} metalness={0.05} />
      </mesh>

      <mesh position={[0, 0.1, 5.5]} receiveShadow>
        <boxGeometry args={[40, 0.2, 4.5]} />
        <ConcreteMaterial color="#3a3a3a" roughness={0.92} />
      </mesh>

      <mesh position={[0, 0.1, -5.5]} receiveShadow>
        <boxGeometry args={[40, 0.2, 4.5]} />
        <ConcreteMaterial color="#3a3a3a" roughness={0.92} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[40, 7]} />
        <meshStandardMaterial color="#111111" roughness={0.97} />
      </mesh>

      {Array.from({ length: 34 }).map((_, i) => (
        <mesh key={`line-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-15 + i * 1.8, 0.025, 0]}>
          <planeGeometry args={[1.0, 0.12]} />
          <meshStandardMaterial color="#ffff88" emissive="#ffcc44" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {[-1, 1].map(side => (
        <mesh key={`edge-${side}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, side * 3.3]}>
          <planeGeometry args={[40, 0.08]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.75, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 5.5, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0.5, 5.3, 0]}>
        <boxGeometry args={[1.0, 0.07, 0.07]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[1.0, 5.2, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <EmissiveMaterial color="#ffdd88" intensity={6} />
      </mesh>
      <pointLight position={[1.0, 5.2, 0]} color="#ffdd88" intensity={10} distance={14} />
    </group>
  );
}

function VendingMachine({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.9, 2.0, 0.7]} />
        <meshPhysicalMaterial color={color} roughness={0.35} metalness={0.6} clearcoat={0.5} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[0, 1.3, 0.36]}>
        <planeGeometry args={[0.7, 1.0]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff6600" emissiveIntensity={1.5} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0.36]}>
        <boxGeometry args={[0.5, 0.08, 0.05]} />
        <ConcreteMaterial color="#111111" />
      </mesh>
    </group>
  );
}

function Bench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.1, 0.5]} />
        <meshPhysicalMaterial color="#5a3a1a" roughness={0.7} metalness={0.1} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, 0.85, -0.21]} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.08]} />
        <meshPhysicalMaterial color="#5a3a1a" roughness={0.7} metalness={0.1} clearcoat={0.3} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.7, 0.275, 0]}>
          <boxGeometry args={[0.08, 0.55, 0.45]} />
          <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 3.5, 8]} />
        <ConcreteMaterial color="#3a2a15" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.0, 0]} castShadow>
        <sphereGeometry args={[1.4, 12, 12]} />
        <meshStandardMaterial color="#1a4a15" roughness={0.92} />
      </mesh>
      <mesh position={[0.5, 4.5, 0.3]} castShadow>
        <sphereGeometry args={[1.0, 10, 10]} />
        <meshStandardMaterial color="#1a4a15" roughness={0.92} />
      </mesh>
    </group>
  );
}

function OverheadWires() {
  return (
    <group>
      {Array.from({ length: 7 }).map((_, i) => (
        <group key={i}>
          <mesh position={[-12 + i * 4, 3.5, 4.5]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 7, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[-12 + i * 4, 6.8, 3]}>
            <boxGeometry args={[0.06, 0.06, 3]} />
            <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[-12 + i * 4, 6.5, 3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 3, 4]} />
            <meshStandardMaterial color="#111111" metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ProceduralEnv() {
  const { gl, scene } = useThree();

  useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x1a1a3a);
    const l1 = new THREE.PointLight(0xff6b35, 80, 150);
    l1.position.set(10, 20, 10);
    envScene.add(l1);
    const l2 = new THREE.PointLight(0x4ecdc4, 50, 150);
    l2.position.set(-15, 15, -10);
    envScene.add(l2);
    const l3 = new THREE.PointLight(0xffd93d, 30, 100);
    l3.position.set(0, 5, 20);
    envScene.add(l3);
    const l4 = new THREE.PointLight(0xff0066, 40, 120);
    l4.position.set(-20, 10, -5);
    envScene.add(l4);
    const l5 = new THREE.PointLight(0x00ff88, 25, 80);
    l5.position.set(15, 8, -15);
    envScene.add(l5);

    const rt = pmrem.fromScene(envScene);
    scene.environment = rt.texture;
    scene.background = new THREE.Color(0x0a0a18);

    pmrem.dispose();
    envScene.traverse((child) => {
      if ((child as THREE.Mesh).geometry) ((child as THREE.Mesh).geometry).dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });
    l1.dispose();
    l2.dispose();
    l3.dispose();
    l4.dispose();
    l5.dispose();
  }, [gl, scene]);

  return null;
}

function CityBuildings() {
  const buildings = useMemo(() => {
    const configs: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
      seed: number;
      style: 'modern' | 'classic' | 'tower';
    }> = [];

    const colors = ['#6b5b5b', '#7a6b6b', '#5c4e4e', '#8b7b7b', '#4a3f3f', '#6e5e5e', '#7d6d6d', '#5f4f4f'];

    for (let i = 0; i < 14; i++) {
      configs.push({
        position: [-22 + i * 3.3 + Math.sin(i * 2.3) * 0.4, 0, -10 - Math.abs(Math.sin(i * 1.7)) * 4 - 2],
        size: [2.2 + Math.sin(i * 3.1) * 0.6, 7 + Math.sin(i * 2.7) * 5 + Math.abs(Math.sin(i * 1.1)) * 3, 2.2 + Math.cos(i * 2.2) * 0.4],
        color: colors[i % 8],
        seed: i * 7 + 1,
        style: (i % 5 === 0 ? 'tower' : i % 3 === 0 ? 'classic' : 'modern') as 'modern' | 'classic' | 'tower',
      });
    }
    for (let i = 0; i < 12; i++) {
      configs.push({
        position: [-20 + i * 3.6 + Math.cos(i * 1.9) * 0.6, 0, -16 - Math.abs(Math.sin(i * 2.1)) * 3 - 2],
        size: [2.8 + Math.sin(i * 2.5) * 0.5, 10 + Math.sin(i * 3.3) * 4, 2.8 + Math.cos(i * 1.8) * 0.3],
        color: ['#5a4a4a', '#6b5b5b', '#4e3e3e', '#7a6a6a', '#554545'][i % 5],
        seed: i * 11 + 5,
        style: (i % 4 === 0 ? 'tower' : i % 2 === 0 ? 'classic' : 'modern') as 'modern' | 'classic' | 'tower',
      });
    }
    for (let i = 0; i < 10; i++) {
      configs.push({
        position: [-18 + i * 4.2 + Math.sin(i * 2.8) * 0.8, 0, -22 - Math.abs(Math.cos(i * 1.5)) * 3],
        size: [3.2 + Math.cos(i * 2.1) * 0.6, 13 + Math.sin(i * 2.9) * 6, 3.2 + Math.sin(i * 3.7) * 0.5],
        color: ['#504040', '#605050', '#483838', '#584848'][i % 4],
        seed: i * 13 + 9,
        style: (i % 3 === 0 ? 'tower' : 'modern') as 'modern' | 'tower',
      });
    }
    for (let i = 0; i < 8; i++) {
      configs.push({
        position: [-15 + i * 5 + Math.cos(i * 3.2) * 1.0, 0, -28 - Math.abs(Math.sin(i * 2.4)) * 2],
        size: [3.8 + Math.sin(i * 1.6) * 0.8, 16 + Math.cos(i * 2.6) * 8, 3.8 + Math.cos(i * 3.1) * 0.6],
        color: ['#4a3a3a', '#5a4a4a', '#3e2e2e', '#4e3e3e'][i % 4],
        seed: i * 17 + 13,
        style: 'tower' as const,
      });
    }
    for (let i = 0; i < 6; i++) {
      configs.push({
        position: [-12 + i * 5.5 + Math.sin(i * 2.3) * 1.2, 0, -35 - Math.abs(Math.cos(i * 1.8)) * 2],
        size: [4.2 + Math.cos(i * 2.4) * 0.8, 20 + Math.sin(i * 3.1) * 10, 4.2 + Math.sin(i * 2.7) * 0.6],
        color: ['#403030', '#504040', '#3a2a2a', '#483838'][i % 4],
        seed: i * 19 + 17,
        style: 'tower' as const,
      });
    }
    for (let i = 0; i < 5; i++) {
      configs.push({
        position: [-10 + i * 6 + Math.cos(i * 2.1) * 1.5, 0, -42 - Math.abs(Math.sin(i * 1.9)) * 2],
        size: [4.5 + Math.sin(i * 3.3) * 1.0, 22 + Math.cos(i * 2.5) * 12, 4.5 + Math.cos(i * 1.7) * 0.8],
        color: ['#3a2a2a', '#4a3a3a', '#302020', '#403030'][i % 4],
        seed: i * 23 + 21,
        style: 'tower' as const,
      });
    }

    return configs;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <Building key={i} position={b.position} size={b.size} color={b.color} seed={b.seed} style={b.style} />
      ))}
    </group>
  );
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={['#0a0a18']} />
      <fog attach="fog" args={['#0a0a18', 15, 80]} />

      <hemisphereLight args={['#6677aa', '#111122', 0.35]} />
      <directionalLight
        position={[15, 25, 8]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-10, 10, -5]} intensity={0.3} color="#8899cc" />
      <ambientLight args={['#303050', 0.25]} />

      <pointLight position={[-4, 6, 4]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[4, 6, -4]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[-8, 6, -2]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[8, 6, 2]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[0, 6, 6]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[-6, 6, -6]} color="#ffaa44" intensity={12} distance={20} />
      <pointLight position={[6, 6, 6]} color="#ffaa44" intensity={12} distance={20} />

      <pointLight position={[-5, 3, 2]} color="#ff0066" intensity={12} distance={15} />
      <pointLight position={[5, 3, -3]} color="#00ccff" intensity={12} distance={15} />
      <pointLight position={[0, 2.5, 8]} color="#ff3300" intensity={10} distance={12} />
      <pointLight position={[-10, 4, -5]} color="#9900ff" intensity={8} distance={14} />
      <pointLight position={[10, 3.5, 0]} color="#00ff99" intensity={8} distance={14} />
      <pointLight position={[7, 4, 5]} color="#ff00cc" intensity={10} distance={15} />

      <CityBuildings />
      <CoffeeShop />
      <MetroBuilding />
      <Train />
      <RailTracks />
      <Ground />
      <OverheadWires />

      <StreetLamp position={[-12, 0, 3.5]} />
      <StreetLamp position={[-6, 0, 3.5]} />
      <StreetLamp position={[0, 0, 3.5]} />
      <StreetLamp position={[6, 0, 3.5]} />
      <StreetLamp position={[12, 0, 3.5]} />
      <StreetLamp position={[-10, 0, -3.5]} />
      <StreetLamp position={[-2, 0, -3.5]} />
      <StreetLamp position={[8, 0, -3.5]} />

      <VendingMachine position={[3.5, 0, 3.8]} color="#cc2222" />
      <VendingMachine position={[-4, 0, 3.8]} color="#2255cc" />
      <VendingMachine position={[10, 0, 3.8]} color="#22aa22" />

      <Bench position={[-2.5, 0, 3.8]} />
      <Bench position={[5, 0, -3.8]} />
      <Bench position={[-9, 0, -3.8]} />

      <Tree position={[-10, 0, 3.8]} />
      <Tree position={[-1, 0, 3.8]} />
      <Tree position={[8, 0, 3.8]} />
      <Tree position={[-7, 0, -3.8]} />
      <Tree position={[4, 0, -3.8]} />
      <Tree position={[12, 0, -3.8]} />
    </>
  );
}

export default function TokyoStreetScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        shadows
        dpr={1}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ position: [2, 5.5, 20], fov: 50, near: 0.1, far: 800 }}
      >
        <SceneContent />
        <OrbitControls
          target={[1, 4, -2]}
          enableDamping
          dampingFactor={0.04}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={6}
          maxDistance={50}
          autoRotate
          autoRotateSpeed={0.3}
        />
        <ProceduralEnv />
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.82}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
