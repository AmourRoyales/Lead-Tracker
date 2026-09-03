"use client";

import { useMemo } from "react";
import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";
import { daysSinceIST } from "@/lib/date";

const URGENT_AFTER_DAYS = 3;

export default function OrderPage() {
  const { filters } = useFilters();
  const { leads, loading, error, updateLead, removeLead } = useLeads(filters);

  const { quotePending, urgentFollowUps } = useMemo(() => {
    const quotePending = leads.filter((l) => l.quote == null);
    const urgentFollowUps = leads.filter((l) => {
      if (l.quote == null) return false;
      const days = daysSinceIST(l.lastMessageDate || l.leadDate);
      return days != null && days >= URGENT_AFTER_DAYS;
    });
    return { quotePending, urgentFollowUps };
  }, [leads]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />
      <FilterBar />

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : (
        <>
          <div className="border-b border-line bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Quote Pending{" "}
              <span className="font-normal text-ink-mute">({quotePending.length})</span>
            </h2>
            <p className="text-xs text-ink-mute">Leads that asked for a price we haven&apos;t given yet.</p>
          </div>
          <LeadTable leads={quotePending} onUpdate={updateLead} onDelete={removeLead} />

          <div className="border-b border-t border-line bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Follow-up Extremely Needed{" "}
              <span className="font-normal text-ink-mute">({urgentFollowUps.length})</span>
            </h2>
            <p className="text-xs text-ink-mute">
              Quoted leads with no update in {URGENT_AFTER_DAYS}+ days.
            </p>
          </div>
          <LeadTable leads={urgentFollowUps} onUpdate={updateLead} onDelete={removeLead} />
        </>
      )}
    </div>
  );
}
