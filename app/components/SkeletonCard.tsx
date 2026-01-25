'use client';

interface SkeletonCardProps {
  variant: 'application' | 'job';
}

export function SkeletonCard({ variant }: SkeletonCardProps) {
  return (
    <div
      className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start gap-4">
        {/* Avatar/Icon placeholder */}
        <div className="w-10 h-10 bg-primary-200 dark:bg-primary-700 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Title */}
          <div className="h-4 bg-primary-200 dark:bg-primary-700 rounded w-1/3" />
          {/* Subtitle */}
          <div className="h-3 bg-primary-200 dark:bg-primary-700 rounded w-1/4" />
        </div>
        {/* Status badge placeholder */}
        <div className="h-6 w-16 bg-primary-200 dark:bg-primary-700 rounded-full flex-shrink-0" />
      </div>

      {variant === 'application' && (
        <div className="mt-4 space-y-2">
          {/* Description lines */}
          <div className="h-3 bg-primary-200 dark:bg-primary-700 rounded w-full" />
          <div className="h-3 bg-primary-200 dark:bg-primary-700 rounded w-2/3" />
        </div>
      )}

      {variant === 'job' && (
        <>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {/* Meta info placeholders */}
            <div className="h-4 w-24 bg-primary-200 dark:bg-primary-700 rounded" />
            <div className="h-4 w-20 bg-primary-200 dark:bg-primary-700 rounded" />
            <div className="h-4 w-28 bg-primary-200 dark:bg-primary-700 rounded" />
          </div>
          {/* Skills badges */}
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 bg-primary-200 dark:bg-primary-700 rounded-full" />
            <div className="h-6 w-20 bg-primary-200 dark:bg-primary-700 rounded-full" />
            <div className="h-6 w-14 bg-primary-200 dark:bg-primary-700 rounded-full" />
          </div>
        </>
      )}
    </div>
  );
}

interface SkeletonListProps {
  variant: 'application' | 'job';
  count?: number;
}

export function SkeletonList({ variant, count = 3 }: SkeletonListProps) {
  return (
    <div className="space-y-4" role="status" aria-label={`Loading ${variant}s`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
      <span className="sr-only">Loading {variant}s...</span>
    </div>
  );
}
