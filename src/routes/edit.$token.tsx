import { createFileRoute } from "@tanstack/react-router";
import MagicEditPage from "@/pages/MagicEditPage";

export const Route = createFileRoute("/edit/$token")({
  component: () => <MagicEditPage />,
});
