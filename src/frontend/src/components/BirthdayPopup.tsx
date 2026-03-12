import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

// Birthday data is stored in localStorage under this key.
// Format: Record<principalStr, { name: string; mmdd: string }>
const BIRTHDAY_MAP_KEY = "crystalAtlasBirthdays";

export interface BirthdayEntry {
  name: string;
  /** Format: "MM-DD" */
  mmdd: string;
}

export function getBirthdayMap(): Record<string, BirthdayEntry> {
  try {
    return JSON.parse(localStorage.getItem(BIRTHDAY_MAP_KEY) ?? "{}") as Record<
      string,
      BirthdayEntry
    >;
  } catch {
    return {};
  }
}

export function setBirthdayForUser(
  principalStr: string,
  name: string,
  mmdd: string,
) {
  const map = getBirthdayMap();
  if (mmdd) {
    map[principalStr] = { name, mmdd };
  } else {
    delete map[principalStr];
  }
  localStorage.setItem(BIRTHDAY_MAP_KEY, JSON.stringify(map));
}

function getTodayMmdd(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function getTodayBirthdays(): BirthdayEntry[] {
  const today = getTodayMmdd();
  const map = getBirthdayMap();
  return Object.values(map).filter((e) => e.mmdd === today);
}

export function BirthdayPopup() {
  const { identity } = useInternetIdentity();
  const [visible, setVisible] = useState(false);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);

  useEffect(() => {
    if (!identity) return;

    const today = new Date().toISOString().slice(0, 10);
    const shownKey = `birthdayPopupShown_${today}`;
    if (localStorage.getItem(shownKey)) return; // already shown today

    const todayBdays = getTodayBirthdays();
    if (todayBdays.length === 0) return;

    // Mark as shown for today
    localStorage.setItem(shownKey, "1");
    setBirthdays(todayBdays);
    setVisible(true);
  }, [identity]);

  if (!visible || birthdays.length === 0) return null;

  // Pre-compute confetti items with stable keys based on position index
  const confettiItems = Array.from({ length: 16 }, (_, i) => ({
    idx: i,
    key: `conf-pos-${i}`,
    width: ((i * 7 + 4) % 8) + 4,
    height: ((i * 7 + 4) % 8) + 4,
    left: (i * 37 + 5) % 100,
    top: (i * 53 + 8) % 100,
    color: ["#FF6B9D", "#FFD700", "#00E5FF", "#76FF03", "#FF4081"][i % 5],
    duration: (i % 3) + 2,
    delay: i * 0.15,
  }));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="birthday-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full mx-4 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.20 0.08 330), oklch(0.15 0.06 290), oklch(0.22 0.10 0))",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {/* Confetti circles */}
            {confettiItems.map((c) => (
              <motion.div
                key={c.key}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: c.width,
                  height: c.height,
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  background: c.color,
                  opacity: 0.6,
                }}
                animate={{ y: [-4, 4, -4], opacity: [0.4, 0.8, 0.4] }}
                transition={{
                  duration: c.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: c.delay,
                }}
              />
            ))}

            <div className="relative z-10 text-center px-8 py-10">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 2,
                }}
                className="text-6xl mb-4"
              >
                🎂
              </motion.div>

              <h2
                className="text-3xl font-bold text-white mb-3"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Happy Birthday!
              </h2>

              <div className="space-y-1 mb-6">
                {birthdays.map((b) => (
                  <p
                    key={b.name + b.mmdd}
                    className="text-xl text-pink-200 font-medium"
                  >
                    🎉 {b.name}
                  </p>
                ))}
              </div>

              <p className="text-white/70 text-sm mb-8 leading-relaxed">
                Wishing {birthdays.length === 1 ? "them" : "all of them"} a
                wonderful day filled with joy and celebration! 🌟
              </p>

              <button
                type="button"
                onClick={() => setVisible(false)}
                className="px-8 py-3 rounded-full font-semibold text-white text-sm transition-all"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.60 0.22 340), oklch(0.55 0.20 20))",
                  boxShadow: "0 4px 20px rgba(255,100,150,0.4)",
                }}
                data-ocid="birthday.close_button"
              >
                Celebrate! 🎊
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
