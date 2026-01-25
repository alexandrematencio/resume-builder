'use client';

export function SkeletonStatCard() {
  return (
    <div
      className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        {/* Icon placeholder */}
        <div className="w-10 h-10 bg-primary-200 dark:bg-primary-700 rounded-lg flex-shrink-0" />
        <div className="space-y-2">
          {/* Number */}
          <div className="h-6 w-12 bg-primary-200 dark:bg-primary-700 rounded" />
          {/* Label */}
          <div className="h-3 w-20 bg-primary-200 dark:bg-primary-700 rounded" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonStatsGridProps {
  count?: number;
}

export function SkeletonStatsGrid({ count = 4 }: SkeletonStatsGridProps) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
      <span className="sr-only">Loading statistics...</span>
    </div>
  );
}
