import { supabase } from "@/integrations/supabase/client";
import { publicPageHead } from "@/lib/publicPageHead";
import { createFileRoute, redirect } from "@tanstack/react-router";
import CoachingFilterPage from "@/pages/CoachingFilterPage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";

export const Route = createFileRoute("/_public/coaching/$region")({
  beforeLoad: async ({ params }) => {
    const { data, error } = await supabase.from("institutes").select("slug").eq("slug", params.region).maybeSingle();
    if (error) throw error;
    if (data?.slug) throw redirect({ to: "/institute/$slug", params: { slug: data.slug }, statusCode: 301 });
  },
  head: ({ params }) => publicPageHead(`/coaching/${params.region}`, `MBA Coaching in ${params.region.replace(/-/g, " ")}`, "Compare regional MBA coaching institutes, courses, fees and preparation options on MBA Compass."),
  component: () => <CoachingFilterPage />,
  pendingComponent: PublicPageSkeleton,
});
