"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatTimeLabel, nowTimeIST } from "@/lib/date";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["am", "pm"];

const pad = (n) => String(n).padStart(2, "0");

// "20:32" -> { hour: 8, minute: 32, period: "pm" }
function toParts(time) {
  const [h, m] = time.split(":").map(Number);
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: h < 12 ? "am" : "pm" };
}

function fromParts({ hour, minute, period }) {
  const h = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${pad(h)}:${pad(minute)}`;
}

// A time field whose picker opens on the *current* IST time rather than the
// saved one. Opening it changes nothing by itself: clicking outside (or Esc)
// leaves the previous value untouched. Only clicking an hour / minute / am-pm
// commits — the clicked part plus the rest of the picker's current selection
// (initially "now"). Value is a plain 24-hour "HH:MM" string, or "".
export default function TimePicker({ value, onChange, title, className = "" }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const rootRef = useRef(null);
  const listRefs = useRef({});

  function openPicker() {
    setDraft(toParts(nowTimeIST()));
    setOpen(true);
  }

  function pick(part, v) {
    const next = { ...draft, [part]: v };
    setDraft(next);
    onChange(fromParts(next));
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Scroll each column so the selected entry is visible when the picker opens.
  useLayoutEffect(() => {
    if (!open) return;
    for (const list of Object.values(listRefs.current)) {
      const selected = list?.querySelector("[aria-selected='true']");
      if (selected) list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
    }
  }, [open]);

  function column(part, items, label) {
    return (
      <div
        ref={(el) => (listRefs.current[part] = el)}
        role="listbox"
        aria-label={part}
        className="relative h-48 w-14 overflow-y-auto border-r border-line last:border-r-0"
      >
        {items.map((item) => {
          const selected = draft?.[part] === item;
          return (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => pick(part, item)}
              className={`block w-full px-2 py-1 text-center text-sm ${
                selected ? "bg-brand font-medium text-white" : "text-ink hover:bg-surface2"
              }`}
            >
              {label(item)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        title={title}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-line-strong bg-surface px-3 py-2 text-left text-sm text-ink"
      >
        <span className={value ? "" : "text-ink-mute"}>{formatTimeLabel(value) || "--:-- --"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2 text-ink-soft">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      {open && draft && (
        <div className="absolute left-0 z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          <div className="flex">
            {column("hour", HOURS, (h) => h)}
            {column("minute", MINUTES, pad)}
            {column("period", PERIODS, (p) => p.toUpperCase())}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="block w-full border-t border-line px-2 py-1.5 text-xs text-ink-soft hover:bg-surface2"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
