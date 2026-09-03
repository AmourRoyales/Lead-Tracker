"use client";

import { createContext, useContext, useState } from "react";

export const EMPTY_FILTERS = {
  status: "",
  leadQuality: "",
  product: "",
  platform: "",
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
  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
