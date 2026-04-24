import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgrammeCourse = {
  id: string;
  college_id: string;
  slug: string;
  name: string;
  short_name: string | null;
  programme_type: string;
  duration: string | null;
  duration_months: number | null;
  mode: string | null;
  fees_total_lakhs: number | null;
  fees_breakdown: string | null;
  fees_year: string | null;
  min_graduation_percent: number | null;
  accepts_cat: boolean;
  accepts_xat: boolean;
  accepts_gmat: boolean;
  accepts_gre: boolean;
  accepts_cmat: boolean;
  accepts_nmat: boolean;
  accepts_snap: boolean;
  accepts_iift: boolean;
  accepts_other_exams: string[] | null;
  cat_percentile_target: string | null;
  xat_percentile_target: string | null;
  gmat_score_target: string | null;
  min_work_ex_months: number | null;
  max_work_ex_months: number | null;
  min_age: number | null;
  max_age: number | null;
  specializations: string[] | null;
  highlights: string[] | null;
  intake_seats: number | null;
  source_url: string | null;
  source_brochure_url: string | null;
  evidence_snippet: string | null;
  source_verified_at: string | null;
  sort_order: number | null;
  active: boolean;
};

export const useProgrammeCourses = (collegeId?: string) =>
  useQuery({
    queryKey: ["programme-courses", collegeId],
    queryFn: async (): Promise<ProgrammeCourse[]> => {
      if (!collegeId) return [];
      const { data, error } = await supabase
        .from("programme_courses")
        .select("*")
        .eq("college_id", collegeId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProgrammeCourse[];
    },
    enabled: !!collegeId,
    staleTime: 5 * 60 * 1000,
  });

export const useProgrammeBySlug = (collegeId?: string, programmeSlug?: string) =>
  useQuery({
    queryKey: ["programme-course", collegeId, programmeSlug],
    queryFn: async (): Promise<ProgrammeCourse | null> => {
      if (!collegeId || !programmeSlug) return null;
      const { data, error } = await supabase
        .from("programme_courses")
        .select("*")
        .eq("college_id", collegeId)
        .eq("slug", programmeSlug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as ProgrammeCourse | null;
    },
    enabled: !!collegeId && !!programmeSlug,
    staleTime: 5 * 60 * 1000,
  });

// Lookup all programmes across colleges (for the cross-college MBA Compare page)
export const useAllProgrammeCourses = () =>
  useQuery({
    queryKey: ["programme-courses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programme_courses")
        .select("*, colleges:college_id (id, name, slug, city, state, logo_url, ranking, tier)")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
