'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Home,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Star,
  Archive,
  FileText,
  Sparkles,
  Loader2,
  XCircle,
  TrendingUp,
  Shield,
} from 'lucide-react';
import type { JobOffer, AIInsights } from '@/app/types';
import { PERK_LABELS } from '@/app/types';
import { interpretScore } from '@/lib/job-filter-service';

interface JobIntelligenceViewProps {
  job: JobOffer;
  onBack: () => void;
  onAnalyze: () => Promise<void>;
  onSave: () => Promise<void>;
  onApply: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDismissRedFlag?: (flag: string) => Promise<void>;
  analyzing?: boolean;
}

export default function JobIntelligenceView({
  job,
  onBack,
  onAnalyze,
  onSave,
  onApply,
  onArchive,
  onDismissRedFlag,
  analyzing = false,
}: JobIntelligenceViewProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const scoreInfo = job.overallScore !== null ? interpretScore(job.overallScore) : null;

  const presenceLabels = {
    full_remote: 'Full Remote',
    hybrid: 'Hybrid',
    on_site: 'On-site',
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-success-500';
    if (score >= 70) return 'bg-accent-500';
    if (score >= 55) return 'bg-warning-500';
    return 'bg-error-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 85) return 'text-success-600 dark:text-success-400';
    if (score >= 70) return 'text-accent-600 dark:text-accent-400';
    if (score >= 55) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>

        {job.overallScore !== null && (
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${getScoreColor(job.overallScore)} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">{job.overallScore}</span>
            </div>
            {scoreInfo && (
              <div>
                <p className={`font-medium ${getScoreTextColor(job.overallScore)}`}>
                  {scoreInfo.label}
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-400">
                  {scoreInfo.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Job Title and Company */}
      <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-900 dark:text-primary-50 mb-2">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-primary-600 dark:text-primary-400">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {job.company}
              </span>
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
              )}
              {job.presenceType && (
                <span className="inline-flex items-center gap-1.5">
                  <Home className="w-4 h-4" />
                  {presenceLabels[job.presenceType]}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {job.isBlocked && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300 text-sm">
                <XCircle className="w-4 h-4" />
                Blocked
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              job.status === 'saved' ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300' :
              job.status === 'applied' ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300' :
              job.status === 'analyzed' ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300' :
              'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300'
            }`}>
              {job.status}
            </span>
          </div>
        </div>

        {/* Quick Facts */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-primary-100 dark:border-primary-700">
          {(job.salaryMin || job.salaryMax) && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success-500" />
              <span className="text-primary-900 dark:text-primary-100">
                {job.salaryMin && job.salaryMax
                  ? `${job.salaryCurrency || '€'}${job.salaryMin.toLocaleString()} - ${job.salaryCurrency || '€'}${job.salaryMax.toLocaleString()}`
                  : job.salaryMin
                    ? `From ${job.salaryCurrency || '€'}${job.salaryMin.toLocaleString()}`
                    : `Up to ${job.salaryCurrency || '€'}${job.salaryMax?.toLocaleString()}`}
              </span>
            </div>
          )}
          {job.hoursPerWeek && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <span className="text-primary-900 dark:text-primary-100">{job.hoursPerWeek}h/week</span>
            </div>
          )}
          {job.contractType && (
            <span className="text-primary-600 dark:text-primary-400">{job.contractType}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-primary-100 dark:border-primary-700">
          {!job.aiInsights && (
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analyze with AI
            </button>
          )}
          {job.status !== 'saved' && job.status !== 'applied' && (
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-600 transition-colors"
            >
              <Star className="w-4 h-4" />
              Save
            </button>
          )}
          {job.status !== 'applied' && (
            <button
              onClick={onApply}
              className="inline-flex items-center gap-2 px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Apply to this offer
            </button>
          )}
          <button
            onClick={onArchive}
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 dark:border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-700 transition-colors"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
        </div>
      </div>

      {/* Block Reasons */}
      {job.isBlocked && job.blockReasons.length > 0 && (
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4">
          <h3 className="font-medium text-error-800 dark:text-error-200 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            This job is blocked
          </h3>
          <ul className="space-y-1">
            {job.blockReasons.map((reason, index) => (
              <li key={index} className="text-sm text-error-700 dark:text-error-300 flex items-start gap-2">
                <span className="text-error-500 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Insights Section */}
      {job.aiInsights && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-500" />
            AI Analysis
          </h2>

          {/* Match Summary */}
          <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-xl p-4">
            <p className="text-accent-800 dark:text-accent-200">{job.aiInsights.matchSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            {job.aiInsights.strengths.length > 0 && (
              <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4">
                <h3 className="font-medium text-success-700 dark:text-success-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {job.aiInsights.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-primary-700 dark:text-primary-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skill Gaps */}
            {job.aiInsights.skillGaps.length > 0 && (
              <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4">
                <h3 className="font-medium text-warning-700 dark:text-warning-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Skill Gaps
                </h3>
                <ul className="space-y-2">
                  {job.aiInsights.skillGaps.map((gap, index) => (
                    <li key={index} className="text-sm text-primary-700 dark:text-primary-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Strategic Advice */}
          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4">
            <h3 className="font-medium text-accent-700 dark:text-accent-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Strategic Advice
            </h3>
            <p className="text-primary-700 dark:text-primary-300 text-sm leading-relaxed">
              {job.aiInsights.strategicAdvice}
            </p>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.aiInsights.cultureFit && (
              <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4">
                <h3 className="font-medium text-primary-700 dark:text-primary-300 mb-2">Culture Fit</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400">{job.aiInsights.cultureFit}</p>
              </div>
            )}

            {job.aiInsights.growthPotential && (
              <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4">
                <h3 className="font-medium text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Growth Potential
                </h3>
                <p className="text-sm text-primary-600 dark:text-primary-400">{job.aiInsights.growthPotential}</p>
              </div>
            )}
          </div>

          {/* Red Flags */}
          {job.aiInsights.redFlags.length > 0 && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4">
              <h3 className="font-medium text-error-700 dark:text-error-300 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Red Flags
              </h3>
              <ul className="space-y-2">
                {job.aiInsights.redFlags.map((flag, index) => {
                  const isDismissed = (job.dismissedRedFlags || []).includes(flag);
                  return (
                    <li key={index} className={`text-sm flex items-start gap-2 ${isDismissed ? 'opacity-50' : 'text-error-700 dark:text-error-300'}`}>
                      <XCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDismissed ? 'text-primary-400' : 'text-error-500'}`} />
                      <span className={isDismissed ? 'line-through text-primary-500 dark:text-primary-400' : ''}>
                        {flag}
                      </span>
                      {isDismissed ? (
                        <span className="ml-auto text-xs text-primary-400 dark:text-primary-500 whitespace-nowrap">Acknowledged</span>
                      ) : onDismissRedFlag ? (
                        <button
                          onClick={() => onDismissRedFlag(flag)}
                          className="ml-auto text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 whitespace-nowrap underline"
                        >
                          I accept this
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Match Statistics */}
      {(job.skillsMatchPercent !== null || job.perksMatchCount !== null) && (
        <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            Match Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {job.skillsMatchPercent !== null && (
              <div>
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Skills Match</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-primary-200 dark:bg-primary-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${job.skillsMatchPercent >= 65 ? 'bg-success-500' : 'bg-warning-500'}`}
                      style={{ width: `${job.skillsMatchPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    {job.skillsMatchPercent}%
                  </span>
                </div>
              </div>
            )}
            {job.perksMatchCount !== null && (
              <div>
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Perks Matched</p>
                <p className="text-2xl font-semibold text-primary-900 dark:text-primary-100">
                  {job.perksMatchCount}
                </p>
              </div>
            )}
            {job.overallScore !== null && (
              <div>
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Overall Score</p>
                <p className={`text-2xl font-semibold ${getScoreTextColor(job.overallScore)}`}>
                  {job.overallScore}/100
                </p>
              </div>
            )}
          </div>

          {/* Matched Skills */}
          {job.matchedSkills && job.matchedSkills.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-primary-500 dark:text-primary-400 mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {job.matchedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded-lg text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {job.missingSkills && job.missingSkills.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-primary-500 dark:text-primary-400 mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {job.missingSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded-lg text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skills Section */}
      {(job.requiredSkills.length > 0 || job.niceToHaveSkills.length > 0) && (
        <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            Required Skills
          </h2>
          {job.requiredSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-primary-500 dark:text-primary-400 mb-2">Must Have</p>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-lg text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {job.niceToHaveSkills.length > 0 && (
            <div>
              <p className="text-sm text-primary-500 dark:text-primary-400 mb-2">Nice to Have</p>
              <div className="flex flex-wrap gap-2">
                {job.niceToHaveSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-300 rounded-lg text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Perks Section */}
      {job.perks.length > 0 && (
        <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            Benefits & Perks
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.perks.map((perk, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded-lg text-sm"
              >
                {PERK_LABELS[perk] || perk.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Original Job Description */}
      {job.description && (
        <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 transition-colors">
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Original Job Description
            </h2>
            {showFullDescription ? (
              <ChevronUp className="w-5 h-5 text-primary-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-primary-500" />
            )}
          </button>
          {showFullDescription && (
            <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900 p-4 rounded-lg overflow-auto max-h-96">
                {job.description}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
