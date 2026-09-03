import { createFileRoute } from "@tanstack/react-router";
import IpmatPreparationGuide from "@/pages/guides/IpmatPreparationGuide";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/guides/ipmat-preparation")({
  component: () => <IpmatPreparationGuide />,
  pendingComponent: PublicPageSkeleton,
});
