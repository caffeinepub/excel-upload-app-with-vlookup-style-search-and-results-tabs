import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useUserProfile";

const DAILY_MESSAGES = [
  "May today bring clarity and purpose to every task you take on.",
  "Your dedication today plants the seeds of tomorrow's success.",
  "Great things are built one focused hour at a time — start strong!",
  "Every expert was once a beginner who didn't give up on the hard days.",
  "Your unique perspective is the value only you can bring today.",
  "Progress, not perfection — let that be your north star today.",
  "The best work happens when intention meets attention. You've got this.",
  "Today is a fresh canvas — paint it with your best efforts.",
  "Your resilience is your greatest asset. Let it shine today.",
  "Small steps forward still move mountains. Keep going!",
  "Challenges today become the skills you're proud of tomorrow.",
  "Your positive energy is contagious — let it ripple through the team.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The work you do today matters more than you realize.",
  "Believe in your capacity to grow — today is part of that journey.",
  "Show up, focus, and trust the process. You're on the right track.",
  "Excellence is not a destination but a continuous journey.",
  "The most productive day starts with the right intention.",
  "Your effort today is an investment in the future you want.",
  "Be the energy you want to attract in every meeting and message.",
  "Consistency beats perfection every single time.",
  "Every problem you solve today makes you sharper for tomorrow.",
  "You are more capable than yesterday — that's all that matters.",
  "Momentum is built from small wins. Celebrate each one today.",
  "The world gets better when thoughtful people show up fully.",
  "Lead with curiosity — amazing discoveries await you today.",
  "Precision, patience, and persistence — your power trio today.",
  "Every task done with care is a reflection of your integrity.",
  "Focus on what you can control and give it your absolute best.",
  "You have everything you need to make today exceptional.",
];

const QUOTES = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Innovation distinguishes between a leader and a follower. — Steve Jobs",
  "Strive not to be a success, but rather to be of value. — Albert Einstein",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "Hard work beats talent when talent doesn't work hard. — Tim Notke",
  "Success usually comes to those who are too busy to be looking for it. — Thoreau",
  "Opportunities don't happen. You create them. — Chris Grosser",
  "Great minds discuss ideas; average minds discuss events. — Roosevelt",
  "I find that the harder I work, the more luck I seem to have. — Thomas Jefferson",
  "Success is not final; failure is not fatal: courage to continue counts. — Churchill",
  "You miss 100% of the shots you don't take. — Wayne Gretzky",
  "Whether you think you can or you think you can't, you're right. — Henry Ford",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "An unexamined life is not worth living. — Socrates",
  "Spread love everywhere you go. — Mother Teresa",
  "When you reach the end of your rope, tie a knot in it and hang on. — F.D. Roosevelt",
  "Always remember that you are absolutely unique. — Margaret Mead",
  "Don't judge each day by the harvest you reap but by the seeds that you plant.",
  "The future belongs to those who believe in the beauty of their dreams. — E. Roosevelt",
  "Tell me and I forget. Teach me and I remember. Involve me and I learn. — B. Franklin",
  "The best things in the world cannot be seen or even touched. — Helen Keller",
  "It is during our darkest moments that we must focus to see the light. — Aristotle",
  "Whoever is happy will make others happy too. — Anne Frank",
  "Do not go where the path may lead, go where there is no path and leave a trail. — Emerson",
  "You will face many defeats in life, but never let yourself be defeated. — Maya Angelou",
  "In the middle of every difficulty lies opportunity. — Albert Einstein",
  "Life is what happens when you're busy making other plans. — John Lennon",
  "Life is either a daring adventure or nothing at all. — Helen Keller",
  "Many of life's failures are people who didn't realize how close they were to success.",
  "You have brains in your head. You have feet in your shoes. — Dr. Seuss",
  "If life were predictable it would cease to be life. — Eleanor Roosevelt",
  "If you look at what you have in life, you'll always have more. — Oprah Winfrey",
  "If you want to live a happy life, tie it to a goal, not to people. — Albert Einstein",
  "Never let the fear of striking out keep you from playing the game. — Babe Ruth",
  "Money and success don't change people; they merely amplify what is already there.",
  "Your time is limited, so don't waste it living someone else's life. — Steve Jobs",
  "Not how long, but how well you have lived is the main thing. — Seneca",
  "In three words I can sum up everything I've learned about life: it goes on. — Robert Frost",
  "You only live once, but if you do it right, once is enough. — Mae West",
  "The purpose of our lives is to be happy. — Dalai Lama",
  "Live in the sunshine, swim the sea, drink the wild air. — Ralph Waldo Emerson",
  "Go confidently in the direction of your dreams! — Henry David Thoreau",
  "If you're not making mistakes, then you're not making decisions. — Catherine Cook",
  "Very little is needed to make a happy life; it is all within yourself. — Marcus Aurelius",
  "You've gotta dance like there's nobody watching. — William W. Purkey",
  "The more that you read, the more things you will know. — Dr. Seuss",
  "Life itself is the most wonderful fairy tale. — Hans Christian Andersen",
  "Be yourself; everyone else is already taken. — Oscar Wilde",
  "Two roads diverged in a wood, and I took the one less traveled by. — Robert Frost",
];

