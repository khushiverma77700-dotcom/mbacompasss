import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import IpmatPreparationGuide from "@/pages/guides/IpmatPreparationGuide";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/guides/ipmat-preparation")({
  head: () => publicPageHead("/guides/ipmat-preparation", "Ipmat Preparation | MBA Compass", "Explore ipmat preparation information, guides and resources on MBA Compass."),
  component: () => <IpmatPreparationGuide />,
  pendingComponent: PublicPageSkeleton,
});
