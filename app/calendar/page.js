"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import AddLeadModal from "@/components/AddLeadModal";
import { lastMessageInfo } from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";
import { useStoredValue } from "@/lib/useStoredValue";
import {
  CLOSED_FOR_NOW_STATUS,
  HIGH_PRIORITY_STATUSES,
  QUALITY_LEADS_STAGE,
} from "@/lib/constants";
import { PLATFORM_COLOR, STATUS_COLOR } from "@/lib/badgeColors";
import { formatDateLabel, formatMonthLabel, formatTimeLabel, todayIST } from "@/lib/date";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Stages where the lead has actually engaged — Interested ranks above Quality
// Leads, so within a quality tier the further-along leads come first.
const HOT_STAGES = ["Interested", QUALITY_LEADS_STAGE];

// Day-view sections, top to bottom. A lead lands in the first one it matches;
// anything matching none (Poor/Unqualified, Uncategorized, "Closed for now")
// falls into a trailing "Other" section so nothing for the day goes missing.
const SECTIONS = [
  {
    key: "best",
    title: "Best · Interested & Quality Leads",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    short: "Best",
    match: (l) => isHot(l) && l.leadQuality === "Best",
  },
  {
    key: "medium",
    title: "Medium · Interested & Quality Leads",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    short: "Med",
    match: (l) => isHot(l) && l.leadQuality === "Medium",
  },
  {
    key: "second",
    title: "Second Message",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    short: "2nd",
    match: (l) => l.conversationStage === "Second Message",
  },
  {
    key: "first",
    title: "First Message",
    chip: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    short: "1st",
    match: (l) => l.conversationStage === "First Message",
  },
];

function isHot(lead) {
  return HOT_STAGES.includes(lead.conversationStage) && lead.status !== CLOSED_FOR_NOW_STATUS;
}

function sectionKeyFor(lead) {
  return SECTIONS.find((s) => s.match(lead))?.key || "other";
}

const pad = (n) => String(n).padStart(2, "0");

