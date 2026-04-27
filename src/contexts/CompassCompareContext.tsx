import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface Ctx {
  ids: string[];
  add: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CompassCompareContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "mba-compass-compare";
const MAX = 3;

export function CompassCompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const add = (id: string) => {
    if (ids.includes(id)) return true;
    if (ids.length >= MAX) return false;
    setIds([...ids, id]);
    return true;
  };
  const remove = (id: string) => setIds(ids.filter((x) => x !== id));
  const clear = () => setIds([]);
  const has = (id: string) => ids.includes(id);

  return (
    <CompassCompareContext.Provider value={{ ids, add, remove, clear, has }}>
      {children}
    </CompassCompareContext.Provider>
  );
}

export function useCompassCompare() {
  const ctx = useContext(CompassCompareContext);
  if (!ctx) throw new Error("useCompassCompare must be used within CompassCompareProvider");
  return ctx;
}
