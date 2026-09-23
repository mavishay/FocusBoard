import { useEffect, useState } from "react";
import { ELECTRON_HEADER_REFRESH_NOTE } from "@/lib/daily-status-copy";
import { getDailyStatusTimezone } from "./timezone";

const HEBREW_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const;

function formatMetaLine(now: Date): string {
  const timeZone = getDailyStatusTimezone();
  const weekday = HEBREW_WEEKDAYS[now.getDay()];
  const date = now.toLocaleDateString("he-IL", {
    timeZone,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("he-IL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeLabel =
    timeZone === "Asia/Bangkok" ? `${time} בנגקוק` : `${time} ${timeZone}`;

  return `${weekday} · ${date} · ${timeLabel} · ${ELECTRON_HEADER_REFRESH_NOTE}`;
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
