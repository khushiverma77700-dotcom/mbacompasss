import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

export type CompareInst = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  city?: string | null;
  rating?: number | null;
};

type Ctx = {
  items: CompareInst[];
  has: (id: string) => boolean;
  toggle: (i: CompareInst) => void;
  clear: () => void;
  remove: (id: string) => void;
  max: number;
};

const CoachingCompareCtx = createContext<Ctx | null>(null);
const MAX = 3;

export const CoachingCompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CompareInst[]>([]);

  const has = useCallback((id: string) => items.some(x => x.id === id), [items]);
  const remove = useCallback((id: string) => setItems(prev => prev.filter(x => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const toggle = useCallback((i: CompareInst) => {
    setItems(prev => {
      if (prev.some(x => x.id === i.id)) return prev.filter(x => x.id !== i.id);
      if (prev.length >= MAX) return prev;
      return [...prev, i];
    });
  }, []);

  const value = useMemo(() => ({ items, has, toggle, clear, remove, max: MAX }), [items, has, toggle, clear, remove]);
  return <CoachingCompareCtx.Provider value={value}>{children}</CoachingCompareCtx.Provider>;
};

export const useCoachingCompare = () => {
  const c = useContext(CoachingCompareCtx);
  if (!c) throw new Error("useCoachingCompare must be used within CoachingCompareProvider");
  return c;
};
