'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type {
  JobPreferences,
  JobOffer,
  JobOfferFilters,
  JobAnalysisResult,
  JobOfferStatus,
} from '@/app/types';
import {
  loadJobPreferences,
  saveJobPreferences,
  createDefaultJobPreferences,
  loadJobOffers,
  loadJobOffer,
  saveJobOffer,
  updateJobOffer,
  deleteJobOffer,
  getJobOffersStats,
} from '@/lib/job-intelligence-db';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

interface JobOffersStats {
  total: number;
  analyzed: number;
  blocked: number;
  avgScore: number;
  byStatus: Record<JobOfferStatus, number>;
}

interface JobIntelligenceContextType {
  // Preferences
  preferences: JobPreferences | null;
  preferencesLoading: boolean;
  updatePreferences: (prefs: Partial<JobPreferences>) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;

  // Job Offers
  jobOffers: JobOffer[];
  jobOffersLoading: boolean;
  refreshJobOffers: () => Promise<void>;

  // Single Job Offer operations
  getJobOffer: (id: string) => Promise<JobOffer | null>;
  createJobOffer: (offer: Partial<JobOffer>) => Promise<JobOffer | null>;
  modifyJobOffer: (id: string, updates: Partial<JobOffer>) => Promise<boolean>;
  removeJobOffer: (id: string) => Promise<boolean>;
  updateJobStatus: (jobId: string, status: JobOfferStatus) => Promise<boolean>;

  // Analysis
  analyzeJobOffer: (jobId: string) => Promise<JobAnalysisResult | null>;
  parseJobDescription: (description: string) => Promise<Partial<JobOffer> | null>;
  analyzing: boolean;

  // Filters
  filters: JobOfferFilters;
  setFilters: (filters: JobOfferFilters) => void;

  // Stats
  stats: JobOffersStats & { goodMatches: number; saved: number };
  refreshStats: () => Promise<void>;
}

const JobIntelligenceContext = createContext<JobIntelligenceContextType | undefined>(undefined);

