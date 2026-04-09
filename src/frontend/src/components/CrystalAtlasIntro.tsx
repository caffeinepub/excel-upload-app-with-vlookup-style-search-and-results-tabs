import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

// Crystal particles with deterministic positions (computed once at module level)
const CRYSTAL_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: `cp-${i}`,
  size: 4 + ((i * 7 + 3) % 9), // 4–12px
  left: ((i * 37 + 11) % 90) + 5, // 5–95%
  top: ((i * 53 + 17) % 80) + 10, // 10–90%
  color: ["#7dd3fc", "#a78bfa", "#38bdf8", "#818cf8", "#c4b5fd", "#67e8f9"][
    i % 6
  ],
  duration: 3 + ((i * 13 + 2) % 4), // 3–6s
  delay: ((i * 7 + 1) % 30) / 10, // 0–3s
  driftX: ((i * 19 + 5) % 40) - 20, // –20..+20px
}));

// Star field computed at module level
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: `st-${i}`,
  width: 1 + (i % 3),
  left: (i * 41 + 7) % 100,
  top: (i * 67 + 13) % 100,
  opacity: 0.1 + ((i * 11) % 5) / 10,
  duration: 2 + (i % 3),
  delay: (i % 20) / 10,
}));

// Progress dots
const DOTS = ["d0", "d1", "d2", "d3", "d4"];

interface Props {
  onComplete: () => void;
}

export function CrystalAtlasIntro({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start fade-out at 4.5s, call onComplete at 5s
    const fadeTimer = setTimeout(() => setVisible(false), 4500);
    const doneTimer = setTimeout(onComplete, 5000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="crystal-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            zIndex: 99999,
            background:
              "linear-gradient(135deg, #0a0015 0%, #0d1b3e 50%, #001a3e 100%)",
          }}
          aria-label="Crystal Atlas intro screen"
        >
          {/* Star field background */}
          <div className="absolute inset-0 pointer-events-none">
            {STARS.map((s) => (
              <motion.div
                key={s.id}
                className="absolute rounded-full bg-white"
                style={{
                  width: s.width,
                  height: s.width,
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  opacity: s.opacity,
                }}
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{
                  duration: s.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: s.delay,
                }}
              />
            ))}
          </div>

          {/* Crystal particles floating upward */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {CRYSTAL_PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-sm"
                style={{
                  width: p.size,
                  height: p.size,
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  background: p.color,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}88`,
                  rotate: 45,
                }}
                animate={{
                  y: [0, -80, -160],
                  x: [0, p.driftX / 2, p.driftX],
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1, 0.3],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: p.delay,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Radial glow behind logo */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 400,
              height: 400,
              background:
                "radial-gradient(circle, rgba(122,179,255,0.18) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />

          {/* Logo + text content */}
          <div className="relative flex flex-col items-center gap-6 z-10 px-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1] }}
              transition={{
                duration: 1.2,
                times: [0, 0.7, 1],
                ease: "easeOut",
              }}
              style={{
                filter:
                  "drop-shadow(0 0 32px rgba(122,179,255,0.7)) drop-shadow(0 0 16px rgba(99,102,241,0.5))",
              }}
            >
              <motion.img
                src="/assets/CRYSTAL ATLAS LOGO.png"
                alt="Crystal Atlas Logo"
                className="object-contain select-none"
                style={{ width: "clamp(160px, 22vw, 280px)", height: "auto" }}
                animate={{
                  filter: [
                    "drop-shadow(0 0 20px rgba(122,179,255,0.6))",
                    "drop-shadow(0 0 40px rgba(99,102,241,0.9))",
                    "drop-shadow(0 0 20px rgba(122,179,255,0.6))",
                  ],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* Brand name with shimmer */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <h1
                className="font-black tracking-widest uppercase select-none"
                style={{
                  fontSize: "clamp(2rem, 5vw, 4rem)",
                  background:
                    "linear-gradient(90deg, #93c5fd 0%, #ffffff 30%, #a78bfa 60%, #38bdf8 80%, #93c5fd 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "crystalShimmer 3s linear infinite",
                  letterSpacing: "0.15em",
                }}
              >
                CRYSTAL ATLAS
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
              className="text-center select-none"
              style={{
                color: "#94a3b8",
                fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
                letterSpacing: "0.08em",
              }}
            >
              Your Complete Workspace
            </motion.p>

            {/* Animated dots indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.4 }}
              className="flex gap-2 mt-2"
            >
              {DOTS.map((id, i) => (
                <motion.div
                  key={id}
                  className="rounded-full"
                  style={{ width: 6, height: 6, background: "#7dd3fc" }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    duration: 1.4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Shimmer keyframes */}
          <style>{`
            @keyframes crystalShimmer {
              0% { background-position: 0% center; }
              100% { background-position: 200% center; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
