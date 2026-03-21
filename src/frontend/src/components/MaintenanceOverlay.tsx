import { useEffect, useState } from "react";

export function MaintenanceOverlay() {
  const [sweepX, setSweepX] = useState(-120);
  const [dustParticles, setDustParticles] = useState<
    { id: number; x: number; y: number; opacity: number; size: number }[]
  >([]);

  // Animate the sweeper from left to right continuously
  useEffect(() => {
    let x = -120;
    const speed = 2.2;
    let raf: number;
    const tick = () => {
      x += speed;
      if (x > window.innerWidth + 120) x = -120;
      setSweepX(x);

      // Spawn dust particle occasionally
      if (Math.random() < 0.12) {
        const particle = {
          id: Date.now() + Math.random(),
          x: x - 10 + Math.random() * 30,
          y: window.innerHeight * 0.62 + Math.random() * 40,
          opacity: 0.7 + Math.random() * 0.3,
          size: 4 + Math.random() * 10,
        };
        setDustParticles((prev) => [...prev.slice(-30), particle]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fade out dust particles over time
  useEffect(() => {
    const interval = setInterval(() => {
      setDustParticles((prev) =>
        prev
          .map((p) => ({ ...p, opacity: p.opacity - 0.05 }))
          .filter((p) => p.opacity > 0),
      );
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        overflow: "hidden",
      }}
    >
      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.5,
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Spinning gear / loading ring */}
      <div className="relative mb-8">
        <div
          className="w-24 h-24 rounded-full border-4 border-blue-400/30 border-t-blue-400 animate-spin"
          style={{ animationDuration: "1.5s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🧹</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">
        Under Maintenance
      </h1>
      <p className="text-blue-200 text-lg mb-1">
        We're tidying things up for you
      </p>
      <p className="text-blue-300/70 text-sm mt-2">
        Please wait while the admin completes maintenance
      </p>

      {/* Animated progress dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400"
            style={{
              animation: "bounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Floor sweeper character — SVG broom + mop guy */}
      <svg
        aria-label="Cleaning character"
        role="img"
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{
          position: "fixed",
          bottom: "12%",
          left: sweepX,
          transition: "none",
          filter: "drop-shadow(0 0 8px rgba(96,165,250,0.5))",
        }}
      >
        {/* Body */}
        <ellipse cx="50" cy="55" rx="14" ry="18" fill="#3b82f6" />
        {/* Head */}
        <circle cx="50" cy="32" r="12" fill="#fbbf24" />
        {/* Eyes */}
        <circle cx="46" cy="30" r="2" fill="#1e3a5f" />
        <circle cx="54" cy="30" r="2" fill="#1e3a5f" />
        {/* Smile */}
        <path
          d="M44 36 Q50 41 56 36"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Arms holding broom */}
        <line
          x1="36"
          y1="52"
          x2="20"
          y2="68"
          stroke="#fbbf24"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="64"
          y1="52"
          x2="80"
          y2="35"
          stroke="#fbbf24"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Broom stick */}
        <line
          x1="10"
          y1="72"
          x2="55"
          y2="38"
          stroke="#92400e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Broom head */}
        <ellipse
          cx="8"
          cy="74"
          rx="10"
          ry="5"
          fill="#f59e0b"
          transform="rotate(-40 8 74)"
        />
        {/* Legs */}
        <line
          x1="44"
          y1="72"
          x2="40"
          y2="88"
          stroke="#1d4ed8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="56"
          y1="72"
          x2="60"
          y2="88"
          stroke="#1d4ed8"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>

      {/* Dust particles */}
      {dustParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-amber-200"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Animated floor line */}
      <div
        className="fixed w-full h-0.5"
        style={{
          bottom: "12%",
          background:
            "linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent)",
        }}
      />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
