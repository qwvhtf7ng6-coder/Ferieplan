/**
 * Generic page loading skeleton — used by all loading.tsx files.
 * Renders a shimmer placeholder that matches the general page layout.
 */
export function PageSkeleton() {
  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8 animate-pulse">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-48 rounded-lg bg-border mb-2" />
          <div className="h-4 w-64 rounded-md bg-border" />
        </div>
        <div className="h-9 w-28 rounded-md bg-border" />
      </div>
      {/* Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-border shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-border" />
                <div className="h-3 w-1/2 rounded bg-border" />
              </div>
              <div className="h-6 w-16 rounded-full bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