export function JobIntelligenceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();

  // Preferences state
  const [preferences, setPreferences] = useState<JobPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // Job Offers state
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [jobOffersLoading, setJobOffersLoading] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<JobOfferFilters>({
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Stats state
  const [stats, setStats] = useState<JobOffersStats & { goodMatches: number; saved: number }>({
    total: 0,
    analyzed: 0,
    blocked: 0,
    avgScore: 0,
    byStatus: {} as Record<JobOfferStatus, number>,
    goodMatches: 0,
    saved: 0,
  });

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);

  // Load preferences
  const refreshPreferences = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setPreferences(null);
      setPreferencesLoading(false);
      return;
    }

    setPreferencesLoading(true);

    try {
      let loadedPrefs = await loadJobPreferences();

      // Create default preferences if none exist
      if (!loadedPrefs) {
        loadedPrefs = await createDefaultJobPreferences();
      }

      setPreferences(loadedPrefs);
    } catch (error) {
      console.error('Error loading job preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  }, [user, authLoading]);

  // Load job offers and stats together to avoid circular dependencies
  const refreshJobOffers = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setJobOffers([]);
      setJobOffersLoading(false);
      setStats({
        total: 0,
        analyzed: 0,
        blocked: 0,
        avgScore: 0,
        byStatus: {} as Record<JobOfferStatus, number>,
        goodMatches: 0,
        saved: 0,
      });
      return;
    }

    setJobOffersLoading(true);

    try {
      const loadedOffers = await loadJobOffers(filters);
      setJobOffers(loadedOffers);

      // Also load stats
      const loadedStats = await getJobOffersStats();
      const goodMatches = loadedOffers.filter(j => j.overallScore !== null && j.overallScore >= 70).length;
      const saved = loadedOffers.filter(j => j.status === 'saved').length;
      setStats({
        ...loadedStats,
        goodMatches,
        saved,
      });
    } catch (error) {
      console.error('Error loading job offers:', error);
    } finally {
      setJobOffersLoading(false);
    }
  }, [user, authLoading, filters]);

  // Standalone refreshStats for manual refresh (uses current jobOffers from state)
  const refreshStats = useCallback(async () => {
    if (!user) {
      setStats({
        total: 0,
        analyzed: 0,
        blocked: 0,
        avgScore: 0,
        byStatus: {} as Record<JobOfferStatus, number>,
        goodMatches: 0,
        saved: 0,
      });
      return;
    }

    try {
      const loadedStats = await getJobOffersStats();
      setStats(prev => ({
        ...loadedStats,
        goodMatches: prev.goodMatches,
        saved: prev.saved,
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user]);

  // Load data when user changes and auth is ready
  useEffect(() => {
    if (!authLoading && user) {
      refreshPreferences();
      refreshJobOffers();
    } else if (!authLoading && !user) {
      // Clear state when logged out
      setPreferences(null);
      setPreferencesLoading(false);
      setJobOffers([]);
      setJobOffersLoading(false);
    }
  }, [user, authLoading, refreshPreferences, refreshJobOffers]);

  // Reload job offers when filters change
  useEffect(() => {
    if (user && !authLoading) {
      refreshJobOffers();
    }
  }, [filters, user, authLoading, refreshJobOffers]);

  // Update preferences
  const updatePreferences = async (prefs: Partial<JobPreferences>): Promise<boolean> => {
    const updatedPrefs = preferences ? { ...preferences, ...prefs } : prefs;
    const success = await saveJobPreferences(updatedPrefs);

    if (success) {
      await refreshPreferences();
    }

    return success;
  };

  // Get single job offer
  const getJobOffer = async (id: string): Promise<JobOffer | null> => {
    return await loadJobOffer(id);
  };

  // Create job offer
  const createJobOffer = async (offer: Partial<JobOffer>): Promise<JobOffer | null> => {
    const newOffer = await saveJobOffer(offer);

    if (newOffer) {
      await refreshJobOffers();
      await refreshStats();
    }

    return newOffer;
  };

  // Modify job offer
  const modifyJobOffer = async (id: string, updates: Partial<JobOffer>): Promise<boolean> => {
    const success = await updateJobOffer(id, updates);

    if (success) {
      await refreshJobOffers();
      await refreshStats();
    }

    return success;
  };

  // Remove job offer
  const removeJobOffer = async (id: string): Promise<boolean> => {
    const success = await deleteJobOffer(id);

    if (success) {
      await refreshJobOffers();
      await refreshStats();
    }

    return success;
  };

  // Update job status with optimistic update to avoid scroll reset
  const updateJobStatus = async (jobId: string, status: JobOfferStatus): Promise<boolean> => {
    // Optimistic update: update local state immediately
    setJobOffers((prevOffers) =>
      prevOffers.map((job) =>
        job.id === jobId ? { ...job, status } : job
      )
    );

    // Update stats optimistically based on status change
    setStats((prevStats) => {
      const job = jobOffers.find((j) => j.id === jobId);
      if (!job) return prevStats;

      const newStats = { ...prevStats };

      // Decrement old status count
      if (job.status && newStats.byStatus[job.status]) {
        newStats.byStatus = {
          ...newStats.byStatus,
          [job.status]: newStats.byStatus[job.status] - 1,
        };
      }

      // Increment new status count
      newStats.byStatus = {
        ...newStats.byStatus,
        [status]: (newStats.byStatus[status] || 0) + 1,
      };

      // Update saved count
      if (status === 'saved') {
        newStats.saved = (prevStats.saved || 0) + 1;
      } else if (job.status === 'saved') {
        newStats.saved = Math.max(0, (prevStats.saved || 0) - 1);
      }

      return newStats;
    });

    // Persist to database in background
    const success = await updateJobOffer(jobId, { status });

    if (!success) {
      // Rollback on failure: refresh from server
      await refreshJobOffers();
      await refreshStats();
    }

    return success;
  };

  // Analyze job offer
  const analyzeJobOffer = async (jobId: string): Promise<JobAnalysisResult | null> => {
    setAnalyzing(true);

    if (!preferences || !profile) {
      console.error('Cannot analyze: missing preferences or profile');
      setAnalyzing(false);
      return null;
    }

    const job = await loadJobOffer(jobId);
    if (!job) {
      console.error('Job offer not found');
      setAnalyzing(false);
      return null;
    }

    try {
      const response = await fetch('/api/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobOffer: job,
          preferences,
          userProfile: profile,
        }),
      });

      const result = await response.json();

      if (!result.success || !result.result) {
        console.error('Analysis failed:', result.error);
        setAnalyzing(false);
        return null;
      }

      // Update the job offer with analysis results
      await updateJobOffer(jobId, {
        isBlocked: result.result.isBlocked,
        blockReasons: result.result.blockReasons,
        skillsMatchPercent: result.result.skillsMatchPercent,
        perksMatchCount: result.result.perksMatchCount,
        overallScore: result.result.overallScore,
        aiInsights: result.result.aiInsights,
        status: 'analyzed',
        analyzedAt: new Date().toISOString(),
      });

      await refreshJobOffers();
      await refreshStats();

      setAnalyzing(false);
      return result.result;
    } catch (error) {
      console.error('Error analyzing job offer:', error);
      setAnalyzing(false);
      return null;
    }
  };

  // Parse job description
  const parseJobDescription = async (description: string): Promise<Partial<JobOffer> | null> => {
    try {
      const response = await fetch('/api/parse-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        console.error('Parsing failed:', result.error);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error parsing job description:', error);
      return null;
    }
  };

  return (
    <JobIntelligenceContext.Provider
      value={{
        preferences,
        preferencesLoading,
        updatePreferences,
        refreshPreferences,
        jobOffers,
        jobOffersLoading,
        refreshJobOffers,
        getJobOffer,
        createJobOffer,
        modifyJobOffer,
        removeJobOffer,
        updateJobStatus,
        analyzeJobOffer,
        parseJobDescription,
        analyzing,
        filters,
        setFilters,
        stats,
        refreshStats,
      }}
    >
      {children}
    </JobIntelligenceContext.Provider>
  );
}

export function useJobIntelligence() {
  const context = useContext(JobIntelligenceContext);
  if (context === undefined) {
    throw new Error('useJobIntelligence must be used within a JobIntelligenceProvider');
  }
  return context;
}
