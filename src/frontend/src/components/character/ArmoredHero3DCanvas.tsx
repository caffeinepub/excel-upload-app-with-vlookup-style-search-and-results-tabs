import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimationType } from '../../lib/character/tabAnimationMapping';

interface ArmoredHeroProps {
  animation: AnimationType;
}

function ArmoredHeroMesh({ animation }: ArmoredHeroProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current;

    // Reset transforms
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;
    groupRef.current.position.y = 0;

    switch (animation) {
      case 'dance':
        // Energetic dance with rotation and bounce
        groupRef.current.rotation.y = Math.sin(time * 4) * 0.5;
        groupRef.current.position.y = Math.abs(Math.sin(time * 8)) * 0.3;
        groupRef.current.rotation.z = Math.sin(time * 6) * 0.2;
        break;

      case 'drinkWater':
        // Tilt head back periodically
        const drinkCycle = (time % 4) / 4;
        if (drinkCycle < 0.3) {
          groupRef.current.rotation.x = -drinkCycle * 0.8;
        } else if (drinkCycle < 0.5) {
          groupRef.current.rotation.x = -0.24;
        } else {
          groupRef.current.rotation.x = 0;
        }
        groupRef.current.rotation.y += Math.sin(time * 0.5) * 0.05;
        break;

      case 'jump':
        // Jump up and down
        const jumpPhase = Math.sin(time * 3);
        groupRef.current.position.y = jumpPhase > 0 ? jumpPhase * 0.5 : 0;
        groupRef.current.rotation.y = time * 0.5;
        break;

      case 'call':
        // Hold hand to ear, slight head tilt
        groupRef.current.rotation.z = Math.sin(time * 2) * 0.15 + 0.2;
        groupRef.current.rotation.y = Math.sin(time * 1) * 0.1;
        break;

      case 'funnyMove':
        // Silly wobble and spin
        groupRef.current.rotation.y = time * 2;
        groupRef.current.rotation.z = Math.sin(time * 5) * 0.3;
        groupRef.current.position.y = Math.sin(time * 4) * 0.2;
        break;

      case 'typing':
        // Slight forward lean with subtle bounce
        groupRef.current.rotation.x = 0.1;
        groupRef.current.position.y = Math.sin(time * 8) * 0.05;
        break;

      case 'thinking':
        // Slow head tilt side to side
        groupRef.current.rotation.z = Math.sin(time * 0.8) * 0.2;
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.15;
        break;

      case 'celebrate':
        // Arms up celebration
        groupRef.current.position.y = Math.sin(time * 3) * 0.15 + 0.1;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.3;
        break;

      case 'wave':
        // Wave motion
        groupRef.current.rotation.z = Math.sin(time * 4) * 0.3;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.2;
        break;

      case 'stretch':
        // Stretch up
        groupRef.current.position.y = Math.sin(time * 1.5) * 0.2 + 0.1;
        groupRef.current.rotation.x = Math.sin(time * 1.5) * 0.1;
        break;

      case 'nod':
        // Nodding motion
        groupRef.current.rotation.x = Math.sin(time * 3) * 0.2;
        break;

      case 'idle':
      default:
        // Gentle breathing idle
        groupRef.current.position.y = Math.sin(time * 2) * 0.05;
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
        break;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#c0392b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Visor */}
      <mesh position={[0, 1.5, 0.31]}>
        <boxGeometry args={[0.5, 0.3, 0.05]} />
        <meshStandardMaterial color="#3498db" metalness={0.9} roughness={0.1} emissive="#3498db" emissiveIntensity={0.3} />
      </mesh>

      {/* Body/Torso */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.5]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Arc Reactor (chest) */}
      <mesh position={[0, 0.7, 0.26]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#3498db" metalness={0.9} roughness={0.1} emissive="#3498db" emissiveIntensity={0.8} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.5, 0.6, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#c0392b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.5, 0.6, 0]}>
        <boxGeometry args={[0.25, 1, 0.25]} />
        <meshStandardMaterial color="#c0392b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.25, -0.5, 0]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#c0392b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.25, -0.5, 0]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#c0392b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Left Boot */}
      <mesh position={[-0.25, -1.15, 0.1]}>
        <boxGeometry args={[0.32, 0.15, 0.4]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Right Boot */}
      <mesh position={[0.25, -1.15, 0.1]}>
        <boxGeometry args={[0.32, 0.15, 0.4]} />
        <meshStandardMaterial color="#7f8c8d" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

interface ArmoredHero3DCanvasProps {
  animation: AnimationType;
}

export function ArmoredHero3DCanvas({ animation }: ArmoredHero3DCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        setError('WebGL not supported');
      }
    } catch (e) {
      setHasWebGL(false);
      setError('WebGL initialization failed');
    }
  }, []);

  if (!hasWebGL || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-4">
          <div className="text-4xl mb-2">🤖</div>
          <p className="text-xs text-muted-foreground">3D view unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 1, 4], fov: 50 }}
      className="w-full h-full"
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      <pointLight position={[0, 2, 2]} intensity={0.8} color="#3498db" />
      
      <ArmoredHeroMesh animation={animation} />
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
    </Canvas>
  );
}
