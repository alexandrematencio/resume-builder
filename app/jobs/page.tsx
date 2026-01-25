'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, TrendingUp, AlertTriangle, Star, Target, FileText, User, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProfile } from '@/app/contexts/ProfileContext';
import { useJobIntelligence, JobIntelligenceProvider } from '@/app/contexts/JobIntelligenceContext';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import JobOffersList from '@/app/components/jobs/JobOffersList';
import JobImportModal from '@/app/components/jobs/JobImportModal';
import NewApplicationModal from '@/app/components/NewApplicationModal';
import { loadApplications, saveAllApplications } from '@/lib/supabase-db';
import type { JobOffer, JobOfferFilters, Application, CVVersion, ApplicationStatus, ParsedJobContext } from '@/app/types';

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
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobOffer | null>(null);
  const [creatingApplication, setCreatingApplication] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Close user menu and mobile nav when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setShowMobileNav(false);
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

  const handleArchive = async (jobId: string) => {
    await updateJobStatus(jobId, 'archived');
  };

  const handleJobImported = (job: JobOffer) => {
    // Job is automatically added to the list via context
    // Optionally navigate to the job detail page
    router.push(`/jobs/${job.id}`);
  };

  const handleApply = (job: JobOffer) => {
    setSelectedJobForApply(job);
    setShowApplicationModal(true);
  };

  const handleCreateApplication = async (data: {
    company: string;
    role: string;
    jobDescription: string;
    jobUrl?: string;
    parsedJobContext?: ParsedJobContext;
    cvData?: {
      name: string;
      email: string;
      phone: string;
      address: string;
      age?: string;
      languages?: string;
      portfolio?: string;
      summary: string;
      experience: string;
      skills: string;
      education: string;
      projects?: string;
    };
    useExistingTemplate: boolean;
    selectedTemplateId?: string;
  }) => {
    if (!user || !selectedJobForApply) return;
    setCreatingApplication(true);

    try {
      const nameParts = (data.cvData?.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const prompt = `You are an expert resume writer. Create a professional, ATS-optimized resume tailored for this job.

CANDIDATE INFORMATION:
Name: ${data.cvData?.name || ''}
Email: ${data.cvData?.email || ''}
Phone: ${data.cvData?.phone || ''}
Location: ${data.cvData?.address || ''}
${data.cvData?.age ? `Age: ${data.cvData.age}` : ''}
${data.cvData?.languages ? `Languages: ${data.cvData.languages}` : ''}
${data.cvData?.portfolio ? `Portfolio: ${data.cvData.portfolio}` : ''}

PROFESSIONAL SUMMARY:
${data.cvData?.summary || 'Create a compelling professional summary'}

WORK EXPERIENCE:
${data.cvData?.experience || ''}

SKILLS:
${data.cvData?.skills || ''}

EDUCATION:
${data.cvData?.education || ''}

${data.cvData?.projects ? `KEY PROJECTS:\n${data.cvData.projects}` : ''}

TARGET JOB DESCRIPTION:
${data.jobDescription}
${data.parsedJobContext ? `
AI-PARSED JOB REQUIREMENTS:
- Required Skills: ${data.parsedJobContext.requiredSkills.join(', ')}
- Nice-to-Have: ${data.parsedJobContext.niceToHaveSkills.join(', ')}
- Matched Skills: ${data.parsedJobContext.matchedSkills.join(', ')}
- Missing Skills: ${data.parsedJobContext.missingSkills.join(', ')}

TAILORING INSTRUCTIONS:
- Prioritize experiences demonstrating REQUIRED skills
- List matched required skills FIRST in skills section
- Mirror job posting language in summary
- Do NOT fabricate skills
` : ''}
CRITICAL: Respond with ONLY valid JSON:
{
  "personalInfo": { "name": "${data.cvData?.name || ''}", "firstName": "${firstName}", "lastName": "${lastName}", "age": ${data.cvData?.age || 'null'}, "languages": ${data.cvData?.languages ? `"${data.cvData.languages}"` : 'null'}, "address": "${data.cvData?.address || ''}", "email": "${data.cvData?.email || ''}", "phone": "${data.cvData?.phone || ''}", "portfolio": ${data.cvData?.portfolio ? `"${data.cvData.portfolio}"` : 'null'}, "photo": null },
  "profile": { "text": "Professional summary", "availability": "Available" },
  "skills": { "technical": [], "marketing": [], "soft": [] },
  "experiences": [{ "id": "1", "company": "", "jobTitle": "", "period": "", "industry": "", "achievements": [] }],
  "projects": [],
  "education": [{ "id": "1", "institution": "", "years": "", "degree": "", "specialization": "" }]
}

REQUIREMENTS:
- 4-6 experiences (reverse chronological), 2 achievements each
- Categorize skills into technical/marketing/soft
- Return ONLY JSON, no markdown`;

      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const responseData = await response.json();
      let cvContent = responseData.resume?.trim() || '';
      if (cvContent.startsWith('```json')) {
        cvContent = cvContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cvContent.startsWith('```')) {
        cvContent = cvContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      JSON.parse(cvContent); // Validate JSON

      const firstCV: CVVersion = {
        id: `cv-${Date.now()}`,
        version: 1,
        content: cvContent,
        generatedBy: 'ai',
        createdAt: Date.now(),
      };

      const newApp: Application = {
        id: `app-${Date.now()}`,
        company: data.company,
        role: data.role,
        jobDescription: data.jobDescription,
        jobUrl: data.jobUrl,
        cvVersions: [firstCV],
        coverLetters: [],
        status: 'draft' as ApplicationStatus,
        statusHistory: [{ status: 'draft' as ApplicationStatus, timestamp: Date.now(), note: 'Created from job matching' }],
        tracking: { followUpDates: [] },
        createdAt: Date.now(),
        notes: '',
        tags: [],
        isFavorite: false,
      };

      const existingApps = await loadApplications();
      await saveAllApplications([newApp, ...existingApps]);

      // Update job status to applied
      await updateJobStatus(selectedJobForApply.id, 'applied');

      setShowApplicationModal(false);
      setSelectedJobForApply(null);
      router.push('/');
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to create application. Please try again.');
    } finally {
      setCreatingApplication(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <img src="/logo.svg" alt="Logo" className="h-8 sm:h-10 w-auto" />
              {/* Desktop nav */}
              <nav className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Apply
                </button>
                <span className="px-3 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 rounded-lg flex items-center gap-2 whitespace-nowrap">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  Matching
                </span>
              </nav>
              {/* Mobile nav dropdown */}
              <div className="relative sm:hidden" ref={mobileNavRef}>
                <button
                  onClick={() => setShowMobileNav(!showMobileNav)}
                  className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {showMobileNav && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-primary-800 rounded-lg shadow-lg border border-primary-200 dark:border-primary-700 py-1 z-50">
                    <button
                      onClick={() => {
                        setShowMobileNav(false);
                        router.push('/');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-700"
                    >
                      Apply
                    </button>
                    <span className="block px-4 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Matching
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-2.5 sm:px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Import Job</span>
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
                      <ThemeToggle showLabel className="w-full px-4 py-2 justify-start text-sm" />
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
        {/* Section Title */}
        <h1 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-6">Matching</h1>

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
                <p className="text-sm text-primary-500 dark:text-primary-400">Imported</p>
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
                <p className="text-sm text-primary-500 dark:text-primary-400">Warning</p>
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
            <Target className="w-12 h-12 text-primary-300 dark:text-primary-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Evaluate jobs before you apply.
            </h2>
            <p className="text-primary-500 dark:text-primary-400 mb-6 max-w-md mx-auto">
              Import a job description to see how it aligns with your profile, skills, and preferences.
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
          onArchive={handleArchive}
          onApply={handleApply}
        />
      </main>

      {/* Import Modal */}
      <JobImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onJobImported={handleJobImported}
      />

      {/* Application Modal */}
      {selectedJobForApply && (
        <NewApplicationModal
          isOpen={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedJobForApply(null);
          }}
          onCreate={handleCreateApplication}
          templates={[]}
          prefilledJob={{
            company: selectedJobForApply.company,
            role: selectedJobForApply.title,
            jobDescription: selectedJobForApply.description || '',
            jobUrl: selectedJobForApply.sourceUrl || undefined,
          }}
        />
      )}

      {/* Generating CV Overlay */}
      {creatingApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-primary-800 rounded-xl p-8 flex flex-col items-center gap-4 shadow-xl">
            <div className="spinner w-10 h-10"></div>
            <p className="text-primary-700 dark:text-primary-300 font-medium">Generating your CV...</p>
            <p className="text-sm text-primary-500 dark:text-primary-400">This may take a moment</p>
          </div>
        </div>
      )}
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
