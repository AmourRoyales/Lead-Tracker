"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// In-memory cache of the last result for each query, shared across pages for
// the life of the tab. Revisiting a page (or calendar month) renders the
// cached leads instantly while a fresh fetch runs in the background, instead
// of a blank "Loading…" on every navigation.
const cache = new Map();

export function useLeads(params) {
  const paramsKey = JSON.stringify(params || {});
  // Latest fetched (or locally edited) result, tagged with the query it's for.
  const [state, setState] = useState({ key: null, leads: [], error: null });
  const requestId = useRef(0);

  const isCurrent = state.key === paramsKey;
  const leads = isCurrent ? state.leads : cache.get(paramsKey) || [];
  const loading = !isCurrent && !cache.has(paramsKey);
  const error = isCurrent ? state.error : null;

  // Optimistic edits go through here so the cache stays in step with them.
  const setLeads = useCallback(
    (next) => {
      setState((prev) => {
        const base = prev.key === paramsKey ? prev.leads : cache.get(paramsKey) || [];
        const value = typeof next === "function" ? next(base) : next;
        cache.set(paramsKey, value);
        return { key: paramsKey, leads: value, error: null };
      });
    },
    [paramsKey, setState]
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const search = new URLSearchParams();
    Object.entries(JSON.parse(paramsKey)).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    try {
      const res = await fetch(`/api/leads?${search.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      const fresh = data.leads || [];
      cache.set(paramsKey, fresh);
      // A newer request (params changed meanwhile) owns the state now.
      if (id === requestId.current) setState({ key: paramsKey, leads: fresh, error: null });
    } catch (err) {
      if (id === requestId.current) {
        setState({ key: paramsKey, leads: cache.get(paramsKey) || [], error: err.message });
      }
    }
  }, [paramsKey, setState]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateLead(id, fields) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? data.lead : l)));
    } catch {
      load();
    }
  }

  async function removeLead(id) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  return { leads, setLeads, loading, error, load, updateLead, removeLead };
}
