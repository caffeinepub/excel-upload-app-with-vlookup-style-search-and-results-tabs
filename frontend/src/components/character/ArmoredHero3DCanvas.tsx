import { useEffect, useState, Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { AnimationType } from '../../lib/character/tabAnimationMapping';
import { TripoCharacterModel } from './TripoCharacterModel';
import { CharacterDockModelFallback } from './CharacterDockModelFallback';

interface ArmoredHero3DCanvasProps {
  animation: AnimationType;
}

// Local error boundary for 3D content
interface ThreeErrorBoundaryProps {
  children: ReactNode;
}

interface ThreeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ThreeErrorBoundary extends Component<ThreeErrorBoundaryProps, ThreeErrorBoundaryState> {
  constructor(props: ThreeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ThreeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('3D Character render error (contained):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <CharacterDockModelFallback error={this.state.error?.message} />;
    }
    return this.props.children;
  }
}

export function ArmoredHero3DCanvas({ animation }: ArmoredHero3DCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        setWebGLError('WebGL not supported');
      }
    } catch (e) {
      setHasWebGL(false);
      setWebGLError('WebGL initialization failed');
    }
  }, []);

  const handleModelError = (error: Error) => {
    console.warn('Character model error (contained):', error);
    setModelError(error.message);
  };

  if (!hasWebGL || webGLError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-4">
          <div className="text-4xl mb-2">🤖</div>
          <p className="text-xs text-muted-foreground">3D view unavailable</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{webGLError}</p>
        </div>
      </div>
    );
  }

  if (modelError) {
    return <CharacterDockModelFallback error={modelError} />;
  }

  return (
    <ThreeErrorBoundary>
      <Canvas
        camera={{ position: [0, 0.8, 4.5], fov: 45 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 2, 2]} intensity={0.5} color="#ffffff" />
        
        <Suspense fallback={null}>
          <TripoCharacterModel animation={animation} onError={handleModelError} />
        </Suspense>
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </ThreeErrorBoundary>
  );
}
