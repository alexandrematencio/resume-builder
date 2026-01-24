'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProfile } from '@/app/contexts/ProfileContext';
import { useJobIntelligence, JobIntelligenceProvider } from '@/app/contexts/JobIntelligenceContext';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import JobIntelligenceView from '@/app/components/jobs/JobIntelligenceView';
import NewApplicationModal from '@/app/components/NewApplicationModal';
import { Briefcase, User, LogOut, ChevronDown } from 'lucide-react';
import type { JobOffer, Application, CVVersion, ApplicationStatus, ParsedJobContext } from '@/app/types';
import { recalculateWithDismissals } from '@/lib/job-filter-service';
import { loadApplications, saveAllApplications } from '@/lib/supabase-db';

function JobDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, isComplete: profileComplete } = useProfile();
  const { jobOffers, jobOffersLoading, analyzeJobOffer, updateJobStatus, modifyJobOffer, preferences, analyzing } = useJobIntelligence();
  const [job, setJob] = useState<JobOffer | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [creatingApplication, setCreatingApplication] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const jobId = params.id as string;

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

  // Find the job in the list
  useEffect(() => {
    if (!jobOffersLoading && jobOffers.length > 0) {
      const foundJob = jobOffers.find(j => j.id === jobId);
      if (foundJob) {
        setJob(foundJob);
      }
    }
  }, [jobId, jobOffers, jobOffersLoading]);

  // Update local job when jobOffers changes (after analysis, etc.)
  useEffect(() => {
    if (job && jobOffers.length > 0) {
      const updatedJob = jobOffers.find(j => j.id === job.id);
      if (updatedJob && JSON.stringify(updatedJob) !== JSON.stringify(job)) {
        setJob(updatedJob);
      }
    }
  }, [jobOffers, job]);

  if (authLoading || jobOffersLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-primary-900 flex items-center justify-center transition-colors">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors">
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
                  <button
                    onClick={() => router.push('/jobs')}
                    className="px-3 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 rounded-lg flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Jobs
                  </button>
                </nav>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Job not found
            </h2>
            <p className="text-primary-500 dark:text-primary-400 mb-4">
              This job offer doesn&apos;t exist or has been deleted.
            </p>
            <button
              onClick={() => router.push('/jobs')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              Back to Jobs
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/jobs');
  };

  const handleAnalyze = async () => {
    await analyzeJobOffer(jobId);
  };

  const handleSave = async () => {
    const success = await updateJobStatus(jobId, 'saved');
    if (!success) {
      console.error('Failed to save job - check console for details');
      alert('Failed to save job. Please try again.');
    }
  };

  const handleApply = async () => {
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
    if (!user) return;
    setCreatingApplication(true);

    try {
      // Generate CV via API
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

      // Create application object
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

      // Load existing applications, prepend new one, save
      const existingApps = await loadApplications();
      await saveAllApplications([newApp, ...existingApps]);

      // Update job status to applied
      await updateJobStatus(jobId, 'applied');

      setShowApplicationModal(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to create application. Please try again.');
    } finally {
      setCreatingApplication(false);
    }
  };

  const handleArchive = async () => {
    const success = await updateJobStatus(jobId, 'archived');
    if (!success) {
      console.error('Failed to archive job - check console for details');
      alert('Failed to archive job. Please try again.');
    }
  };

  const handleDismissRedFlag = async (flag: string) => {
    if (!job) return;
    const newDismissed = [...(job.dismissedRedFlags || []), flag];
    const salaryBelowMin = !!(
      preferences?.minSalary &&
      job.salaryMax !== null &&
      job.salaryMax !== undefined &&
      job.salaryMax < preferences.minSalary
    );
    const newScore = recalculateWithDismissals(
      job.overallScore || 0,
      job.aiInsights?.redFlags || [],
      newDismissed,
      salaryBelowMin
    );
    await modifyJobOffer(job.id, {
      dismissedRedFlags: newDismissed,
      overallScore: newScore,
    });
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
                <button
                  onClick={() => router.push('/jobs')}
                  className="px-3 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 rounded-lg flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Jobs
                </button>
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JobIntelligenceView
          job={job}
          onBack={handleBack}
          onAnalyze={handleAnalyze}
          onSave={handleSave}
          onApply={handleApply}
          onArchive={handleArchive}
          onDismissRedFlag={handleDismissRedFlag}
          analyzing={analyzing}
        />
      </main>

      {/* Application Modal */}
      {job && (
        <NewApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          onCreate={handleCreateApplication}
          templates={[]}
          prefilledJob={{
            company: job.company,
            role: job.title,
            jobDescription: job.description || '',
            jobUrl: job.sourceUrl || undefined,
          }}
        />
      )}

      {/* Generating CV Overlay */}
      {creatingApplication && (
        <div className="modal-backdrop z-50 flex items-center justify-center">
          <div className="modal-content p-12 text-center max-w-md">
            <div className="spinner w-16 h-16 mx-auto mb-6"></div>
            <h3 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Generating Your CV
            </h3>
            <p className="text-primary-600 dark:text-primary-400">
              AI is analyzing the job and creating a tailored resume
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with provider
export default function JobDetailPage() {
  return (
    <JobIntelligenceProvider>
      <JobDetailContent />
    </JobIntelligenceProvider>
  );
}
