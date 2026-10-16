import { cn } from "@/lib/utils";
import { useHydrated } from "@tanstack/react-router";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
