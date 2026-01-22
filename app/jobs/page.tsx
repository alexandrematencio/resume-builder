'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, TrendingUp, AlertTriangle, Star, FileText, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProfile } from '@/app/contexts/ProfileContext';
import { useJobIntelligence, JobIntelligenceProvider } from '@/app/contexts/JobIntelligenceContext';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import JobOffersList from '@/app/components/jobs/JobOffersList';
import JobImportModal from '@/app/components/jobs/JobImportModal';
import type { JobOffer, JobOfferFilters } from '@/app/types';

function JobsPageContent() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, isComplete: profileComplete } = useProfile();
  const {
    jobOffers,
    jobOffersLoading,
    filters,
    setFilters,
    stats,
    analyzeJobOffer,
    updateJobStatus,
  } = useJobIntelligence();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-primary-900 flex items-center justify-center transition-colors">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleFiltersChange = (newFilters: JobOfferFilters) => {
    setFilters(newFilters);
  };

  const handleAnalyze = async (jobId: string) => {
    await analyzeJobOffer(jobId);
  };

  const handleSave = async (jobId: string) => {
    await updateJobStatus(jobId, 'saved');
  };

  const handleDismiss = async (jobId: string) => {
    await updateJobStatus(jobId, 'archived');
  };

  const handleJobImported = (job: JobOffer) => {
    // Job is automatically added to the list via context
    // Optionally navigate to the job detail page
    router.push(`/jobs/${job.id}`);
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors"
                >
                  Applications
                </button>
                <span className="px-3 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 rounded-lg flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Jobs
                </span>
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Import Job
            </button>
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-4 border-l border-primary-200 dark:border-primary-600 text-sm text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-medium text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.email}</span>
                    {!profileComplete && (
                      <span className="w-2 h-2 bg-warning-500 rounded-full" title="Incomplete profile" />
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-primary-800 rounded-lg shadow-lg border border-primary-200 dark:border-primary-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-primary-100 dark:border-primary-700">
                      <p className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">{user.email}</p>
                      {profile?.fullName && (
                        <p className="text-xs text-primary-500 dark:text-primary-400 truncate">{profile.fullName}</p>
                      )}
                      {!profileComplete && (
                        <p className="text-xs text-warning-600 dark:text-warning-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-warning-500 rounded-full" />
                          Incomplete profile
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/account');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700 flex items-center gap-3"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        <span>Account</span>
                        {!profileComplete && (
                          <span className="ml-auto text-xs bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded-full">
                            Incomplete
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="border-t border-primary-100 dark:border-primary-700 py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          signOut();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-700 rounded-lg">
                <Briefcase className="w-5 h-5 text-primary-600 dark:text-primary-300" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-900 dark:text-primary-50">
                  {stats.total}
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-400">Total Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-900 dark:text-primary-50">
                  {stats.goodMatches}
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-400">Good Matches</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-900 dark:text-primary-50">
                  {stats.blocked}
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-400">Blocked</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <Star className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-900 dark:text-primary-50">
                  {stats.saved}
                </p>
                <p className="text-sm text-primary-500 dark:text-primary-400">Saved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {stats.total === 0 && (
          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-8 mb-8 text-center transition-colors">
            <Briefcase className="w-12 h-12 text-primary-300 dark:text-primary-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Start Tracking Your Job Search
            </h2>
            <p className="text-primary-500 dark:text-primary-400 mb-6 max-w-md mx-auto">
              Import job descriptions from LinkedIn, Indeed, or any job board. Our AI will analyze them against your profile and preferences.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Import Your First Job
              </button>
              <button
                onClick={() => router.push('/account')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 rounded-lg font-medium hover:bg-primary-200 dark:hover:bg-primary-600 transition-colors"
              >
                <User className="w-5 h-5" />
                Configure Preferences
              </button>
            </div>
          </div>
        )}

        {/* Job Offers List */}
        <JobOffersList
          jobs={jobOffers}
          loading={jobOffersLoading}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onAnalyze={handleAnalyze}
          onSave={handleSave}
          onDismiss={handleDismiss}
        />
      </main>

      {/* Import Modal */}
      <JobImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onJobImported={handleJobImported}
      />
    </div>
  );
}

// Wrap with provider
export default function JobsPage() {
  return (
    <JobIntelligenceProvider>
      <JobsPageContent />
    </JobIntelligenceProvider>
  );
}
