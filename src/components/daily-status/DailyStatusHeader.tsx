import { useEffect, useState } from "react";

const HEBREW_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const;

function formatMetaLine(now: Date): string {
  const weekday = HEBREW_WEEKDAYS[now.getDay()];
  const date = now.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timezone = now
    .toLocaleTimeString("en-US", { timeZoneName: "short" })
    .split(" ")
    .pop();

  return `${weekday} · ${date} · ${time} ${timezone} · ריפרש כל 60 ש׳`;
}

export function DailyStatusHeader() {
  const [meta, setMeta] = useState(() => formatMetaLine(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMeta(formatMetaLine(new Date()));
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="ds-header">
      <h1>FocusBoard · סטטוס יומי</h1>
      <div className="ds-meta">{meta}</div>
    </header>
  );
}
