import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface AssistantWidget3DProps {
  pendingTodos: number;
  remindersCount: number;
  notesCount: number;
  onSearchOpen: () => void;
}

function AssistantPanel({ pendingTodos, remindersCount, notesCount, onSearchOpen }: AssistantWidget3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5 + 3) * 0.05;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2 + 1) * 0.03;

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 2.5) * 0.1;
    }
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Holographic glow */}
      <mesh ref={glowRef} position={[0, 0, -0.1]}>
        <planeGeometry args={[3.8, 2.2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.2} transparent opacity={0.2} />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={pulseRef} position={[0, 0, -0.05]}>
        <torusGeometry args={[1.8, 0.015, 8, 64]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>

      {/* Card body */}
      <mesh castShadow>
        <boxGeometry args={[3.6, 2.0, 0.1]} />
        <meshStandardMaterial color="#071020" metalness={0.8} roughness={0.1} transparent opacity={0.92} />
      </mesh>

      {/* Scan lines effect */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[3.6, 2.0]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.03} />
      </mesh>

      {/* HTML content */}
      <Html position={[0, 0, 0.07]} center distanceFactor={4} style={{ width: '260px', pointerEvents: 'auto' }}>
        <div style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none', padding: '6px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#67e8f9', letterSpacing: '0.5px' }}>Your Assistant</div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>Always here to help</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '6px', padding: '4px', textAlign: 'center', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc' }}>{pendingTodos}</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Todos</div>
            </div>
            <div style={{ background: 'rgba(168,85,247,0.15)', borderRadius: '6px', padding: '4px', textAlign: 'center', border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#c4b5fd' }}>{remindersCount}</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Reminders</div>
            </div>
            <div style={{ background: 'rgba(6,182,212,0.15)', borderRadius: '6px', padding: '4px', textAlign: 'center', border: '1px solid rgba(6,182,212,0.3)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#67e8f9' }}>{notesCount}</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Notes</div>
            </div>
          </div>

          <button
            onClick={onSearchOpen}
            style={{
              width: '100%',
              padding: '5px 8px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(99,102,241,0.3))',
              border: '1px solid rgba(6,182,212,0.4)',
              borderRadius: '6px',
              color: '#67e8f9',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            ✦ EXPLORE UNIVERSE
          </button>
        </div>
      </Html>
    </group>
  );
}

export function AssistantWidget3D(props: AssistantWidget3DProps) {
  return <AssistantPanel {...props} />;
}
