"use client";

import { useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import { DescriptionCell, lastMessageInfo } from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";
import { formatTimeLabel, nowTimeIST, todayIST } from "@/lib/date";
import { PLATFORM_COLOR, QUALITY_COLOR } from "@/lib/badgeColors";
import { LEAD_QUALITY_OPTIONS } from "@/lib/constants";

const cellClass = "border-r border-line px-2 py-2 align-top last:border-r-0";

function qualityRank(quality) {
  const idx = LEAD_QUALITY_OPTIONS.indexOf(quality);
  return idx === -1 ? LEAD_QUALITY_OPTIONS.length : idx;
}

function qualityGroupLabel(quality) {
  return LEAD_QUALITY_OPTIONS.includes(quality) ? quality : quality || "Unspecified";
}

export default function FollowUpPage() {
  const { filters } = useFilters();
  const { leads, loading, error, updateLead } = useLeads(filters);

  const { highPriorityLeads, groups } = useMemo(() => {
    const sorted = [...leads].sort(
      (a, b) => qualityRank(a.leadQuality) - qualityRank(b.leadQuality)
    );
    const highPriorityLeads = sorted.filter((l) => l.highPriority);
    const rest = sorted.filter((l) => !l.highPriority);
    const map = new Map();
    for (const lead of rest) {
      const key = qualityGroupLabel(lead.leadQuality);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lead);
    }
    return { highPriorityLeads, groups: [...map.entries()] };
  }, [leads]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />
      <FilterBar />

      <div className="border-b border-line bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Follow-up Prep</h2>
        <p className="text-xs text-ink-mute">
          Draft what you&apos;ll send next, whenever you have the headspace. When you actually
          send it, hit Mark Done — that saves today as the last message date.
        </p>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="p-10 text-center text-sm text-ink-mute">No leads yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong bg-surface2 text-left text-xs font-medium uppercase tracking-wide text-ink-mute">
                <th className={cellClass + " w-14"}>Priority</th>
                <th className={cellClass + " w-40"}>Identified</th>
                <th className={cellClass + " w-28"}>Platform</th>
                <th className={cellClass + " w-64"}>Description</th>
                <th className={cellClass + " w-24"}>Last Msg</th>
                <th className={cellClass}>Follow-up Message</th>
              </tr>
            </thead>
            <tbody>
              {highPriorityLeads.length > 0 && (
                <>
                  <tr className="border-b border-line-strong bg-red-100 dark:bg-red-950">
                    <td colSpan={6} className="px-2 py-1.5 text-xs font-semibold text-red-800 dark:text-red-300">
                      ⭐ High Priority
                      <span className="ml-2 font-normal text-red-700/80 dark:text-red-400/80">
                        {highPriorityLeads.length} lead{highPriorityLeads.length > 1 ? "s" : ""}
                      </span>
                    </td>
                  </tr>
                  {highPriorityLeads.map((lead) => (
                    <FollowUpRow key={lead.id} lead={lead} onUpdate={updateLead} />
                  ))}
                </>
              )}
              {groups.map(([quality, groupLeads]) => (
                <QualityGroup
                  key={quality}
                  quality={quality}
                  leads={groupLeads}
                  onUpdate={updateLead}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QualityGroup({ quality, leads, onUpdate }) {
  return (
    <>
      <tr className="border-b border-line-strong bg-brand/10">
        <td colSpan={6} className="px-2 py-1.5 text-xs font-semibold text-brand-strong">
          <span
            className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              QUALITY_COLOR[quality] || "bg-surface2 text-ink-soft"
            }`}
          >
            {quality}
          </span>
          {leads.length} lead{leads.length > 1 ? "s" : ""}
        </td>
      </tr>
      {leads.map((lead) => (
        <FollowUpRow key={lead.id} lead={lead} onUpdate={onUpdate} />
      ))}
    </>
  );
}

function FollowUpRow({ lead, onUpdate }) {
  const [message, setMessage] = useState(lead.followUpMessage || "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const info = lastMessageInfo(lead);

  async function handleSave() {
    setSaving(true);
    await onUpdate(lead.id, { followUpMessage: message });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleMarkDone() {
    await onUpdate(lead.id, {
      lastMessageDate: todayIST(),
      lastMessageTime: nowTimeIST(),
      followUpMessage: "",
    });
    setMessage("");
  }

  return (
    <tr className="border-b border-line align-top hover:bg-surface2/60">
      <td className={cellClass + " text-center"}>
        <input
          type="checkbox"
          checked={!!lead.highPriority}
          onChange={(e) => onUpdate(lead.id, { highPriority: e.target.checked })}
          title="Mark high priority — pins this lead to the top of Follow-up"
          className="h-4 w-4 accent-red-600"
        />
      </td>

      <td className={cellClass}>{lead.identified}</td>

      <td className={cellClass}>
        {lead.platform ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              PLATFORM_COLOR[lead.platform] || "bg-surface2 text-ink-soft"
            }`}
          >
            {lead.platform}
          </span>
        ) : (
          <span className="text-ink-mute">—</span>
        )}
      </td>

      <td className={cellClass}>
        <DescriptionCell lead={lead} />
      </td>

      <td className={cellClass}>
        {info ? (
          <>
            <span className={info.days >= 3 ? "font-medium text-red-700 dark:text-red-400" : "text-ink"}>
              {info.days === 0 ? "Today" : `${info.days}d ago`}
            </span>
            {info.time && (
              <div className="text-xs text-ink-mute">{formatTimeLabel(info.time)}</div>
            )}
          </>
        ) : (
          <span className="text-ink-mute">—</span>
        )}
      </td>

      <td className={cellClass}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Draft the follow-up message to send…"
          className="w-full rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-strong disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleMarkDone}
            className="rounded-md border border-line-strong px-3 py-1 text-xs font-medium text-ink-soft hover:bg-surface2"
          >
            Mark Done
          </button>
          {savedFlash && <span className="text-xs text-emerald-600">Saved</span>}
        </div>
      </td>
    </tr>
  );
}
