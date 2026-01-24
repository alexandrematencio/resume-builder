'use client';

import { useState } from 'react';
import { Search, Filter, SortAsc, SortDesc, Inbox } from 'lucide-react';
import JobOfferCard from './JobOfferCard';
import type { JobOffer, JobOfferFilters, JobOfferStatus } from '@/app/types';

interface JobOffersListProps {
  jobs: JobOffer[];
  loading: boolean;
  filters: JobOfferFilters;
  onFiltersChange: (filters: JobOfferFilters) => void;
  onAnalyze: (jobId: string) => Promise<void>;
  onSave: (jobId: string) => Promise<void>;
  onDismiss: (jobId: string) => Promise<void>;
  onApply?: (job: JobOffer) => void;
}

const statusOptions: { value: JobOfferStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export default function JobOffersList({
  jobs,
  loading,
  filters,
  onFiltersChange,
  onAnalyze,
  onSave,
  onDismiss,
  onApply,
}: JobOffersListProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchInput || undefined });
  };

  const handleStatusToggle = (status: JobOfferStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handleSortChange = (sortBy: 'score' | 'date' | 'company') => {
    const newOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFiltersChange({ ...filters, sortBy, sortOrder: newOrder });
  };

  const toggleBlockedFilter = () => {
    onFiltersChange({
      ...filters,
      isBlocked: filters.isBlocked === false ? undefined : false,
    });
  };

  const handleAnalyze = async (jobId: string) => {
    setAnalyzingId(jobId);
    try {
      await onAnalyze(jobId);
    } finally {
      setAnalyzingId(null);
    }
  };

  const SortIcon = filters.sortOrder === 'asc' ? SortAsc : SortDesc;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg text-primary-900 dark:text-primary-100 placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-300 dark:border-accent-700 text-accent-700 dark:text-accent-300'
              : 'bg-white dark:bg-primary-800 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filters.status?.length || filters.isBlocked === false) && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-600 text-white text-xs">
              {(filters.status?.length || 0) + (filters.isBlocked === false ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Sort Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSortChange('date')}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              filters.sortBy === 'date'
                ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                : 'text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-700'
            }`}
          >
            Date
            {filters.sortBy === 'date' && <SortIcon className="w-3 h-3" />}
          </button>
          <button
            onClick={() => handleSortChange('score')}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              filters.sortBy === 'score'
                ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                : 'text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-700'
            }`}
          >
            Score
            {filters.sortBy === 'score' && <SortIcon className="w-3 h-3" />}
          </button>
          <button
            onClick={() => handleSortChange('company')}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              filters.sortBy === 'company'
                ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                : 'text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-700'
            }`}
          >
            Company
            {filters.sortBy === 'company' && <SortIcon className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="p-4 bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700">
          <div className="space-y-4">
            {/* Status Filters */}
            <div>
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusToggle(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filters.status?.includes(status.value)
                        ? 'bg-accent-600 text-white'
                        : 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-600'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleBlockedFilter}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filters.isBlocked === false
                    ? 'bg-accent-600 text-white'
                    : 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-600'
                }`}
              >
                Hide Blocked
              </button>

              {/* Clear Filters */}
              {(filters.status?.length || filters.isBlocked === false || filters.search) && (
                <button
                  onClick={() => onFiltersChange({ sortBy: 'date', sortOrder: 'desc' })}
                  className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-primary-500 dark:text-primary-400">
        {loading ? 'Loading...' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} found`}
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner w-8 h-8"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="w-12 h-12 text-primary-300 dark:text-primary-600 mb-4" />
          <h3 className="text-lg font-medium text-primary-700 dark:text-primary-300 mb-1">
            No jobs found
          </h3>
          <p className="text-sm text-primary-500 dark:text-primary-400">
            {filters.search || filters.status?.length
              ? 'Try adjusting your filters'
              : 'Import a job to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobOfferCard
              key={job.id}
              job={job}
              onAnalyze={handleAnalyze}
              onSave={onSave}
              onDismiss={onDismiss}
              onApply={onApply}
              analyzing={analyzingId === job.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
