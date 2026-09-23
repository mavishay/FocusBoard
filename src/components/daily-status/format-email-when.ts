export function formatEmailWhen(
  receivedAt: string | null,
  now: Date = new Date(),
): string {
  if (!receivedAt) {
    return "—";
  }

  const received = new Date(receivedAt);
  if (Number.isNaN(received.getTime())) {
    return receivedAt;
  }

  const datePart = received.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
  });
  const timePart = received.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const diffHours = Math.floor(
    (now.getTime() - received.getTime()) / (1000 * 60 * 60),
  );
  const relative =
    diffHours < 1
      ? "לפני פחות משעה"
      : diffHours < 24
        ? `לפני ~${diffHours} שע׳`
        : `לפני ~${Math.floor(diffHours / 24)} ימים`;

  return `${datePart} ${timePart} · ${relative}`;
}
