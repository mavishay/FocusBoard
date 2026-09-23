export function DailyStatusFooter() {
  const now = new Date();
  const time = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");

  return (
    <footer className="ds-footer">
      FocusBoard · נתונים נכתבו מחדש {time} {timezone} · מתעדכנים כל 5 דק׳ ע״י FocusBoard
      refresh routine · Sun–Thu 09:00–17:30
    </footer>
  );
}
