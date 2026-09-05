"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CONVERSATION_STAGE_NONE,
  CONVERSATION_STAGE_SELECT_OPTIONS,
  HIGH_PRIORITY_STATUSES,
  LEAD_QUALITY_CUSTOM,
  LEAD_QUALITY_OPTIONS,
  PLATFORM_OPTIONS,
  PRODUCT_OPTIONS,
  PRODUCT_OTHER,
  statusOptionsFor,
} from "@/lib/constants";
import { daysSinceIST, formatDateLabel } from "@/lib/date";
import { PLATFORM_COLOR, QUALITY_COLOR, STAGE_COLOR, STATUS_COLOR } from "@/lib/badgeColors";
import AddLeadModal from "@/components/AddLeadModal";

const cellClass =
  "border-r border-line px-2 py-1.5 align-top last:border-r-0";
const inputClass =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-ink hover:border-line-strong focus:border-brand focus:bg-surface focus:outline-none";

function groupByDate(leads) {
  const groups = [];
  const map = new Map();
  for (const lead of leads) {
    if (!map.has(lead.leadDate)) {
      const group = { date: lead.leadDate, leads: [] };
      map.set(lead.leadDate, group);
      groups.push(group);
    }
    map.get(lead.leadDate).leads.push(lead);
  }
  return groups;
}

export default function LeadTable({ leads, onUpdate, onDelete, showStage = false }) {
  const groups = groupByDate(leads);
  const colCount = showStage ? 10 : 9;
  const [detailLead, setDetailLead] = useState(null);

  if (leads.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-ink-mute">
        No leads yet. Click “+ New Lead” to add one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-strong bg-surface2 text-left text-xs font-medium uppercase tracking-wide text-ink-mute">
            <th className={cellClass + " w-40"}>Identified</th>
            <th className={cellClass + " w-28"}>Platform</th>
            <th className={cellClass + " w-64"}>Description</th>
            <th className={cellClass + " w-32"}>Quality</th>
            <th className={cellClass + " w-48"}>Product</th>
            <th className={cellClass + " w-28"}>Quote (USD)</th>
            <th className={cellClass + " w-28"}>Last Msg</th>
            <th className={cellClass + " w-44"}>Status</th>
            {showStage && <th className={cellClass + " w-44"}>Stage</th>}
            <th className={cellClass + " w-16"}></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <RowsForDate
              key={group.date}
              group={group}
              onUpdate={onUpdate}
              onDelete={onDelete}
              showStage={showStage}
              colCount={colCount}
              onDetailEdit={setDetailLead}
            />
          ))}
        </tbody>
      </table>

      {detailLead && (
        <AddLeadModal
          lead={detailLead}
          onUpdate={onUpdate}
          onClose={() => setDetailLead(null)}
        />
      )}
    </div>
  );
}

function RowsForDate({ group, onUpdate, onDelete, showStage, colCount, onDetailEdit }) {
  return (
    <>
      <tr className="border-b border-line-strong bg-brand/10">
        <td colSpan={colCount} className="px-2 py-1.5 text-xs font-semibold text-brand-strong">
          {formatDateLabel(group.date)}
          <span className="ml-2 font-normal text-ink-mute">
            {group.leads.length} lead{group.leads.length > 1 ? "s" : ""}
          </span>
        </td>
      </tr>
      {group.leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          onUpdate={onUpdate}
          onDelete={onDelete}
          showStage={showStage}
          onDetailEdit={onDetailEdit}
        />
      ))}
    </>
  );
}

