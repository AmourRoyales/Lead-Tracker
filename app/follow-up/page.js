"use client";

import { useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { DescriptionCell, lastMessageInfo } from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { todayIST } from "@/lib/date";
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
  const { leads, loading, error, updateLead } = useLeads({});

  const groups = useMemo(() => {
    const sorted = [...leads].sort(
      (a, b) => qualityRank(a.leadQuality) - qualityRank(b.leadQuality)
    );
    const map = new Map();
    for (const lead of sorted) {
      const key = qualityGroupLabel(lead.leadQuality);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lead);
    }
    return [...map.entries()];
  }, [leads]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />

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
                <th className={cellClass + " w-40"}>Identified</th>
                <th className={cellClass + " w-28"}>Platform</th>
                <th className={cellClass + " w-64"}>Description</th>
                <th className={cellClass + " w-24"}>Last Msg</th>
                <th className={cellClass}>Follow-up Message</th>
              </tr>
            </thead>
            <tbody>
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
        <td colSpan={5} className="px-2 py-1.5 text-xs font-semibold text-brand-strong">
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
    await onUpdate(lead.id, { lastMessageDate: todayIST(), followUpMessage: "" });
    setMessage("");
  }

  return (
    <tr className="border-b border-line align-top hover:bg-surface2/60">
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
          <span className={info.days >= 3 ? "font-medium text-red-700 dark:text-red-400" : "text-ink"}>
            {info.days === 0 ? "Today" : `${info.days}d ago`}
          </span>
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
