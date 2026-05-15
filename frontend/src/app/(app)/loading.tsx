import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly during route transitions in Next.js while the destination
 * page chunk loads + mounts. Replaces the "click does nothing for 5 seconds"
 * dev-mode experience with an immediate skeleton.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
