import { createContext, useContext, ReactNode } from "react";

const DemoModeCtx = createContext<boolean>(false);

export const useIsDemo = () => useContext(DemoModeCtx);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoModeCtx.Provider value={true}>{children}</DemoModeCtx.Provider>;
}
