import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the user has at least one paid/granted course/mock enrollment.
 * Free signups (mock_enrollments.source = 'free') do NOT count — students must
 * have purchased a course (or had one assigned by an admin) to access the LMS.
 */
export async function userHasPurchasedCourse(userId: string): Promise<boolean> {
  const [courseRes, bundleRes, mockRes] = await Promise.all([
    supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("mock_bundle_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("mock_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("source", "free"),
  ]);

  return (
    (courseRes.count ?? 0) > 0 ||
    (bundleRes.count ?? 0) > 0 ||
    (mockRes.count ?? 0) > 0
  );
}

export const NO_PURCHASE_MESSAGE =
  "No account found. Please purchase a course at mbacompass.in/courses to access the student dashboard.";
