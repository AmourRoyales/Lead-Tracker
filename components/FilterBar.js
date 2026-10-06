"use client";

import {
  CLOSED_FOR_NOW_STATUS,
  LEAD_QUALITY_OPTIONS,
  PLATFORM_OPTIONS,
  PRODUCT_OPTIONS,
  SORT_LAST_MSG_NEWEST,
  SORT_LAST_MSG_OLDEST,
  STATUS_OPTIONS,
} from "@/lib/constants";
import { EMPTY_FILTERS, useFilters } from "@/lib/FilterContext";
import { useStoredValue } from "@/lib/useStoredValue";

const COLLAPSED_KEY = "filterBar.collapsed";

// Filters live in shared context (see FilterContext) so a filter set on one
// page — e.g. Platform — stays applied when you navigate to another page.
// `collapsible` adds a toggle row that hides the filters behind a
// "Filters (N active)" header; the open/closed choice is remembered per browser.
export default function FilterBar({ onAddLead, collapsible = false }) {
  const { filters, setFilters, adIds } = useFilters();
  // Collapsed unless the viewer explicitly opened it before.
  const [storedCollapsed, setStoredCollapsed] = useStoredValue(COLLAPSED_KEY);
  const collapsed = collapsible && storedCollapsed !== "0";

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function toggleCollapsed() {
    setStoredCollapsed(collapsed ? "0" : "1");
  }

  const activeCount = Object.keys(EMPTY_FILTERS).filter(
    (k) => filters[k] !== EMPTY_FILTERS[k]
  ).length;

  const bar = collapsed ? null : (
    <div className="flex flex-wrap items-end gap-3 border-b border-line bg-surface px-4 py-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Search</label>
        <input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Identified / description"
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Status</label>
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          {/* Only assignable on Quality Leads, but filterable anywhere so
              parked leads can still be found. */}
          <option value={CLOSED_FOR_NOW_STATUS}>{CLOSED_FOR_NOW_STATUS}</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Lead Quality</label>
        <select
          value={filters.leadQuality}
          onChange={(e) => set("leadQuality", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All</option>
          {LEAD_QUALITY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value="Custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Product</label>
        <select
          value={filters.product}
          onChange={(e) => set("product", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All</option>
          {PRODUCT_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Platform</label>
        <select
          value={filters.platform}
          onChange={(e) => set("platform", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All</option>
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Ad ID</label>
        <select
          value={filters.adId}
          onChange={(e) => set("adId", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">All</option>
          {adIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 pb-1.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={filters.naturalOnly}
          onChange={(e) => set("naturalOnly", e.target.checked)}
        />
        Natural only
      </label>

      <label className="flex items-center gap-1.5 pb-1.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={filters.b2bOnly}
          onChange={(e) => set("b2bOnly", e.target.checked)}
        />
        B2B only
      </label>

      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-mute">From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
            className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-mute">To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set("dateTo", e.target.value)}
            className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-mute">Sort</label>
        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value)}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Default (lead date)</option>
          <option value={SORT_LAST_MSG_OLDEST}>Last msg ↓ (9d ago → 6d ago)</option>
          <option value={SORT_LAST_MSG_NEWEST}>Last msg ↑ (6d ago → 9d ago)</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => setFilters(EMPTY_FILTERS)}
        className="rounded-md px-2 py-1.5 text-xs text-ink-soft hover:bg-surface2"
      >
        Clear filters
      </button>

      {onAddLead && (
        <button
          type="button"
          onClick={onAddLead}
          className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          + New Lead
        </button>
      )}
    </div>
  );

  if (!collapsible) return bar;

  return (
    <>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 border-b border-line bg-surface px-4 py-2 text-left text-sm font-medium text-ink-soft hover:bg-surface2"
      >
        <span className={`inline-block text-xs transition-transform ${collapsed ? "" : "rotate-90"}`}>▶</span>
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
            {activeCount} active
          </span>
        )}
      </button>
      {bar}
    </>
  );
}
