import { createFileRoute } from "@tanstack/react-router";
import DemoAuthGate from "@/components/DemoAuthGate";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import StudentLayout from "@/pages/student/StudentLayout";
import StudentShellFallback from "@/components/student/StudentShellFallback";

export const Route = createFileRoute("/demo")({
  component: () => (
    <DemoAuthGate>
      <DemoModeProvider>
        <StudentLayout />
      </DemoModeProvider>
    </DemoAuthGate>
  ),
  pendingComponent: StudentShellFallback,
});
