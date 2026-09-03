import { Navigate, useParams } from "@/lib/router-compat";

/** /exams/:slug → /exam/:slug (strips a trailing "-exam"). Ported from App.tsx. */
export const ExamSlugRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const clean = (slug || "").replace(/-exam$/, "");
  return <Navigate to={`/exam/${clean}`} replace />;
};

/** /course/:slug → /courses/:slug. Ported from App.tsx. */
export const CourseSlugRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/courses/${slug || ""}`} replace />;
};
