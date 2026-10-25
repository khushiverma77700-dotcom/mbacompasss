import { queryOptions } from "@tanstack/react-query";
import { readCollegeDirectoryPage } from "../collegeDirectory.functions";
export const collegeDirectoryQuery = (page = 1, kind: "all" | "city" | "state" | "type" | "exam" = "all", slug = "") => queryOptions({
  queryKey: ["college-directory", kind, slug, page],
  queryFn: () => readCollegeDirectoryPage({ data: { page, kind, slug } }),
  staleTime: 5 * 60 * 1000,
});