'use client';

import { MapPin, Clock, Building2, Briefcase, Ban, Sparkles, Star, CheckCircle, Archive } from 'lucide-react';
import Link from 'next/link';
import type { JobOffer } from '@/app/types';
import { interpretScore } from '@/lib/job-filter-service';

interface JobOfferCardProps {
  job: JobOffer;
  onAnalyze?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
  analyzing?: boolean;
}

export default function JobOfferCard({
  job,
  onAnalyze,
  onSave,
  onDismiss,
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
    <div
      className={`rounded-xl border transition-all ${
        job.isBlocked
          ? 'bg-white dark:bg-primary-800 border-error-300 dark:border-error-700 opacity-60 hover:shadow-md'
          : isArchived
          ? 'bg-primary-50/50 dark:bg-primary-900/50 border-primary-300 dark:border-primary-600 opacity-80 hover:opacity-90 hover:shadow-sm'
          : 'bg-white dark:bg-primary-800 border-primary-200 dark:border-primary-700 hover:shadow-md'
      }`}
    >
      <div className="p-4">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300">
                  <Ban className="w-3 h-3" />
                  Blocked
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
          <div className="mt-3 p-2 bg-error-50 dark:bg-error-900/20 rounded-lg">
            <p className="text-xs text-error-700 dark:text-error-300">
              {job.blockReasons.join(' • ')}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-primary-200 dark:border-primary-700">
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
        >
          View Details
        </Link>
        <div className="flex items-center gap-2">
          {!hasScore && onAnalyze && !isArchived && (
            <button
              onClick={() => onAnalyze(job.id)}
              disabled={analyzing}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-accent-700 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-accent-600" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Analyze
                </>
              )}
            </button>
          )}
          {onSave && job.status !== 'saved' && job.status !== 'applied' && job.status !== 'archived' && (
            <button
              onClick={() => onSave(job.id)}
              className="px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors"
            >
              Save
            </button>
          )}
          {onDismiss && job.status !== 'archived' && (
            <button
              onClick={() => onDismiss(job.id)}
              className="px-3 py-1.5 text-sm font-medium text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
