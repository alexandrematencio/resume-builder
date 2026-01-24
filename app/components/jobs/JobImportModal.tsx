'use client';

import { useState } from 'react';
import { X, FileText, Link as LinkIcon, Loader2, AlertCircle, CheckCircle, Sparkles, Globe } from 'lucide-react';
import { useJobIntelligence } from '@/app/contexts/JobIntelligenceContext';
import type { JobOffer } from '@/app/types';
import AIConsentModal from './AIConsentModal';

interface JobImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobImported: (job: JobOffer) => void;
}

type ImportMode = 'paste' | 'url';

export default function JobImportModal({ isOpen, onClose, onJobImported }: JobImportModalProps) {
  const { parseJobDescription, createJobOffer, analyzeJobOffer, analyzing, preferences, updatePreferences } = useJobIntelligence();
  const [mode, setMode] = useState<ImportMode>('paste');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [parsedData, setParsedData] = useState<Partial<JobOffer> | null>(null);
  const [step, setStep] = useState<'input' | 'parsing' | 'preview' | 'saving' | 'analyzing' | 'fetching'>('input');
  const [error, setError] = useState<string | null>(null);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingJobForAnalysis, setPendingJobForAnalysis] = useState<JobOffer | null>(null);

  // Editable fields for preview
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedLocation, setEditedLocation] = useState('');

  if (!isOpen) return null;

  const fetchUrlContent = async (jobUrl: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/fetch-job-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl }),
      });

      const data = await response.json();
      if (data.success && data.content) {
        return data.content;
      } else {
        setError(data.error || 'Failed to fetch job content from URL');
        return null;
      }
    } catch (err) {
      setError('Failed to fetch URL. Please try pasting the job description manually.');
      return null;
    }
  };

  const handleParse = async () => {
    if (mode === 'paste' && !description.trim()) {
      setError('Please paste a job description');
      return;
    }
    if (mode === 'url' && !url.trim()) {
      setError('Please enter a job URL');
      return;
    }

    setError(null);
    let textToParse = description;

    // If URL mode, fetch content from URL first
    if (mode === 'url') {
      setStep('fetching');
      const content = await fetchUrlContent(url);
      if (!content) {
        setStep('input');
        return;
      }
      setFetchedContent(content);
      textToParse = `Source URL: ${url}\n\n${content}`;
      // Also set description so user can see/edit what was fetched
      setDescription(content);
    }

    setStep('parsing');
    const result = await parseJobDescription(textToParse);
    if (result) {
      setParsedData(result);
      setEditedTitle(result.title || '');
      setEditedCompany(result.company || '');
      setEditedLocation(result.location || '');
      setStep('preview');
    } else {
      setError('Failed to parse job description. Please try again.');
      setStep('input');
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setStep('saving');
    const jobData: Partial<JobOffer> = {
      ...parsedData,
      title: editedTitle || parsedData.title || 'Untitled Position',
      company: editedCompany || parsedData.company || 'Unknown Company',
      location: editedLocation || parsedData.location,
      description: description,
      sourceUrl: mode === 'url' ? url : undefined,
      status: 'new',
    };

    const savedJob = await createJobOffer(jobData);
    if (savedJob) {
      // Check if user has consented to AI analysis
      if (preferences?.aiConsent) {
        // User has already consented - proceed with analysis
        setStep('analyzing');
        try {
          await analyzeJobOffer(savedJob.id);
        } catch (err) {
          // Analysis failed, but job is saved - continue anyway
          console.error('Auto-analysis failed:', err);
        }
        onJobImported(savedJob);
        handleClose();
      } else {
        // User hasn't consented yet - show consent modal
        setPendingJobForAnalysis(savedJob);
        setShowConsentModal(true);
      }
    } else {
      setError('Failed to save job offer. Please try again.');
      setStep('preview');
    }
  };

  const handleConsentAccept = async () => {
    setShowConsentModal(false);

    // Save consent to preferences
    await updatePreferences({ aiConsent: true });

    // Proceed with analysis
    if (pendingJobForAnalysis) {
      setStep('analyzing');
      try {
        await analyzeJobOffer(pendingJobForAnalysis.id);
      } catch (err) {
        console.error('Auto-analysis failed:', err);
      }
      onJobImported(pendingJobForAnalysis);
      handleClose();
    }
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);

    // Job is already saved, just close without analysis
    if (pendingJobForAnalysis) {
      onJobImported(pendingJobForAnalysis);
      handleClose();
    }
  };

  const handleClose = () => {
    setDescription('');
    setUrl('');
    setParsedData(null);
    setStep('input');
    setError(null);
    setEditedTitle('');
    setEditedCompany('');
    setEditedLocation('');
    setFetchedContent(null);
    setShowConsentModal(false);
    setPendingJobForAnalysis(null);
    onClose();
  };

  const handleBack = () => {
    setStep('input');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-700">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
            {step === 'input' && 'Import Job'}
            {step === 'fetching' && 'Fetching Job Page...'}
            {step === 'parsing' && 'Parsing Description...'}
            {step === 'preview' && 'Review Parsed Data'}
            {step === 'saving' && 'Saving Job...'}
            {step === 'analyzing' && 'Analyzing Job...'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'input' && (
            <div className="space-y-4">
              {/* Mode Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'paste'
                      ? 'bg-accent-600 text-white'
                      : 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Paste Description
                </button>
                <button
                  onClick={() => setMode('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'url'
                      ? 'bg-accent-600 text-white'
                      : 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-600'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  From URL
                </button>
              </div>

              {mode === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Job Posting URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/job/..."
                    className="w-full px-3 py-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-600 rounded-lg text-primary-900 dark:text-primary-100 placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-primary-500 dark:text-primary-400">
                    The job posting content will be automatically fetched and parsed.
                  </p>
                </div>
              )}

              {mode === 'paste' && (
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Job Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    rows={12}
                    className="w-full px-3 py-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-600 rounded-lg text-primary-900 dark:text-primary-100 placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none font-mono text-sm"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
                  <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />
                <p className="text-sm text-success-700 dark:text-success-300">
                  Job description parsed successfully. Review and edit the extracted data below.
                </p>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-600 rounded-lg text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={editedCompany}
                    onChange={(e) => setEditedCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-600 rounded-lg text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editedLocation}
                  onChange={(e) => setEditedLocation(e.target.value)}
                  placeholder="e.g., Paris, France"
                  className="w-full px-3 py-2 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-600 rounded-lg text-primary-900 dark:text-primary-100 placeholder-primary-400 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              {/* Parsed Data Summary */}
              <div className="p-4 bg-primary-50 dark:bg-primary-900 rounded-lg space-y-3">
                <h3 className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Extracted Information
                </h3>

                {(parsedData.salaryMin || parsedData.salaryMax) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Salary:</span>
                    <span className="text-primary-900 dark:text-primary-100">
                      {parsedData.salaryMin && parsedData.salaryMax
                        ? `${parsedData.salaryCurrency || '€'}${parsedData.salaryMin.toLocaleString()} - ${parsedData.salaryCurrency || '€'}${parsedData.salaryMax.toLocaleString()}`
                        : parsedData.salaryMin
                          ? `From ${parsedData.salaryCurrency || '€'}${parsedData.salaryMin.toLocaleString()}`
                          : `Up to ${parsedData.salaryCurrency || '€'}${parsedData.salaryMax?.toLocaleString()}`}
                    </span>
                  </div>
                )}

                {parsedData.presenceType && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Work Mode:</span>
                    <span className="text-primary-900 dark:text-primary-100">
                      {parsedData.presenceType === 'full_remote' ? 'Full Remote' :
                       parsedData.presenceType === 'hybrid' ? 'Hybrid' : 'On-site'}
                    </span>
                  </div>
                )}

                {parsedData.contractType && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Contract:</span>
                    <span className="text-primary-900 dark:text-primary-100">{parsedData.contractType}</span>
                  </div>
                )}

                {parsedData.requiredSkills && parsedData.requiredSkills.length > 0 && (
                  <div className="text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Required Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parsedData.requiredSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.niceToHaveSkills && parsedData.niceToHaveSkills.length > 0 && (
                  <div className="text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Nice to Have:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parsedData.niceToHaveSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-300 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.perks && parsedData.perks.length > 0 && (
                  <div className="text-sm">
                    <span className="text-primary-500 dark:text-primary-400">Perks:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parsedData.perks.map((perk, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded text-xs"
                        >
                          {perk.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
                  <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'fetching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe className="w-10 h-10 text-accent-600 animate-pulse mb-4" />
              <p className="text-primary-600 dark:text-primary-400">Fetching job page content...</p>
              <p className="text-sm text-primary-500 dark:text-primary-500 mt-2">Extracting job details from the URL</p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="w-10 h-10 text-accent-600 animate-pulse mb-4" />
              <p className="text-primary-600 dark:text-primary-400">Parsing job description...</p>
              <p className="text-sm text-primary-500 dark:text-primary-500 mt-2">Extracting salary, skills, perks and more</p>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-accent-600 animate-spin mb-4" />
              <p className="text-primary-600 dark:text-primary-400">Saving job offer...</p>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="w-10 h-10 text-accent-600 animate-pulse mb-4" />
              <p className="text-primary-600 dark:text-primary-400">Analyzing job against your profile...</p>
              <p className="text-sm text-primary-500 dark:text-primary-500 mt-2">This may take a few seconds</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-primary-200 dark:border-primary-700">
          {step === 'input' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={analyzing || (mode === 'paste' ? !description.trim() : !url.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'url' ? 'Fetch & Parse' : 'Parse Description'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!editedTitle.trim() || !editedCompany.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Save and Analyze
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Consent Modal */}
      <AIConsentModal
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </div>
  );
}
