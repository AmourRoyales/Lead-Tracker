"use client";

import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";

// Shared layout for the four conversation-stage pages (/first-message,
// /second-message, /quality-leads, /interested). Each shows only the leads
// currently at that stage, with a Stage dropdown on every row so a lead can
// be bumped straight to any other stage — once bumped away, it drops out of
// this page's list since it no longer matches the filter.
export default function StagePage({ stage, title, description }) {
  const { filters } = useFilters();
  const { leads, setLeads, loading, error, updateLead, removeLead } = useLeads({
    ...filters,
    conversationStage: stage,
  });

  async function handleUpdate(id, fields) {
    await updateLead(id, fields);
    if (fields.conversationStage && fields.conversationStage !== stage) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />
      <FilterBar />

      <div className="border-b border-line bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          {title} <span className="font-normal text-ink-mute">({leads.length})</span>
        </h2>
        <p className="text-xs text-ink-mute">{description}</p>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : (
        <LeadTable leads={leads} onUpdate={handleUpdate} onDelete={removeLead} showStage />
      )}
    </div>
  );
}
