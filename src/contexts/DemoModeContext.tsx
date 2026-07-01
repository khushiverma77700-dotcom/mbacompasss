import { createContext, useContext, ReactNode } from "react";

const DemoModeCtx = createContext<boolean>(false);

export const isDemoRoute = () =>
  typeof window !== "undefined" &&
  (window.location.pathname === "/demo" || window.location.pathname.startsWith("/demo/"));

// Be defensive: route components should still receive demo data even if a
// nested Suspense/Outlet renders before the context value is observed.
export const useIsDemo = () => useContext(DemoModeCtx) || isDemoRoute();

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoModeCtx.Provider value={true}>{children}</DemoModeCtx.Provider>;
}
