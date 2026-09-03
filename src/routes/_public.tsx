import { createFileRoute, Outlet } from "@tanstack/react-router";
import PublicLayoutShell from "@/components/layout/PublicLayoutShell";

export const Route = createFileRoute("/_public")({
  component: () => (
    <PublicLayoutShell>
      <Outlet />
    </PublicLayoutShell>
  ),
});