// Pre-computed particle positions so they don't change on re-render
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: `particle-${i}`,
  size: ((i * 7 + 3) % 3) + 1,
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 17) % 100,
  opacity: ((i * 19 + 5) % 50) / 100 + 0.1,
  duration: ((i * 13 + 2) % 3) + 2,
  delay: ((i * 7 + 1) % 20) / 10,
}));

function getTimeGreeting(): {
  greeting: string;
  emoji: string;
  phrase: string;
} {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      greeting: "Good Morning",
      emoji: "☀️",
      phrase: "Have a productive and wonderful morning!",
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good Afternoon",
      emoji: "🌤️",
      phrase: "Keep up the great momentum this afternoon!",
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      greeting: "Good Evening",
      emoji: "🌆",
      phrase: "Wind down with purpose — you've done great today!",
    };
  }
  return {
    greeting: "Good Night",
    emoji: "🌙",
    phrase: "Rest well and recharge for tomorrow!",
  };
}

function getDailyMessage(dayOfYear: number): string {
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

function getNextQuoteIndex(): number {
  const stored = localStorage.getItem("quoteIndex");
  const current = stored ? Number.parseInt(stored, 10) : 0;
  const next = (current + 1) % QUOTES.length;
  localStorage.setItem("quoteIndex", String(next));
  return current;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function WelcomeSplash() {
  const { identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();

  const [showDaily, setShowDaily] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);

  const userId = identity?.getPrincipal().toString() ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const firstName = profile?.displayName?.split(" ")[0] ?? "there";

  useEffect(() => {
    if (!userId || !profile) return;

    const dailyKey = `lastDailySplash_${userId}`;
    const lastShown = localStorage.getItem(dailyKey);

    if (lastShown !== today) {
      localStorage.setItem(dailyKey, today);
      setShowDaily(true);
      const timer = setTimeout(() => {
        setShowDaily(false);
        setDailyDone(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    // Already shown today, go straight to quote
    setDailyDone(true);
  }, [userId, profile, today]);

  useEffect(() => {
    if (!dailyDone || !userId || !profile) return;
    const idx = getNextQuoteIndex();
    setQuoteIndex(idx);
    const delay = setTimeout(() => {
      setShowQuote(true);
      const timer = setTimeout(() => setShowQuote(false), 3000);
      return () => clearTimeout(timer);
    }, 300);
    return () => clearTimeout(delay);
  }, [dailyDone, userId, profile]);

  const { greeting, emoji, phrase } = getTimeGreeting();
  const dayOfYear = getDayOfYear();
  const dailyMessage = getDailyMessage(dayOfYear);

  return (
    <>
      {/* Layer 1: Daily full-screen splash */}
      <AnimatePresence>
        {showDaily && (
          <motion.div
            key="daily-splash"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.06 240), oklch(0.12 0.04 260), oklch(0.20 0.08 210))",
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: p.size,
                    height: p.size,
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    opacity: p.opacity,
                  }}
                  animate={{
                    opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: p.delay,
                  }}
                />
              ))}
            </div>

            <div className="relative text-center px-8 max-w-2xl">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-7xl mb-6"
              >
                {emoji}
              </motion.div>
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-5xl font-bold text-white mb-2"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {greeting}, {firstName}!
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-xl text-blue-200 mb-6"
              >
                {phrase}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5"
              >
                <p className="text-white/90 text-lg leading-relaxed italic">
                  "{dailyMessage}"
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="mt-8 flex justify-center"
              >
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={`dot-${i}`}
                      className="w-1.5 h-1.5 rounded-full bg-white/60"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 2: Quote banner — slides down from top */}
      <AnimatePresence>
        {showQuote && (
          <motion.div
            key="quote-banner"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed top-0 left-0 right-0 z-[9998] px-4 py-3"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.25 0.08 240), oklch(0.30 0.10 220))",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div className="container mx-auto max-w-4xl flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-sm truncate">
                  {greeting}! {phrase}
                </p>
                <p className="text-blue-200 text-xs truncate opacity-90 italic">
                  {QUOTES[quoteIndex]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
