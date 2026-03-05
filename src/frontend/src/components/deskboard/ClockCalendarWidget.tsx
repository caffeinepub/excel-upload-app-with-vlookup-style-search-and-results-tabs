import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function ClockCalendarWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const dayName = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];
  const monthName = MONTHS[now.getMonth()];
  const dateStr = `${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()}`;

  // Calendar
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Clock */}
      <div className="rounded-2xl bg-gradient-to-br from-sidebar-bg to-card border border-border/40 p-5 shadow-mac-soft">
        <div className="text-center">
          <div className="font-mono text-5xl font-bold tracking-tight text-primary">
            {hours}:{minutes}
            <span className="text-3xl text-primary/60 ml-1">{seconds}</span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground font-medium">
            {dateStr}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl bg-gradient-to-br from-sidebar-bg to-card border border-border/40 p-4 shadow-mac-soft">
        <div className="text-center mb-3">
          <span className="text-sm font-semibold text-foreground">
            {monthName} {year}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional list
              key={idx}
              className={`
                text-center text-xs py-1.5 rounded-lg font-medium transition-colors
                ${day === null ? "" : "cursor-default"}
                ${
                  day === today
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : day !== null
                      ? "text-foreground hover:bg-accent/30"
                      : ""
                }
              `}
            >
              {day ?? ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
