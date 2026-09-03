"use client";

import {
  LEAD_QUALITY_OPTIONS,
  PLATFORM_OPTIONS,
  PRODUCT_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants";
import { EMPTY_FILTERS, useFilters } from "@/lib/FilterContext";

// Filters live in shared context (see FilterContext) so a filter set on one
// page — e.g. Platform — stays applied when you navigate to another page.
export default function FilterBar({ onAddLead }) {
  const { filters, setFilters, adIds } = useFilters();

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
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
}
