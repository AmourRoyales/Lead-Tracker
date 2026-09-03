"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const EMPTY_FILTERS = {
  status: "",
  leadQuality: "",
  product: "",
  platform: "",
  adId: "",
  naturalOnly: false,
  dateFrom: "",
  dateTo: "",
  search: "",
};

const FilterContext = createContext(null);

// Lives above the router outlet in the root layout, so it survives
// client-side navigation between pages — a filter set on one page stays
// applied when you switch to another.
export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Distinct Ad IDs seen across all leads, for the Ad ID filter dropdown.
  // Fetched once here (not per-page) since this provider outlives navigation.
  const [adIds, setAdIds] = useState([]);

  useEffect(() => {
    fetch("/api/leads/ad-ids")
      .then((res) => res.json())
      .then((data) => setAdIds(data.adIds || []))
      .catch(() => {});
  }, []);

  return (
    <FilterContext.Provider value={{ filters, setFilters, adIds }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
