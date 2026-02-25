import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimationType } from '../../lib/character/tabAnimationMapping';

interface TripoCharacterModelProps {
  animation: AnimationType;
  onError?: (error: Error) => void;
}

export function TripoCharacterModel({ animation }: TripoCharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Procedural animations for the geometric character
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current;

    // Reset transforms
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.set(0, 0, 0);

    switch (animation) {
      case 'idle':
        // Subtle breathing/sway
        groupRef.current.position.y = Math.sin(time * 2) * 0.05;
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.03;
        break;

      case 'walk':
        // Walking bob and sway
        groupRef.current.position.y = Math.abs(Math.sin(time * 4)) * 0.15;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.15;
        groupRef.current.position.z = Math.sin(time * 2) * 0.08;
        break;

      case 'dance':
        // Energetic movement
        groupRef.current.rotation.y = Math.sin(time * 4) * 0.6;
        groupRef.current.position.y = Math.abs(Math.sin(time * 8)) * 0.25;
        groupRef.current.rotation.z = Math.sin(time * 6) * 0.1;
        break;

      case 'jump':
        // Jump motion
        const jumpPhase = Math.sin(time * 3);
        groupRef.current.position.y = jumpPhase > 0 ? jumpPhase * 0.5 : 0;
        break;

      case 'wave':
        // Gentle sway
        groupRef.current.rotation.z = Math.sin(time * 3) * 0.15;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.1;
        break;

      case 'celebrate':
        // Celebration bounce
        groupRef.current.position.y = Math.abs(Math.sin(time * 6)) * 0.3;
        groupRef.current.rotation.y = time * 2;
        break;

      case 'thinking':
        // Slow contemplative sway
        groupRef.current.rotation.x = Math.sin(time * 1) * 0.05;
        groupRef.current.position.y = Math.sin(time * 1.5) * 0.03;
        break;

      default:
        // Default idle
        groupRef.current.position.y = Math.sin(time * 2) * 0.05;
        break;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* Body - main capsule */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 16, 32]} />
        <meshStandardMaterial 
          color="#4a9eff" 
          metalness={0.3} 
          roughness={0.4}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial 
          color="#5ab0ff" 
          metalness={0.2} 
          roughness={0.3}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.12, 1.85, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.12, 1.85, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>

      {/* Pupils */}
      <mesh position={[-0.12, 1.85, 0.35]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.12, 1.85, 0.35]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Smile */}
      <mesh position={[0, 1.65, 0.32]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.45, 0.9, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial 
          color="#4a9eff" 
          metalness={0.3} 
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0.45, 0.9, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial 
          color="#4a9eff" 
          metalness={0.3} 
          roughness={0.4}
        />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.15, 0.05, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial 
          color="#3a7ecf" 
          metalness={0.3} 
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0.15, 0.05, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial 
          color="#3a7ecf" 
          metalness={0.3} 
          roughness={0.4}
        />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.15, -0.35, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial 
          color="#2a5e9f" 
          metalness={0.4} 
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.15, -0.35, 0.1]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.25]} />
        <meshStandardMaterial 
          color="#2a5e9f" 
          metalness={0.4} 
          roughness={0.3}
        />
      </mesh>

      {/* Antenna - tech detail */}
      <mesh position={[0, 2.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#ff6b6b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial 
          color="#ff6b6b" 
          emissive="#ff6b6b" 
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
