'use client';

import { MapPin, Clock, Building2, Briefcase, AlertTriangle, Ban, Sparkles, Star, CheckCircle, Archive, X, FileText } from 'lucide-react';
import Link from 'next/link';
import type { JobOffer } from '@/app/types';
import { interpretScore } from '@/lib/job-filter-service';

interface JobOfferCardProps {
  job: JobOffer;
  onAnalyze?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
  onArchive?: (jobId: string) => void;
  onApply?: (job: JobOffer) => void;
  analyzing?: boolean;
}

export default function JobOfferCard({
  job,
  onAnalyze,
  onSave,
  onDismiss,
  onArchive,
  onApply,
  analyzing = false,
}: JobOfferCardProps) {
  const hasScore = job.overallScore !== null;
  const scoreInfo = hasScore ? interpretScore(job.overallScore!) : null;

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency || 'EUR';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    });

    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return null;
  };

  const presenceLabels: Record<string, string> = {
    full_remote: 'Remote',
    hybrid: 'Hybrid',
    on_site: 'On-site',
  };

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    saved: {
      label: 'Saved',
      icon: <Star className="w-3 h-3" />,
      className: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
    },
    applied: {
      label: 'Applied',
      icon: <CheckCircle className="w-3 h-3" />,
      className: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300',
    },
    archived: {
      label: 'Archived',
      icon: <Archive className="w-3 h-3" />,
      className: 'bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-400',
    },
    rejected: {
      label: 'Rejected',
      icon: <Ban className="w-3 h-3" />,
      className: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300',
    },
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const statusInfo = job.status && statusConfig[job.status];

  const isArchived = job.status === 'archived';
  const isDismissed = job.status === 'rejected' || job.status === 'archived';

  return (
    <article
      aria-label={`${job.title} at ${job.company}`}
      className={`relative rounded-xl border transition-all motion-reduce:transition-none ${
        job.isBlocked
          ? 'bg-white dark:bg-primary-800 border-warning-300 dark:border-warning-700 opacity-75 hover:shadow-md'
          : isArchived
          ? 'bg-primary-50/50 dark:bg-primary-900/50 border-primary-300 dark:border-primary-600 opacity-80 hover:opacity-90 hover:shadow-sm'
          : 'bg-white dark:bg-primary-800 border-primary-200 dark:border-primary-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600'
      }`}
    >
      <Link
        href={`/jobs/${job.id}`}
        className="block p-4 pb-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-lg font-semibold truncate ${
                  isDismissed
                    ? 'text-primary-500 dark:text-primary-500 line-through decoration-error-500 decoration-2'
                    : 'text-primary-900 dark:text-primary-50'
                }`}
              >
                {job.title}
              </h3>
              {statusInfo && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              )}
              {job.isBlocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300">
                  <AlertTriangle className="w-3 h-3" />
                  Warning
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-primary-600 dark:text-primary-400">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job.company}</span>
              {job.location && (
                <>
                  <span className="text-primary-300 dark:text-primary-600">•</span>
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Score Badge */}
          {hasScore && scoreInfo && (
            <div
              className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-lg ${
                scoreInfo.color === 'green'
                  ? 'bg-success-100 dark:bg-success-900/30'
                  : scoreInfo.color === 'blue'
                  ? 'bg-info-100 dark:bg-info-900/30'
                  : scoreInfo.color === 'yellow'
                  ? 'bg-warning-100 dark:bg-warning-900/30'
                  : 'bg-error-100 dark:bg-error-900/30'
              }`}
            >
              <span
                className={`text-xl font-bold ${
                  scoreInfo.color === 'green'
                    ? 'text-success-700 dark:text-success-300'
                    : scoreInfo.color === 'blue'
                    ? 'text-info-700 dark:text-info-300'
                    : scoreInfo.color === 'yellow'
                    ? 'text-warning-700 dark:text-warning-300'
                    : 'text-error-700 dark:text-error-300'
                }`}
              >
                {job.overallScore}
              </span>
              <span className="text-xs text-primary-500 dark:text-primary-400">score</span>
            </div>
          )}
        </div>

        {/* Meta Info - Zero N/A Rule: Only show if data exists */}
        <div className="flex flex-wrap gap-3 mt-3">
          {salary && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-300 rounded text-sm">
              <span className="text-success-600 dark:text-success-400 font-medium">{salary}</span>
            </span>
          )}
          {job.contractType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-300 rounded text-sm">
              <Briefcase className="w-3 h-3" />
              {job.contractType}
            </span>
          )}
          {job.presenceType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-300 rounded text-sm">
              <Clock className="w-3 h-3" />
              {presenceLabels[job.presenceType] || job.presenceType}
            </span>
          )}
        </div>

        {/* Skills */}
        {job.requiredSkills.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {job.requiredSkills.slice(0, 5).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
              {job.requiredSkills.length > 5 && (
                <span className="px-2 py-0.5 text-primary-500 dark:text-primary-400 text-xs">
                  +{job.requiredSkills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Match Info */}
        {hasScore && (
          <div className="flex items-center gap-4 mt-3 text-sm text-primary-600 dark:text-primary-400">
            {job.skillsMatchPercent !== null && (
              <span>
                {job.skillsMatchPercent}% skills match
              </span>
            )}
            {job.perksMatchCount !== null && job.perksMatchCount > 0 && (
              <span>{job.perksMatchCount} perks matched</span>
            )}
          </div>
        )}

        {/* Block Reasons */}
        {job.isBlocked && job.blockReasons.length > 0 && (
          <div className="mt-3 p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
            <p className="text-xs text-warning-700 dark:text-warning-300">
              {job.blockReasons.join(' • ')}
            </p>
          </div>
        )}
      </Link>

      {/* Actions — icon-only, bottom-right */}
      {((!hasScore && onAnalyze && !isArchived) || (onSave && job.status !== 'saved' && job.status !== 'applied' && job.status !== 'archived') || (onDismiss && job.status !== 'archived') || (onArchive && job.isBlocked && job.status !== 'archived') || (onApply && job.status === 'saved' && hasScore)) && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 z-10">
          {onApply && job.status === 'saved' && hasScore && (
            <button
              onClick={(e) => { e.preventDefault(); onApply(job); }}
              title="Start Application"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-md transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Apply
            </button>
          )}
          {!hasScore && onAnalyze && !isArchived && (
            <button
              onClick={(e) => { e.preventDefault(); onAnalyze(job.id); }}
              disabled={analyzing}
              title="Analyze with AI"
              className="w-7 h-7 inline-flex items-center justify-center text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-md transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-accent-600" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          )}
          {onSave && job.status !== 'saved' && job.status !== 'applied' && job.status !== 'archived' && (
            <button
              onClick={(e) => { e.preventDefault(); onSave(job.id); }}
              title="Save"
              className="w-7 h-7 inline-flex items-center justify-center text-primary-400 dark:text-primary-500 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-md transition-colors"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          {onDismiss && job.status !== 'archived' && (
            <button
              onClick={(e) => { e.preventDefault(); onDismiss(job.id); }}
              title="Dismiss"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary-400 dark:text-primary-500 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </button>
          )}
          {onArchive && job.isBlocked && job.status !== 'archived' && (
            <button
              onClick={(e) => { e.preventDefault(); onArchive(job.id); }}
              title="Archive"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary-400 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-md transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          )}
        </div>
      )}
    </article>
  );
}
