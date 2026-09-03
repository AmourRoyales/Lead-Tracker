"use client";

import { useMemo } from "react";
import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";
import { formatMonthLabel } from "@/lib/date";

function monthKey(leadDate) {
  return leadDate ? leadDate.slice(0, 7) : "Unspecified";
}

export default function GoodLeadsPage() {
  const { filters } = useFilters();
  const { leads, loading, error, updateLead, removeLead } = useLeads({
    ...filters,
    qualities: "Best,Medium",
  });

  // `leads` arrives sorted by leadDate desc from the API, so the first month
  // key encountered is the most recent — Map preserves that insertion order,
  // giving current month first, then previous months, each internally still
  // newest-date-first (LeadTable groups each month's leads by exact day).
  const monthGroups = useMemo(() => {
    const map = new Map();
    for (const lead of leads) {
      const key = monthKey(lead.leadDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lead);
    }
    return [...map.entries()];
  }, [leads]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />
      <FilterBar />

      <div className="border-b border-line bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Good Leads · All Time</h2>
        <p className="text-xs text-ink-mute">
          Best &amp; Medium leads, current month first, then earlier months — newest date on
          top within each month.
        </p>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="p-10 text-center text-sm text-ink-mute">No good leads yet.</div>
      ) : (
        monthGroups.map(([key, monthLeads]) => (
          <div key={key}>
            <div className="border-b border-t border-line bg-surface2 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {key === "Unspecified" ? "Unspecified" : formatMonthLabel(key)}
                <span className="ml-2 font-normal normal-case text-ink-mute">
                  {monthLeads.length} lead{monthLeads.length > 1 ? "s" : ""}
                </span>
              </h3>
            </div>
            <LeadTable leads={monthLeads} onUpdate={updateLead} onDelete={removeLead} />
          </div>
        ))
      )}
    </div>
  );
}
