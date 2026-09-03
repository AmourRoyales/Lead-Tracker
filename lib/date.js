const TIME_ZONE = "Asia/Kolkata";

// All dates in this app are plain "YYYY-MM-DD" strings in IST — no Date
// objects for lead dates, so there's no UTC-offset drift between the day
// the lead actually came in and the day it displays as.
export function todayIST() {
  return formatDateIST(new Date());
}

export function formatDateIST(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

// First/last day of the current month (IST), as "YYYY-MM-DD" strings.
export function currentMonthRangeIST() {
  const [y, m] = todayIST().split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, "0");
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

// Whole days between an ISO "YYYY-MM-DD" date and today (IST). Null if no date given.
export function daysSinceIST(isoDate) {
  if (!isoDate) return null;
  const [fy, fm, fd] = isoDate.split("-").map(Number);
  const [ty, tm, td] = todayIST().split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

// "2026-09-03" -> "Thursday"
export function weekdayNameFromISO(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(date);
}

// "2026-09" -> "September 2026"
export function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateLabel(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
