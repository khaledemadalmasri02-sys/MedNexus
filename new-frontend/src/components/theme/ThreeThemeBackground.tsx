import { Suspense, lazy, useMemo, useEffect, useState, useCallback, Component, type ReactNode, createContext, useContext } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import { useTheme } from "../../context/ThemeContext";
import { useLocation } from "react-router-dom";
import StarfieldBackground from "../StarfieldBackground";
import type { ThemeId } from "../../lib/themes";
import * as THREE from "three";

const _originalConsoleWarn = console.warn;
console.warn = function (...args: unknown[]) {
  const msg = args.join(" ");
  if (msg.includes("THREE.Clock") && msg.includes("deprecated")) return;
  _originalConsoleWarn.apply(console, args);
};

const WebGLBudgetContext = createContext<{ hasHeavyWebGLRoute: boolean }>({ hasHeavyWebGLRoute: false });

export function WebGLBudgetProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const heavyRoutes = ["/game"];
  const hasHeavyWebGLRoute = heavyRoutes.some((r) => location.pathname.startsWith(r));
  return (
    <WebGLBudgetContext.Provider value={{ hasHeavyWebGLRoute }}>
      {children}
    </WebGLBudgetContext.Provider>
  );
}

export function useWebGLBudget() {
  return useContext(WebGLBudgetContext);
}

class WebGLBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn("WebGL scene crashed:", error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function WebGLScene({ sceneId }: { sceneId: ThemeId }) {
  const SceneComponent = useMemo(() => SCENE_MAP[sceneId] || SceneNebula, [sceneId]);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor(0x000000, 0);
    const canvas = gl.domElement as HTMLCanvasElement;
    if (!canvas) return;

    const handleContextLoss = (e: Event) => {
      e.preventDefault();
      console.warn("WebGL context lost, pausing scene");
      setContextLost(true);
    };
    const handleContextRestored = () => {
      console.info("WebGL context restored");
      setContextLost(false);
      setRecoveryKey((k) => k + 1);
    };
    canvas.addEventListener("webglcontextlost", handleContextLoss as EventListener);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <Fallback />
      </div>
    );
  }

  if (contextLost) {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <SceneFallback />
      </div>
    );
  }

  return (
    <WebGLBoundary fallback={<SceneFallback />}>
      {mounted && ready ? (
        <div
          className="fixed inset-0 z-0 pointer-events-none animate-fade-in"
          aria-hidden="true"
        >
          <Canvas
            key={recoveryKey}
            dpr={[1, 1.25]}
            frameloop="always"
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
              failIfMajorPerformanceCaveat: false,
            }}
            camera={{ position: [0, 0, 22], fov: 50, near: 0.1, far: 500 }}
            style={{ background: "transparent", display: "block" }}
            onCreated={handleCanvasCreated}
            onError={() => {
              setHasError(true);
            }}
          >
            <Suspense key={sceneId} fallback={null}>
              <SceneComponent />
              <Preload all />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        <SceneFallback />
      )}
    </WebGLBoundary>
  );
}

const SceneNebula = lazy(() => import("./SceneNebula"));
const SceneEmber = lazy(() => import("./SceneEmber"));
const TokyoStreetScene = lazy(() => import("./tokyo-street/TokyoStreetScene"));
const SceneCarDrift = lazy(() => import("./SceneCarDrift"));
const SceneFormula = lazy(() => import("./SceneFormula"));
const SceneClinicalWhite = lazy(() => import("./SceneClinicalWhite"));
const SceneSurgicalGreen = lazy(() => import("./SceneSurgicalGreen"));
const SceneWarmParchment = lazy(() => import("./SceneWarmParchment"));
const SceneLavenderMist = lazy(() => import("./SceneLavenderMist"));

const SCENE_MAP: Record<ThemeId, React.LazyExoticComponent<React.ComponentType>> = {
  nebula: SceneNebula,
  ember: SceneEmber,
  tokyo: TokyoStreetScene,
  "car-drift": SceneCarDrift,
  formula: SceneFormula,
  "clinical-white": SceneClinicalWhite,
  "surgical-green": SceneSurgicalGreen,
  "warm-parchment": SceneWarmParchment,
  "lavender-mist": SceneLavenderMist,
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) as WebGLRenderingContext | null ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true }) as WebGLRenderingContext | null;
    if (!gl) return false;
    const renderer = gl.getParameter(gl.RENDERER);
    return typeof renderer === "string";
  } catch {
    return false;
  }
}

function Fallback() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
      style={{ background: "var(--bg-void)" }}
    />
  );
}

function SceneFallback() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
      style={{
        background: "radial-gradient(ellipse at 50% 50%, #0a1628 0%, #050816 70%, #020408 100%)",
      }}
    />
  );
}

export function ThreeThemeBackground() {
  const { themeId } = useTheme();
  const [webglAvailable] = useState(() => hasWebGL());
  const { hasHeavyWebGLRoute } = useWebGLBudget();
  const [ambientEnabled, setAmbientEnabled] = useState(() => {
    try {
      const saved = window.localStorage.getItem("guest_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.ambientEnabled !== false;
      }
    } catch { /* ignore */ }
    return true;
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = window.localStorage.getItem("guest_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setAmbientEnabled(parsed.ambientEnabled !== false);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (hasHeavyWebGLRoute) {
    return <Fallback />;
  }

  if (!ambientEnabled) {
    return <Fallback />;
  }

  if (!webglAvailable) {
    return <StarfieldBackground />;
  }

  if (themeId === "tokyo") {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <TokyoStreetScene />
      </div>
    );
  }

  if (themeId === "formula") {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <SceneFormula />
      </div>
    );
  }

  return <WebGLScene sceneId={themeId} />;
}