function monthRange(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { dateFrom: `${monthKey}-01`, dateTo: `${monthKey}-${pad(lastDay)}`, y, m, lastDay };
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export default function CalendarPage() {
  // useSearchParams needs a Suspense boundary above it in the App Router.
  return (
    <Suspense fallback={null}>
      <CalendarRoute />
    </Suspense>
  );
}

// Which month / day is open lives in the URL (?month=YYYY-MM or
// ?date=YYYY-MM-DD), so the browser back button behaves like "Back to
// calendar" and a specific day can be bookmarked.
function CalendarRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = todayIST();

  const dateParam = searchParams.get("date");
  const monthParam = searchParams.get("month");
  const selectedDate = DATE_RE.test(dateParam || "") ? dateParam : null;
  const month = selectedDate
    ? selectedDate.slice(0, 7)
    : MONTH_RE.test(monthParam || "")
      ? monthParam
      : today.slice(0, 7);

  // Fetch the whole visible month once; the day view just filters it, so
  // opening a day and going back doesn't refetch. The shared filters apply on
  // top — their From/To only narrows the visible month (days outside it just
  // show empty), since the month itself is picked with the arrows.
  const { filters } = useFilters();
  const range = monthRange(month);
  const dateFrom = filters.dateFrom > range.dateFrom ? filters.dateFrom : range.dateFrom;
  const dateTo = filters.dateTo && filters.dateTo < range.dateTo ? filters.dateTo : range.dateTo;
  const { leads, loading, error, updateLead, removeLead } = useLeads({ ...filters, dateFrom, dateTo });

  // Where the zoom animation grows from / shrinks back to — the clicked cell.
  const wrapperRef = useRef(null);
  const [origin, setOrigin] = useState("50% 0");

  function openDay(date, event) {
    const box = wrapperRef.current?.getBoundingClientRect();
    const cell = event.currentTarget.getBoundingClientRect();
    if (box) {
      const x = cell.left + cell.width / 2 - box.left;
      const y = cell.top + cell.height / 2 - box.top;
      setOrigin(`${x}px ${y}px`);
    }
    router.push(`/calendar?date=${date}`);
  }

  function showMonth(monthKey) {
    router.push(monthKey === today.slice(0, 7) ? "/calendar" : `/calendar?month=${monthKey}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />
      <FilterBar collapsible />
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      <div ref={wrapperRef} className="relative flex-1 overflow-hidden">
        {selectedDate ? (
          <div
            key={`day-${selectedDate}`}
            className="animate-cal-zoom-in"
            style={{ transformOrigin: origin }}
          >
            <DayView
              date={selectedDate}
              leads={leads.filter((l) => l.leadDate === selectedDate)}
              loading={loading}
              onBack={() => showMonth(month)}
              onUpdate={updateLead}
              onDelete={removeLead}
            />
          </div>
        ) : (
          <div
            key={`month-${month}`}
            className="animate-cal-zoom-out"
            style={{ transformOrigin: origin }}
          >
            <MonthView
              month={month}
              today={today}
              leads={leads}
              loading={loading}
              onPrev={() => showMonth(shiftMonth(month, -1))}
              onNext={() => showMonth(shiftMonth(month, 1))}
              onToday={() => showMonth(today.slice(0, 7))}
              onOpenDay={openDay}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MonthView({ month, today, leads, loading, onPrev, onNext, onToday, onOpenDay }) {
  const { y, m, lastDay } = monthRange(month);

  // Per-day counts: total plus one bucket per section.
  const countsByDate = useMemo(() => {
    const map = {};
    for (const lead of leads) {
      if (!lead.leadDate) continue;
      const c = (map[lead.leadDate] ||= { total: 0 });
      c.total += 1;
      const key = sectionKeyFor(lead);
      c[key] = (c[key] || 0) + 1;
    }
    return map;
  }, [leads]);

  // Monday-first grid: blank cells before the 1st, then pad the last week out.
  const leadingBlanks = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  const isCurrentMonth = month === today.slice(0, 7);
  const monthTotal = leads.length;

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft hover:bg-surface2"
        >
          ←
        </button>
        <h2 className="min-w-44 text-center text-base font-semibold text-ink">
          {formatMonthLabel(month)}
        </h2>
        <button
          onClick={onNext}
          aria-label="Next month"
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft hover:bg-surface2"
        >
          →
        </button>
        {!isCurrentMonth && (
          <button
            onClick={onToday}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-strong"
          >
            Today
          </button>
        )}
        <span className="ml-auto text-xs text-ink-mute">
          {loading ? "Loading…" : `${monthTotal} lead${monthTotal === 1 ? "" : "s"} this month`}
        </span>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line bg-line gap-px">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-surface2 px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-ink-mute"
          >
            {d}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} className="min-h-20 bg-surface2/60 sm:min-h-28" />;
          const counts = countsByDate[date];
          const isToday = date === today;
          const isFuture = date > today;
          return (
            <button
              key={date}
              onClick={(e) => onOpenDay(date, e)}
              className={`group flex min-h-20 flex-col items-stretch gap-1 bg-surface p-1.5 text-left transition hover:z-10 hover:scale-[1.03] hover:bg-brand/5 hover:shadow-md sm:min-h-28 sm:p-2 ${
                isToday ? "ring-2 ring-inset ring-brand" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? "bg-brand text-white" : isFuture ? "text-ink-mute" : "text-ink"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {counts && (
                  <span className="text-xs font-medium text-ink-soft">{counts.total}</span>
                )}
              </div>
              {counts && (
                <div className="flex flex-wrap gap-1">
                  {SECTIONS.map(
                    (s) =>
                      counts[s.key] > 0 && (
                        <span
                          key={s.key}
                          title={s.title}
                          className={`rounded-full px-1.5 text-[10px] font-medium leading-4 ${s.chip}`}
                        >
                          <span className="hidden sm:inline">{s.short} </span>
                          {counts[s.key]}
                        </span>
                      )
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
        {SECTIONS.map((s) => (
          <span key={s.key} className={`rounded-full px-2 py-0.5 font-medium ${s.chip}`}>
            {s.title}
          </span>
        ))}
      </div>
    </div>
  );
}

const COPY_NAME_KEY = "calendar.copyWhatsAppName";

// WhatsApp leads carry the phone number in "identified", sometimes alongside a
// name ("Rahul +91 98765 43210"). Pull the number out; whatever's left is the name.
const PHONE_RE = /\+?\d[\d\s\-().]{6,}\d/;

function splitWhatsApp(identified = "") {
  const match = identified.match(PHONE_RE);
  if (!match) return { number: null, name: identified.trim() || null };
  const number = match[0].replace(/[\s\-().]/g, "");
  const name = identified.replace(match[0], "").replace(/^[\s,|:()-]+|[\s,|:()-]+$/g, "");
  return { number, name: name || null };
}

// What clicking a card puts on the clipboard. WhatsApp: the number, or the name
// when "copy name" is ticked (falls back to the whole field if that part is
// missing). Every other platform: the identified username as-is.
function copyTextFor(lead, copyName) {
  const identified = lead.identified || "";
  if (lead.platform !== "WhatsApp") return identified;
  const { number, name } = splitWhatsApp(identified);
  return (copyName ? name : number) || identified;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // navigator.clipboard is unavailable outside secure contexts (e.g. the dev
    // server opened over a LAN IP) — fall back to the legacy execCommand path.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function statusLabel(lead) {
  return lead.status === "Custom" ? lead.statusCustom || "Custom" : lead.status;
}

function DayView({ date, leads, loading, onBack, onUpdate, onDelete }) {
  const { filters } = useFilters();
  const [detailLead, setDetailLead] = useState(null);
  const [toast, setToast] = useState(null);
  const [storedCopyName, setStoredCopyName] = useStoredValue(COPY_NAME_KEY);
  const copyName = storedCopyName === "1";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleCopyName(checked) {
    setStoredCopyName(checked ? "1" : "0");
  }

  async function handleCopy(lead) {
    const text = copyTextFor(lead, copyName);
    if (!text) return;
    const ok = await copyToClipboard(text);
    setToast(ok ? `Copied ${text}` : "Couldn't copy to clipboard");
  }

  // Bucket the day's leads into sections, keeping the API order within each —
  // i.e. the FilterBar's sort / search ranking. Only with neither active do the
  // Best/Medium tiers put Interested above Quality Leads; doing that under an
  // explicit sort would restart the order partway down the section.
  const keepApiOrder = !!filters.sort || !!filters.search.trim();
  const sections = useMemo(() => {
    const buckets = Object.fromEntries([...SECTIONS.map((s) => [s.key, []]), ["other", []]]);
    for (const lead of leads) buckets[sectionKeyFor(lead)].push(lead);
    if (!keepApiOrder) {
      const stageRank = (l) => HOT_STAGES.indexOf(l.conversationStage);
      buckets.best.sort((a, b) => stageRank(a) - stageRank(b));
      buckets.medium.sort((a, b) => stageRank(a) - stageRank(b));
    }
    return [
      ...SECTIONS.map((s) => ({ ...s, leads: buckets[s.key] })),
      {
        key: "other",
        title: "Other",
        chip: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        leads: buckets.other,
      },
    ];
  }, [leads, keepApiOrder]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface2"
        >
          ← Back to calendar
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {formatDateLabel(date)}{" "}
          <span className="font-normal text-ink-mute">({leads.length})</span>
        </h2>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={copyName}
            onChange={(e) => toggleCopyName(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          WhatsApp: copy name instead of number
        </label>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="p-10 text-center text-sm text-ink-mute">No leads on this day.</div>
      ) : (
        sections.map(
          (s) =>
            (s.leads.length > 0 || s.key !== "other") && (
              <section key={s.key} className="border-b border-line">
                <div className="flex items-center gap-2 px-4 pt-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}>
                    {s.title}
                  </span>
                  <span className="text-xs text-ink-mute">
                    {s.leads.length} lead{s.leads.length === 1 ? "" : "s"}
                  </span>
                </div>
                {s.leads.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {s.leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        copyName={copyName}
                        onCopy={() => handleCopy(lead)}
                        onOpen={() => setDetailLead(lead)}
                        onDelete={() => {
                          if (confirm(`Delete lead "${lead.identified}"?`)) onDelete(lead.id);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-xs text-ink-mute">None.</p>
                )}
              </section>
            )
        )
      )}

      {detailLead && (
        <AddLeadModal
          lead={detailLead}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setDetailLead(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 truncate rounded-full bg-ink px-4 py-2 text-sm font-medium text-app shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Clicking the identified number/name only copies it; clicking anywhere else
// on the card opens the full-details modal. The card is a div (not a button)
// so the copy button can live inside it.
function LeadCard({ lead, copyName, onCopy, onOpen, onDelete }) {
  const info = lastMessageInfo(lead);
  const isWhatsApp = lead.platform === "WhatsApp";
  const copyTarget = isWhatsApp ? (copyName ? "name" : "number") : "username";
  const statusClass = HIGH_PRIORITY_STATUSES.includes(lead.status)
    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
    : STATUS_COLOR[lead.status] || "bg-surface2 text-ink-soft";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      title={lead.highPriority ? "High priority · open details" : "Open details"}
      className={`flex cursor-pointer flex-col gap-3 rounded-lg border bg-surface p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        // Flagged high priority (the checkbox in the edit modal / on /follow-up).
        lead.highPriority
          ? "border-red-500 hover:border-red-400 dark:border-red-500/80"
          : "border-line hover:border-brand"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {lead.identified ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            title={`Copy ${copyTarget}`}
            className="group/copy -mx-1 -my-0.5 min-w-0 break-words rounded px-1 py-0.5 text-left font-semibold text-ink hover:bg-brand/10 hover:text-brand-strong"
          >
            {lead.identified}
            {/* Inline so it trails the last word even when the text wraps. */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="ml-1.5 inline-block h-3.5 w-3.5 -translate-y-px fill-none stroke-current stroke-2 align-middle text-ink-mute group-hover/copy:text-brand-strong"
            >
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </button>
        ) : (
          <span className="font-semibold text-ink-mute">—</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {lead.platform && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                PLATFORM_COLOR[lead.platform] || "bg-surface2 text-ink-soft"
              }`}
            >
              {lead.platform}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete lead"
            aria-label="Delete lead"
            className="rounded p-1 text-ink-mute hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
          {statusLabel(lead)}
        </span>
        {/* A drafted next follow-up message (cleared by "Mark done" on /follow-up). */}
        {lead.followUpMessage?.trim() && (
          <span
            title={lead.followUpMessage}
            className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300"
          >
            Follow-up added
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line pt-2 text-xs">
        <div>
          <div className="text-ink-mute">Quote</div>
          <div className="font-medium text-ink">{lead.quote != null ? `$${lead.quote}` : "—"}</div>
        </div>
        <div>
          <div className="text-ink-mute">Last message</div>
          {info ? (
            <div
              className={
                info.days >= 3 ? "font-medium text-red-700 dark:text-red-400" : "font-medium text-ink"
              }
            >
              {info.days === 0 ? "Today" : `${info.days}d ago`}
              {info.time && (
                <span className="font-normal text-ink-mute"> · {formatTimeLabel(info.time)}</span>
              )}
            </div>
          ) : (
            <div className="text-ink-mute">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
