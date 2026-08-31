"use client";

import NavBar from "@/components/NavBar";
import LeadTable from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { currentMonthRangeIST, formatDateLabel } from "@/lib/date";

export default function GoodLeadsPage() {
  const { from, to } = currentMonthRangeIST();
  const { leads, loading, error, updateLead, removeLead } = useLeads({
    qualities: "Best,Medium",
    dateFrom: from,
    dateTo: to,
  });

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />

      <div className="border-b border-line bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Good Leads · This Month</h2>
        <p className="text-xs text-ink-mute">
          Best &amp; Medium leads from {formatDateLabel(from)} to {formatDateLabel(to)} — what
          still needs doing on each.
        </p>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : (
        <LeadTable leads={leads} onUpdate={updateLead} onDelete={removeLead} />
      )}
    </div>
  );
}
