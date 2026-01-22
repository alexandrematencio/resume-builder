'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  Wrench,
  Award,
  Globe,
  Link as LinkIcon,
  Target,
  Sliders,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProfile } from '@/app/contexts/ProfileContext';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import PersonalInfoForm from '@/app/components/account/PersonalInfoForm';
import WorkExperienceForm from '@/app/components/account/WorkExperienceForm';
import EducationForm from '@/app/components/account/EducationForm';
import SkillsForm from '@/app/components/account/SkillsForm';
import CertificationsForm from '@/app/components/account/CertificationsForm';
import LanguagesForm from '@/app/components/account/LanguagesForm';
import LinksForm from '@/app/components/account/LinksForm';
import RoleProfilesTab from '@/app/components/account/RoleProfilesTab';
import JobPreferencesForm from '@/app/components/jobs/JobPreferencesForm';
import { JobIntelligenceProvider } from '@/app/contexts/JobIntelligenceContext';

type TabId =
  | 'core'
  | 'education'
  | 'experience'
  | 'skills'
  | 'certifications'
  | 'languages'
  | 'links'
  | 'roles'
  | 'job-prefs';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  section: 'profile' | 'extended' | 'roles' | 'jobs';
}

const tabs: Tab[] = [
  { id: 'core', label: 'Core Info', icon: <User className="w-4 h-4" />, section: 'profile' },
  { id: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" />, section: 'profile' },
  { id: 'experience', label: 'Experience', icon: <Briefcase className="w-4 h-4" />, section: 'profile' },
  { id: 'skills', label: 'Skills', icon: <Wrench className="w-4 h-4" />, section: 'profile' },
  { id: 'certifications', label: 'Certifications', icon: <Award className="w-4 h-4" />, section: 'extended' },
  { id: 'languages', label: 'Languages', icon: <Globe className="w-4 h-4" />, section: 'extended' },
  { id: 'links', label: 'Links', icon: <LinkIcon className="w-4 h-4" />, section: 'extended' },
  { id: 'roles', label: 'Role Profiles', icon: <Target className="w-4 h-4" />, section: 'roles' },
  { id: 'job-prefs', label: 'Job Preferences', icon: <Sliders className="w-4 h-4" />, section: 'jobs' },
];

function AccountPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, profileLoading, isComplete, missingFields } = useProfile();
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-primary-900 flex items-center justify-center transition-colors">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const completenessPercentage = profile?.profileCompleteness || 0;

  const handleSaveStart = () => setSaveStatus('saving');
  const handleSaveSuccess = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };
  const handleSaveError = () => {
    setSaveStatus('error');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'core':
        return (
          <PersonalInfoForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'education':
        return (
          <EducationForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'experience':
        return (
          <WorkExperienceForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'skills':
        return (
          <SkillsForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'certifications':
        return (
          <CertificationsForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'languages':
        return (
          <LanguagesForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'links':
        return (
          <LinksForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      case 'roles':
        return <RoleProfilesTab />;
      case 'job-prefs':
        return (
          <JobPreferencesForm
            onSaveStart={handleSaveStart}
            onSaveSuccess={handleSaveSuccess}
            onSaveError={handleSaveError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-700"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <h1 className="text-2xl font-semibold text-primary-900 dark:text-primary-50">Account</h1>
            </div>

            {/* Save Status and Theme Toggle */}
            <div className="flex items-center gap-4">
              {saveStatus === 'saving' && (
                <span className="text-warning-600 dark:text-warning-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-success-600 dark:text-success-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-error-600 dark:text-error-400 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" aria-hidden="true" />
                  Error
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-4 sticky top-24 shadow-sm transition-colors">
              {/* Profile Completeness */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-500 dark:text-primary-400">Profile complete</span>
                  <span className={`text-sm font-medium ${isComplete ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                    {completenessPercentage}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${isComplete ? 'bg-success-500' : 'bg-warning-500'}`}
                    style={{ width: `${completenessPercentage}%` }}
                  />
                </div>
                {!isComplete && missingFields.length > 0 && (
                  <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                    Missing: {missingFields.slice(0, 2).join(', ')}
                    {missingFields.length > 2 && ` +${missingFields.length - 2}`}
                  </p>
                )}
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wider mb-2 px-3">
                  Profile
                </p>
                {tabs.filter(t => t.section === 'profile').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent-600 text-white'
                        : 'text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700'
                    }`}
                  >
                    <span aria-hidden="true">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}

                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wider mt-4 mb-2 px-3">
                  Extended
                </p>
                {tabs.filter(t => t.section === 'extended').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent-600 text-white'
                        : 'text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700'
                    }`}
                  >
                    <span aria-hidden="true">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}

                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wider mt-4 mb-2 px-3">
                  Roles
                </p>
                {tabs.filter(t => t.section === 'roles').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent-600 text-white'
                        : 'text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700'
                    }`}
                  >
                    <span aria-hidden="true">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}

                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wider mt-4 mb-2 px-3">
                  Job Search
                </p>
                {tabs.filter(t => t.section === 'jobs').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent-600 text-white'
                        : 'text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700'
                    }`}
                  >
                    <span aria-hidden="true">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-primary-800 rounded-xl border border-primary-200 dark:border-primary-700 p-6 shadow-sm transition-colors">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Wrap with provider
export default function AccountPage() {
  return (
    <JobIntelligenceProvider>
      <AccountPageContent />
    </JobIntelligenceProvider>
  );
}
