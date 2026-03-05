import { Canvas } from "@react-three/fiber";
import React, {
  Suspense,
  Component,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { AssistantWidget3D } from "./AssistantWidget3D";
import { DeskboardBackground3D } from "./DeskboardBackground3D";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ThreeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(e: Error) {
    console.warn("3D Deskboard error:", e);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface Deskboard3DCanvasProps {
  pendingTodos: number;
  remindersCount: number;
  notesCount: number;
  onSearchOpen: () => void;
}

function Scene3D({
  pendingTodos,
  remindersCount,
  notesCount,
  onSearchOpen,
}: Deskboard3DCanvasProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} castShadow />
      <pointLight position={[-4, 2, 3]} intensity={0.5} color="#6366f1" />
      <pointLight position={[4, -2, 3]} intensity={0.4} color="#06b6d4" />

      <DeskboardBackground3D />

      {/* Assistant - center */}
      <group position={[0, 0, 0]}>
        <AssistantWidget3D
          pendingTodos={pendingTodos}
          remindersCount={remindersCount}
          notesCount={notesCount}
          onSearchOpen={onSearchOpen}
        />
      </group>
    </>
  );
}

export function Deskboard3DCanvas(props: Deskboard3DCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    return null;
  }

  return (
    <ThreeErrorBoundary fallback={null}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Scene3D {...props} />
        </Suspense>
      </Canvas>
    </ThreeErrorBoundary>
  );
}
