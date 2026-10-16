import { createFileRoute, notFound } from "@tanstack/react-router";
import InstitutePage from "@/pages/InstitutePage";
import PublicPageSkeleton from "@/components/PublicPageSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { publicPageHead } from "@/lib/publicPageHead";

export const Route = createFileRoute("/_public/institute/$slug")({
  loader: async ({ context, params }) => ({ row: await context.queryClient.ensureQueryData({
    queryKey: ["institute_full", params.slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutes").select(`*,
        institute_courses(course:courses(id, name, fees, duration, mode, description, course_category_id, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)),
        direct_courses:courses!courses_institute_id_fkey(id, name, fees, duration, mode, description, course_category_id, curriculum, highlights, eligibility, batch_info, start_date, brochure_url, discount_text, total_seats, rating)
      `).eq("slug", params.slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  }) }),
  head: ({ loaderData, params }) => publicPageHead(`/institute/${params.slug}`,
    loaderData?.row?.meta_title || `${loaderData?.row?.name || params.slug}: Courses & Fees`,
    loaderData?.row?.meta_description || loaderData?.row?.description || "Compare coaching courses, fees, faculty and preparation options on MBA Compass.",
    loaderData?.row?.banner_url || loaderData?.row?.logo_url || undefined),
  component: () => <InstitutePage />,
  pendingComponent: PublicPageSkeleton,
});
