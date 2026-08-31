"use client";

import { useCallback, useEffect, useState } from "react";

export function useLeads(params) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params || {});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const search = new URLSearchParams();
    Object.entries(JSON.parse(paramsKey)).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    try {
      const res = await fetch(`/api/leads?${search.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

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
