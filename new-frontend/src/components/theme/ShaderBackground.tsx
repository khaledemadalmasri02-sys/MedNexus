import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BG_VERTEX_SHADER, FRAGMENT_SHADERS } from "./shaders/lightThemeShaders";

interface ShaderBackgroundProps {
  themeId: string;
}

export function ShaderBackground({ themeId }: ShaderBackgroundProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  const fragmentShader = FRAGMENT_SHADERS[themeId] || FRAGMENT_SHADERS["clinical-white"];

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: {
        value: new THREE.Vector2(size.width * viewport.dpr, size.height * viewport.dpr),
      },
    }),
    [size, viewport.dpr]
  );

  useEffect(() => {
    uniforms.resolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
  }, [size, viewport.dpr, uniforms]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, 0, -30]} frustumCulled={false}>
      <planeGeometry args={[120, 120]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={BG_VERTEX_SHADER}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
