/** Local calendar date as YYYY-MM-DD (unlike toISOString(), which is UTC and is a day behind in IST before 5:30 AM). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local time as HH:mm. */
export function localTimeStr(d: Date = new Date()): string {
  return d.toTimeString().slice(0, 5);
}
