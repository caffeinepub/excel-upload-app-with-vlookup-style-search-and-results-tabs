import { Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ----- 3D Cleaner Character -----
function CleanerCharacter({
  position,
}: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  const broomRef = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 2;
    const swing = Math.sin(t.current) * 0.4;
    if (armLRef.current) armLRef.current.rotation.x = swing;
    if (armRRef.current) armRRef.current.rotation.x = -swing + 0.6;
    if (legLRef.current) legLRef.current.rotation.x = -swing * 0.6;
    if (legRRef.current) legRRef.current.rotation.x = swing * 0.6;
    // Broom sweeping motion
    if (broomRef.current) {
      broomRef.current.rotation.z = Math.sin(t.current * 1.5) * 0.25 + 0.3;
      broomRef.current.position.x = Math.sin(t.current * 1.5) * 0.15 - 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Helmet/Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial color="#e0e8ff" metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 1.6, 0.28]}>
        <sphereGeometry
          args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]}
        />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      {/* Eyes inside visor */}
      <mesh position={[-0.1, 1.62, 0.38]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive="#3b82f6"
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[0.1, 1.62, 0.38]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial
          color="#1e40af"
          emissive="#3b82f6"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Suit Body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.7, 8, 16]} />
        <meshStandardMaterial
          color="#c7d9f8"
          metalness={0.15}
          roughness={0.6}
        />
      </mesh>
      {/* Chest badge */}
      <mesh position={[0, 0.95, 0.31]}>
        <boxGeometry args={[0.22, 0.12, 0.02]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Backpack (life support) */}
      <mesh position={[0, 0.9, -0.35]}>
        <boxGeometry args={[0.3, 0.4, 0.18]} />
        <meshStandardMaterial color="#93c5fd" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Left Arm */}
      <mesh ref={armLRef} position={[-0.45, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <meshStandardMaterial color="#bfdbfe" metalness={0.1} roughness={0.7} />
      </mesh>
      {/* Right Arm (holds broom) */}
      <mesh
        ref={armRRef}
        position={[0.45, 0.95, 0.1]}
        rotation={[0.6, 0, 0]}
        castShadow
      >
        <capsuleGeometry args={[0.1, 0.45, 6, 8]} />
        <meshStandardMaterial color="#bfdbfe" metalness={0.1} roughness={0.7} />
      </mesh>
      {/* Left Leg */}
      <mesh ref={legLRef} position={[-0.18, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.5, 6, 8]} />
        <meshStandardMaterial color="#dbeafe" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Right Leg */}
      <mesh ref={legRRef} position={[0.18, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.5, 6, 8]} />
        <meshStandardMaterial color="#dbeafe" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Boots */}
      <mesh position={[-0.18, -0.1, 0.05]}>
        <boxGeometry args={[0.22, 0.12, 0.32]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0.18, -0.1, 0.05]}>
        <boxGeometry args={[0.22, 0.12, 0.32]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Broom / Mop */}
      <group ref={broomRef} position={[-0.5, 0.75, 0.1]}>
        {/* Handle */}
        <mesh rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          <meshStandardMaterial
            color="#a16207"
            metalness={0.1}
            roughness={0.8}
          />
        </mesh>
        {/* Broom head */}
        <mesh position={[0, -0.9, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.3]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.05}
            roughness={0.9}
          />
        </mesh>
        {/* Broom bristles */}
        {[-0.2, -0.05, 0.1, 0.25].map((bx) => (
          <mesh key={String(bx)} position={[bx, -1.0, 0]}>
            <cylinderGeometry args={[0.015, 0.005, 0.2, 4]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        ))}
        {/* Dust cloud at broom tip */}
        <mesh position={[0, -1.05, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#fef3c7" transparent opacity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// ----- Floating dust specks -----
function DustParticles() {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const particlesData = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.015,
      vy: Math.random() * 0.008 + 0.002,
      life: Math.random(),
    })),
  );

  useFrame(() => {
    const data = particlesData.current;
    for (let i = 0; i < count; i++) {
      const p = data[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.003;
      if (p.y > 4 || p.life <= 0) {
        p.x = (Math.random() - 0.5) * 12;
        p.y = -3;
        p.life = 0.8 + Math.random() * 0.2;
        p.vx = (Math.random() - 0.5) * 0.015;
      }
      const s = 0.04 + p.life * 0.08;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      if (meshRef.current) meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#fde68a" transparent opacity={0.55} />
    </instancedMesh>
  );
}

// ----- Dashboard ghost icons (things being "cleaned") -----
function DashboardGhosts() {
  const icons = [
    {
      pos: [-4.5, 2.2, -1] as [number, number, number],
      color: "#60a5fa",
      label: "Dashboard",
    },
    {
      pos: [-2.5, 2.2, -1] as [number, number, number],
      color: "#34d399",
      label: "Attendance",
    },
    {
      pos: [-0.5, 2.2, -1] as [number, number, number],
      color: "#a78bfa",
      label: "Team",
    },
    {
      pos: [1.5, 2.2, -1] as [number, number, number],
      color: "#fb923c",
      label: "Expenses",
    },
    {
      pos: [3.5, 2.2, -1] as [number, number, number],
      color: "#f87171",
      label: "Admin",
    },
    {
      pos: [-4.5, 0.5, -1] as [number, number, number],
      color: "#38bdf8",
      label: "Calendar",
    },
    {
      pos: [-2.5, 0.5, -1] as [number, number, number],
      color: "#4ade80",
      label: "Reminders",
    },
    {
      pos: [-0.5, 0.5, -1] as [number, number, number],
      color: "#c084fc",
      label: "Notes",
    },
    {
      pos: [1.5, 0.5, -1] as [number, number, number],
      color: "#fbbf24",
      label: "Search",
    },
    {
      pos: [3.5, 0.5, -1] as [number, number, number],
      color: "#f472b6",
      label: "Profile",
    },
    {
      pos: [-3.5, -1.2, -1] as [number, number, number],
      color: "#818cf8",
      label: "Chat",
    },
    {
      pos: [-1.5, -1.2, -1] as [number, number, number],
      color: "#2dd4bf",
      label: "Upload",
    },
    {
      pos: [0.5, -1.2, -1] as [number, number, number],
      color: "#fb7185",
      label: "History",
    },
    {
      pos: [2.5, -1.2, -1] as [number, number, number],
      color: "#a3e635",
      label: "Drug",
    },
  ];

  return (
    <>
      {icons.map((ic, i) => (
        <Float
          key={ic.label}
          speed={1.5 + i * 0.1}
          rotationIntensity={0.2}
          floatIntensity={0.3}
        >
          <mesh position={ic.pos}>
            <boxGeometry args={[0.7, 0.7, 0.08]} />
            <meshStandardMaterial
              color={ic.color}
              transparent
              opacity={0.22}
              wireframe={false}
              emissive={ic.color}
              emissiveIntensity={0.15}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// ----- Walking character with horizontal traversal -----
function WalkingCleaner() {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const x = useRef(-7);
  const speed = 1.4;

  useFrame((_, delta) => {
    t.current += delta;
    x.current += delta * speed;
    if (x.current > 7.5) x.current = -7;
    if (groupRef.current) {
      groupRef.current.position.x = x.current;
      // Bob up/down while walking
      groupRef.current.position.y =
        -1.2 + Math.abs(Math.sin(t.current * 3)) * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      <CleanerCharacter position={[0, 0, 0]} />
    </group>
  );
}

// ----- Sparkle when broom passes (sweep effect trail) -----
function SweepTrail() {
  const trailRef = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (trailRef.current) {
      // The trail follows a sine wave at floor level
      const xPos = ((t.current * 1.4) % 15) - 7;
      trailRef.current.position.x = xPos - 0.8;
      trailRef.current.position.y = -1.35;
    }
  });

  return (
    <group ref={trailRef}>
      <mesh>
        <planeGeometry args={[1.2, 0.12]} />
        <meshStandardMaterial
          color="#fef9c3"
          emissive="#fde047"
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ----- Main export -----
export function MaintenanceOverlay() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : `${d}.`));
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #040d1a 0%, #071a33 40%, #0c2044 70%, #040d1a 100%)",
        overflow: "hidden",
      }}
    >
      {/* 3D Canvas — full screen */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            color="#bfdbfe"
            castShadow
          />
          <pointLight position={[-4, 3, 2]} intensity={0.8} color="#60a5fa" />
          <pointLight position={[4, -2, 2]} intensity={0.5} color="#a78bfa" />
          <pointLight position={[0, 0, 4]} intensity={0.3} color="#fbbf24" />

          {/* Floor */}
          <mesh
            position={[0, -1.5, -0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[24, 8]} />
            <meshStandardMaterial
              color="#0f2040"
              metalness={0.4}
              roughness={0.6}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Faint grid on floor */}
          <gridHelper
            args={[24, 24, "#1e3a5f", "#1e3a5f"]}
            position={[0, -1.49, 0]}
          />

          {/* Dashboard ghost icons floating behind */}
          <DashboardGhosts />

          {/* Dust particles */}
          <DustParticles />

          {/* Sweep light trail on floor */}
          <SweepTrail />

          {/* Walking cleaner astronaut */}
          <WalkingCleaner />
        </Canvas>
      </div>

      {/* Overlay UI on top of 3D */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pointer-events-none select-none">
        {/* Top spacer */}
        <div className="flex-1" />

        {/* Center message block */}
        <div
          className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl"
          style={{
            background: "rgba(4, 13, 26, 0.72)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(96, 165, 250, 0.18)",
            boxShadow: "0 0 40px rgba(59, 130, 246, 0.12)",
          }}
        >
          {/* Glowing ring */}
          <div className="relative flex items-center justify-center mb-1">
            <div
              className="w-16 h-16 rounded-full"
              style={{
                border: "2px solid rgba(96,165,250,0.3)",
                boxShadow:
                  "0 0 24px rgba(59,130,246,0.4), inset 0 0 12px rgba(59,130,246,0.1)",
                animation: "spin 3s linear infinite",
              }}
            />
            <div
              className="absolute w-12 h-12 rounded-full"
              style={{
                border: "2px solid rgba(167,139,250,0.3)",
                animation: "spin 2s linear infinite reverse",
              }}
            />
            <span
              className="absolute text-2xl"
              style={{ filter: "drop-shadow(0 0 8px #60a5fa)" }}
            >
              🧹
            </span>
          </div>

          <h1
            className="text-2xl font-bold tracking-widest uppercase"
            style={{
              background: "linear-gradient(90deg, #93c5fd, #e0e7ff, #93c5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Under Maintenance
          </h1>

          <p className="text-blue-300 text-base font-medium">
            Cleaning the dashboard for you{dots}
          </p>

          <p className="text-blue-400/60 text-sm text-center max-w-xs">
            Our astronaut is dusting everything down. Normal access will resume
            shortly.
          </p>

          {/* Animated dots */}
          <div className="flex gap-2 mt-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`dot-${i}`}
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{
                  animation: "bounce 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex-1" />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
