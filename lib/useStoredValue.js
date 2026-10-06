"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "stored-value-change";

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // other tabs
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// A per-browser string preference in localStorage, safe to use in SSR'd
// client components: the server render and the hydration pass both see
// `null`, then React re-renders with the stored value — reading localStorage
// in a useState initializer instead makes the server and client disagree.
export function useStoredValue(key) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );

  const setValue = useCallback(
    (next) => {
      try {
        localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );

  return [value, setValue];
}
