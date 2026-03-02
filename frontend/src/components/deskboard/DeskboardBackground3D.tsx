import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
      spd[i] = 0.2 + Math.random() * 0.5;
    }
    return { positions: pos, speeds: spd };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * speeds[i] * 0.15;
      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = -6;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#6366f1" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function GeometricRings() {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ring1.current) ring1.current.rotation.z += delta * 0.15;
    if (ring2.current) ring2.current.rotation.x += delta * 0.1;
    if (ring3.current) ring3.current.rotation.y += delta * 0.08;
  });

  return (
    <>
      <mesh ref={ring1} position={[-5, 2, -3]}>
        <torusGeometry args={[1.5, 0.02, 8, 64]} />
        <meshStandardMaterial color="#4a9eff" transparent opacity={0.2} emissive="#4a9eff" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={ring2} position={[5, -1, -4]}>
        <torusGeometry args={[2, 0.02, 8, 64]} />
        <meshStandardMaterial color="#a855f7" transparent opacity={0.15} emissive="#a855f7" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={ring3} position={[0, -3, -5]}>
        <torusGeometry args={[3, 0.015, 8, 64]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.12} emissive="#06b6d4" emissiveIntensity={0.2} />
      </mesh>
    </>
  );
}

function GridPlane() {
  const gridRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!gridRef.current) return;
    const mat = gridRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.06 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
  });

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -2]}>
      <planeGeometry args={[30, 30, 30, 30]} />
      <meshStandardMaterial
        color="#6366f1"
        wireframe
        transparent
        opacity={0.06}
      />
    </mesh>
  );
}

export function DeskboardBackground3D() {
  return (
    <>
      <FloatingParticles />
      <GeometricRings />
      <GridPlane />
    </>
  );
}
