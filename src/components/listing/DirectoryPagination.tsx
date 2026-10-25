import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { DIRECTORY_PAGE_SIZE, directoryPageUrl } from "@/lib/directoryPagination";
export default function DirectoryPagination({ path, page, total, search }: { path: string; page: number; total: number; search?: URLSearchParams }) {
  const pages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  if (pages <= 1) return null;
  return <nav aria-label="Directory pages" className="flex flex-wrap justify-center items-center gap-4 mt-8">
    {page > 1 && <Button variant="outline" asChild><Link preload={false} to={directoryPageUrl(path, page - 1, search)} rel="prev">Previous</Link></Button>}
    <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
    {page < pages && <Button variant="outline" asChild><Link preload={false} to={directoryPageUrl(path, page + 1, search)} rel="next">Next</Link></Button>}
  </nav>;
}