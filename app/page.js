"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import FilterBar from "@/components/FilterBar";
import LeadTable from "@/components/LeadTable";
import AddLeadModal from "@/components/AddLeadModal";
import { useLeads } from "@/lib/useLeads";
import { useFilters } from "@/lib/FilterContext";

export default function Home() {
  const { filters } = useFilters();
  const [showAdd, setShowAdd] = useState(false);
  const { leads, setLeads, loading, error, updateLead, removeLead } = useLeads(filters);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar />

      <FilterBar onAddLead={() => setShowAdd(true)} />

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="px-4 py-6 text-sm text-ink-mute">Loading…</p>
      ) : (
        <LeadTable leads={leads} onUpdate={updateLead} onDelete={removeLead} />
      )}

      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onCreated={(lead) => {
            setShowAdd(false);
            setLeads((prev) => [lead, ...prev].sort((a, b) => (a.leadDate < b.leadDate ? 1 : -1)));
          }}
        />
      )}
    </div>
  );
}