function StageCell({ lead, onUpdate }) {
  const stage = lead.conversationStage || CONVERSATION_STAGE_NONE;
  return (
    <select
      value={stage}
      onChange={(e) => onUpdate(lead.id, { conversationStage: e.target.value })}
      title="Bump this lead to a different conversation stage, or take it out of all of them"
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${
        STAGE_COLOR[stage] || "bg-surface2 text-ink-soft"
      }`}
    >
      {CONVERSATION_STAGE_SELECT_OPTIONS.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function qualityLabel(lead) {
  return lead.leadQuality === LEAD_QUALITY_CUSTOM
    ? lead.leadQualityCustom || LEAD_QUALITY_CUSTOM
    : lead.leadQuality;
}

function productLabel(lead) {
  return lead.product === PRODUCT_OTHER ? lead.productCustom || PRODUCT_OTHER : lead.product;
}

function statusLabel(lead) {
  return lead.status === "Custom" ? lead.statusCustom || "Custom" : lead.status;
}

export function lastMessageInfo(lead) {
  if (!lead.lastMessageDate) return null;
  const days = daysSinceIST(lead.lastMessageDate);
  return { date: lead.lastMessageDate, days };
}

function DescriptionPopover({ lead, onClose, anchor }) {
  const margin = 12;
  const fromRight = anchor.x > window.innerWidth / 2;
  const fromBottom = anchor.y > window.innerHeight / 2;

  const style = {
    position: "fixed",
    maxWidth: `min(420px, calc(100vw - ${margin * 2}px))`,
    maxHeight: `min(60vh, calc(100vh - ${margin * 2}px))`,
    ...(fromRight
      ? { right: Math.max(margin, window.innerWidth - anchor.x + 8) }
      : { left: Math.min(anchor.x + 8, window.innerWidth - margin) }),
    ...(fromBottom
      ? { bottom: Math.max(margin, window.innerHeight - anchor.y + 8) }
      : { top: Math.min(anchor.y + 8, window.innerHeight - margin) }),
  };

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        style={style}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="text-sm font-semibold text-ink">{lead.identified}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-soft hover:bg-surface2"
          >
            Close
          </button>
        </div>
        <p className="overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm text-ink">
          {lead.description || "No description."}
        </p>
      </div>
    </div>,
    document.body
  );
}

export function DescriptionCell({ lead }) {
  const [anchor, setAnchor] = useState(null);

  function openAt(x, y) {
    setAnchor({ x, y });
  }

  return (
    <>
      <p
        role="button"
        tabIndex={0}
        onClick={(e) => openAt(e.clientX, e.clientY)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          const rect = e.currentTarget.getBoundingClientRect();
          openAt(rect.left, rect.bottom);
        }}
        title="Click to view full description"
        className="line-clamp-3 cursor-pointer whitespace-pre-wrap text-ink decoration-dotted hover:underline"
      >
        {lead.description || <span className="text-ink-mute">—</span>}
      </p>
      {anchor && (
        <DescriptionPopover lead={lead} anchor={anchor} onClose={() => setAnchor(null)} />
      )}
    </>
  );
}

function DeleteButton({ lead, onDelete }) {
  return (
    <button
      type="button"
      title="Delete lead"
      onClick={() => {
        if (confirm(`Delete lead "${lead.identified}"?`)) onDelete(lead.id);
      }}
      className="rounded px-1.5 py-1 text-ink-mute hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950"
    >
      ✕
    </button>
  );
}

function LeadRow({ lead, onUpdate, onDelete, showStage, onDetailEdit }) {
  const [editing, setEditing] = useState(false);

  function patch(fields) {
    onUpdate(lead.id, fields);
  }

  if (!editing) {
    return (
      <tr className="border-b border-line hover:bg-surface2/60">
        <td className={cellClass}>
          <div>{lead.identified}</div>
          {lead.adId && (
            <div className="text-xs text-ink-mute" title="Ad ID">
              Ad: {lead.adId}
            </div>
          )}
        </td>

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
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              QUALITY_COLOR[lead.leadQuality] || "bg-surface2 text-ink-soft"
            }`}
          >
            {qualityLabel(lead)}
          </span>
        </td>

        <td className={cellClass}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span>{productLabel(lead)}</span>
            {lead.isNatural && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900 dark:text-violet-300">
                Natural
              </span>
            )}
          </div>
        </td>

        <td className={cellClass}>{lead.quote != null ? lead.quote : "—"}</td>

        <td className={cellClass}>
          {(() => {
            const info = lastMessageInfo(lead);
            if (!info) return <span className="text-ink-mute">—</span>;
            return (
              <span className={info.days >= 3 ? "font-medium text-red-700 dark:text-red-400" : "text-ink"}>
                {info.days === 0 ? "Today" : `${info.days}d ago`}
              </span>
            );
          })()}
        </td>

        <td className={cellClass}>
          {HIGH_PRIORITY_STATUSES.includes(lead.status) ? (
            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
              {statusLabel(lead)}
            </span>
          ) : STATUS_COLOR[lead.status] ? (
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[lead.status]}`}>
              {statusLabel(lead)}
            </span>
          ) : (
            statusLabel(lead)
          )}
        </td>

        {showStage && (
          <td className={cellClass}>
            <StageCell lead={lead} onUpdate={onUpdate} />
          </td>
        )}

        <td className={cellClass}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Inline edit"
              onClick={() => setEditing(true)}
              className="rounded px-1.5 py-1 text-ink-mute hover:bg-surface2 hover:text-ink"
            >
              ✎
            </button>
            <button
              type="button"
              title="Detailed edit (full form)"
              onClick={() => onDetailEdit(lead)}
              className="rounded px-1.5 py-1 text-xs font-medium text-ink-mute hover:bg-surface2 hover:text-ink"
            >
              Detail
            </button>
            <DeleteButton lead={lead} onDelete={onDelete} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-line bg-surface2/60">
      <td className={cellClass}>
        <input
          className={inputClass}
          defaultValue={lead.identified}
          onBlur={(e) => e.target.value !== lead.identified && patch({ identified: e.target.value })}
        />
        <input
          className={inputClass}
          defaultValue={lead.adId || ""}
          placeholder="Ad ID"
          onBlur={(e) => e.target.value !== (lead.adId || "") && patch({ adId: e.target.value })}
        />
      </td>

      <td className={cellClass}>
        <select
          className={inputClass}
          value={lead.platform || ""}
          onChange={(e) => patch({ platform: e.target.value })}
        >
          <option value="" disabled>
            Select…
          </option>
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>

      <td className={cellClass}>
        <textarea
          className={inputClass + " resize-none"}
          rows={2}
          defaultValue={lead.description}
          onBlur={(e) => e.target.value !== lead.description && patch({ description: e.target.value })}
        />
      </td>

      <td className={cellClass}>
        <select
          className={inputClass}
          value={lead.leadQuality}
          onChange={(e) => {
            const quality = e.target.value;
            const validStatuses = statusOptionsFor(quality);
            const fields = { leadQuality: quality };
            if (!validStatuses.includes(lead.status)) fields.status = validStatuses[0];
            patch(fields);
          }}
        >
          {LEAD_QUALITY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value={LEAD_QUALITY_CUSTOM}>Custom…</option>
        </select>
        {lead.leadQuality === LEAD_QUALITY_CUSTOM && (
          <input
            className={inputClass}
            defaultValue={lead.leadQualityCustom || ""}
            placeholder="custom quality"
            onBlur={(e) =>
              e.target.value !== lead.leadQualityCustom &&
              patch({ leadQualityCustom: e.target.value })
            }
          />
        )}
      </td>

      <td className={cellClass}>
        <select
          className={inputClass}
          value={lead.product}
          onChange={(e) => patch({ product: e.target.value })}
        >
          {PRODUCT_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value={PRODUCT_OTHER}>{PRODUCT_OTHER}</option>
        </select>
        {lead.product === PRODUCT_OTHER && (
          <input
            className={inputClass}
            defaultValue={lead.productCustom || ""}
            placeholder="specify product"
            onBlur={(e) =>
              e.target.value !== lead.productCustom &&
              patch({ productCustom: e.target.value })
            }
          />
        )}
        <label className="mt-1 flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!!lead.isNatural}
            onChange={(e) => patch({ isNatural: e.target.checked })}
          />
          {lead.isNatural ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-900 dark:text-violet-300">
              Natural
            </span>
          ) : (
            <span className="text-ink-mute">Natural?</span>
          )}
        </label>
      </td>

      <td className={cellClass}>
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          defaultValue={lead.quote ?? ""}
          placeholder="—"
          onBlur={(e) => Number(e.target.value || 0) !== (lead.quote ?? 0) && patch({ quote: e.target.value })}
        />
      </td>

      <td className={cellClass}>
        <input
          type="date"
          className={inputClass}
          defaultValue={lead.lastMessageDate || ""}
          onBlur={(e) =>
            e.target.value !== (lead.lastMessageDate || "") &&
            patch({ lastMessageDate: e.target.value || null })
          }
        />
      </td>

      <td className={cellClass}>
        <select
          className={inputClass}
          value={lead.status}
          onChange={(e) => patch({ status: e.target.value })}
        >
          {statusOptionsFor(lead.leadQuality).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value="Custom">Custom…</option>
        </select>
        {lead.status === "Custom" && (
          <input
            className={inputClass}
            defaultValue={lead.statusCustom || ""}
            placeholder="custom status"
            onBlur={(e) =>
              e.target.value !== lead.statusCustom && patch({ statusCustom: e.target.value })
            }
          />
        )}
      </td>

      {showStage && (
        <td className={cellClass}>
          <StageCell lead={lead} onUpdate={onUpdate} />
        </td>
      )}

      <td className={cellClass}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Done editing"
            onClick={() => setEditing(false)}
            className="rounded px-1.5 py-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950"
          >
            ✓
          </button>
          <DeleteButton lead={lead} onDelete={onDelete} />
        </div>
      </td>
    </tr>
  );
}
