import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute } from "@tanstack/react-router";
import IIMWaitlistPage from "@/pages/IIMWaitlistPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/tools/iim-waitlist-movement")({
  head: () => publicPageHead("/tools/iim-waitlist-movement", "IIM Waitlist Movement | MBA Compass", "Explore iim waitlist movement information and personalised MBA preparation tools on MBA Compass."),
  component: () => <IIMWaitlistPage />,
  pendingComponent: PublicPageSkeleton,
});
