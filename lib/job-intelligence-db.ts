import { createClient } from './supabase-browser';
import type {
  JobPreferences,
  JobOffer,
  JobAnalysisFeedback,
  JobOfferFilters,
  AIInsights,
  RemotePreference,
  PresenceType,
  SalaryRateType,
  JobOfferStatus,
} from '@/app/types';

// Get current user ID helper
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[job-intelligence-db] Auth error:', {
      code: error.code,
      message: error.message,
      status: error.status,
    });
    return null;
  }

  if (!user) {
    console.warn('[job-intelligence-db] No authenticated user found');
    return null;
  }

  return user.id;
}

// ============================================
// JOB PREFERENCES CRUD
// ============================================

export async function loadJobPreferences(): Promise<JobPreferences | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('job_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences exist yet
      return null;
    }
    console.error('Error loading job preferences:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    allowedCountries: data.allowed_countries || [],
    allowedCities: data.allowed_cities || [],
    minSalary: data.min_salary,
    salaryCurrency: data.salary_currency || 'EUR',
    minHourlyRate: data.min_hourly_rate,
    minDailyRate: data.min_daily_rate,
    minHoursPerWeek: data.min_hours_per_week ?? 35,
    maxHoursPerWeek: data.max_hours_per_week ?? 45,
    remotePreference: (data.remote_preference as RemotePreference) || 'any',
    preferredPerks: data.preferred_perks || [],
    weightSalary: data.weight_salary ?? 30,
    weightSkills: data.weight_skills ?? 50,
    weightPerks: data.weight_perks ?? 20,
    minSkillsMatchPercent: data.min_skills_match_percent ?? 65,
    aiConsent: data.ai_consent ?? false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveJobPreferences(prefs: Partial<JobPreferences>): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('job_preferences')
    .upsert({
      id: prefs.id || crypto.randomUUID(),
      user_id: userId,
      allowed_countries: prefs.allowedCountries || [],
      allowed_cities: prefs.allowedCities || [],
      min_salary: prefs.minSalary ?? null,
      salary_currency: prefs.salaryCurrency || 'EUR',
      min_hourly_rate: prefs.minHourlyRate ?? null,
      min_daily_rate: prefs.minDailyRate ?? null,
      min_hours_per_week: prefs.minHoursPerWeek ?? 35,
      max_hours_per_week: prefs.maxHoursPerWeek ?? 45,
      remote_preference: prefs.remotePreference || 'any',
      preferred_perks: prefs.preferredPerks || [],
      weight_salary: prefs.weightSalary ?? 30,
      weight_skills: prefs.weightSkills ?? 50,
      weight_perks: prefs.weightPerks ?? 20,
      min_skills_match_percent: prefs.minSkillsMatchPercent ?? 65,
      ai_consent: prefs.aiConsent ?? false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error saving job preferences:', error);
    return false;
  }

  return true;
}

export async function createDefaultJobPreferences(): Promise<JobPreferences | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  const defaultPrefs: Partial<JobPreferences> = {
    id: crypto.randomUUID(),
    userId,
    allowedCountries: [],
    allowedCities: [],
    minSalary: null,
    salaryCurrency: 'EUR',
    minHourlyRate: null,
    minDailyRate: null,
    minHoursPerWeek: 35,
    maxHoursPerWeek: 45,
    remotePreference: 'any',
    preferredPerks: [],
    weightSalary: 30,
    weightSkills: 50,
    weightPerks: 20,
    minSkillsMatchPercent: 65,
    aiConsent: false,
  };

  const success = await saveJobPreferences(defaultPrefs);
  if (success) {
    return loadJobPreferences();
  }
  return null;
}

// ============================================
// JOB OFFERS CRUD
// ============================================

export async function loadJobOffers(filters?: JobOfferFilters): Promise<JobOffer[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return [];
  }

  let query = supabase
    .from('job_offers')
    .select('*')
    .eq('user_id', userId);

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.minScore !== undefined) {
    query = query.gte('overall_score', filters.minScore);
  }

  if (filters?.isBlocked !== undefined) {
    query = query.eq('is_blocked', filters.isBlocked);
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`title.ilike.${searchTerm},company.ilike.${searchTerm}`);
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'date';
  const sortOrder = filters?.sortOrder === 'asc' ? true : false;

  if (sortBy === 'score') {
    query = query.order('overall_score', { ascending: sortOrder, nullsFirst: false });
  } else if (sortBy === 'company') {
    query = query.order('company', { ascending: sortOrder });
  } else {
    query = query.order('created_at', { ascending: sortOrder });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error loading job offers:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return data.map((job) => mapDbToJobOffer(job));
}

export async function loadJobOffer(id: string): Promise<JobOffer | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('job_offers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error loading job offer:', error);
    return null;
  }

  return mapDbToJobOffer(data);
}

export async function getJobOfferByApplicationId(applicationId: string): Promise<JobOffer | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from('job_offers')
    .select('*')
    .eq('user_id', userId)
    .eq('source_application_id', applicationId)
    .maybeSingle();

  return data ? mapDbToJobOffer(data) : null;
}

export async function saveJobOffer(offer: Partial<JobOffer>): Promise<JobOffer | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  const id = offer.id || crypto.randomUUID();

  // Helper to safely convert to integer (some AI-parsed values may be floats)
  const toIntOrNull = (val: number | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    return Math.round(val);
  };

  const payload = {
    id,
    user_id: userId,
    title: offer.title || '',
    company: offer.company || '',
    location: offer.location || null,
    country: offer.country || null,
    city: offer.city || null,
    salary_min: toIntOrNull(offer.salaryMin),
    salary_max: toIntOrNull(offer.salaryMax),
    salary_currency: offer.salaryCurrency || null,
    salary_rate_type: offer.salaryRateType || null,
    hours_per_week: toIntOrNull(offer.hoursPerWeek),
    presence_type: offer.presenceType || null,
    contract_type: offer.contractType || null,
    description: offer.description || null,
    required_skills: offer.requiredSkills || [],
    nice_to_have_skills: offer.niceToHaveSkills || [],
    perks: offer.perks || [],
    source_url: offer.sourceUrl || null,
    source_platform: offer.sourcePlatform || null,
    source_application_id: offer.sourceApplicationId || null,
    is_blocked: offer.isBlocked ?? false,
    block_reasons: offer.blockReasons || [],
    skills_match_percent: toIntOrNull(offer.skillsMatchPercent),
    perks_match_count: toIntOrNull(offer.perksMatchCount),
    overall_score: toIntOrNull(offer.overallScore),
    ai_insights: offer.aiInsights || null,
    matched_skills: offer.matchedSkills || [],
    missing_skills: offer.missingSkills || [],
    dismissed_red_flags: offer.dismissedRedFlags || [],
    status: offer.status || 'new',
    analyzed_at: offer.analyzedAt || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('job_offers')
      .upsert(payload);

    if (error) {
      console.error('Supabase error saving job offer:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error),
      });
      return null;
    }

    return loadJobOffer(id);
  } catch (err) {
    console.error('Exception saving job offer:', err);
    console.error('Exception type:', typeof err);
    console.error('Exception stringified:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
    return null;
  }
}

export async function updateJobOffer(id: string, updates: Partial<JobOffer>): Promise<boolean> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Map camelCase to snake_case for each field
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.company !== undefined) updateData.company = updates.company;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.country !== undefined) updateData.country = updates.country;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.salaryMin !== undefined) updateData.salary_min = updates.salaryMin;
  if (updates.salaryMax !== undefined) updateData.salary_max = updates.salaryMax;
  if (updates.salaryCurrency !== undefined) updateData.salary_currency = updates.salaryCurrency;
  if (updates.salaryRateType !== undefined) updateData.salary_rate_type = updates.salaryRateType;
  if (updates.hoursPerWeek !== undefined) updateData.hours_per_week = updates.hoursPerWeek;
  if (updates.presenceType !== undefined) updateData.presence_type = updates.presenceType;
  if (updates.contractType !== undefined) updateData.contract_type = updates.contractType;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.requiredSkills !== undefined) updateData.required_skills = updates.requiredSkills;
  if (updates.niceToHaveSkills !== undefined) updateData.nice_to_have_skills = updates.niceToHaveSkills;
  if (updates.perks !== undefined) updateData.perks = updates.perks;
  if (updates.sourceUrl !== undefined) updateData.source_url = updates.sourceUrl;
  if (updates.sourcePlatform !== undefined) updateData.source_platform = updates.sourcePlatform;
  if (updates.isBlocked !== undefined) updateData.is_blocked = updates.isBlocked;
  if (updates.blockReasons !== undefined) updateData.block_reasons = updates.blockReasons;
  if (updates.skillsMatchPercent !== undefined) updateData.skills_match_percent = updates.skillsMatchPercent;
  if (updates.perksMatchCount !== undefined) updateData.perks_match_count = updates.perksMatchCount;
  if (updates.overallScore !== undefined) updateData.overall_score = updates.overallScore;
  if (updates.aiInsights !== undefined) updateData.ai_insights = updates.aiInsights;
  if (updates.matchedSkills !== undefined) updateData.matched_skills = updates.matchedSkills;
  if (updates.missingSkills !== undefined) updateData.missing_skills = updates.missingSkills;
  if (updates.dismissedRedFlags !== undefined) updateData.dismissed_red_flags = updates.dismissedRedFlags;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.analyzedAt !== undefined) updateData.analyzed_at = updates.analyzedAt;

  const { data, error } = await supabase
    .from('job_offers')
    .update(updateData)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating job offer:', error);
    return false;
  }

  // Check if any rows were actually updated
  if (!data || data.length === 0) {
    console.error('No rows updated - job may not exist or RLS policy blocked the update');
    return false;
  }

  return true;
}

export async function deleteJobOffer(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('job_offers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting job offer:', error);
    return false;
  }

  return true;
}

// ============================================
// JOB ANALYSIS FEEDBACK CRUD
// ============================================

export async function saveFeedback(feedback: Partial<JobAnalysisFeedback>): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('job_analysis_feedback')
    .insert({
      id: feedback.id || crypto.randomUUID(),
      user_id: userId,
      job_offer_id: feedback.jobOfferId,
      feedback_type: feedback.feedbackType,
      feedback_notes: feedback.feedbackNotes || null,
      user_action: feedback.userAction,
    });

  if (error) {
    console.error('Error saving feedback:', error);
    return false;
  }

  return true;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToJobOffer(data: any): JobOffer {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    company: data.company,
    location: data.location,
    country: data.country,
    city: data.city,
    salaryMin: data.salary_min,
    salaryMax: data.salary_max,
    salaryCurrency: data.salary_currency,
    salaryRateType: data.salary_rate_type as SalaryRateType | null,
    hoursPerWeek: data.hours_per_week,
    presenceType: data.presence_type as PresenceType | null,
    contractType: data.contract_type,
    description: data.description,
    requiredSkills: data.required_skills || [],
    niceToHaveSkills: data.nice_to_have_skills || [],
    perks: data.perks || [],
    sourceUrl: data.source_url,
    sourcePlatform: data.source_platform,
    sourceApplicationId: data.source_application_id || undefined,
    isBlocked: data.is_blocked ?? false,
    blockReasons: data.block_reasons || [],
    skillsMatchPercent: data.skills_match_percent,
    perksMatchCount: data.perks_match_count,
    overallScore: data.overall_score,
    aiInsights: data.ai_insights as AIInsights | null,
    matchedSkills: data.matched_skills || [],
    missingSkills: data.missing_skills || [],
    dismissedRedFlags: data.dismissed_red_flags || [],
    status: data.status as JobOfferStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    analyzedAt: data.analyzed_at,
  };
}

// Get job offers statistics
export async function getJobOffersStats(): Promise<{
  total: number;
  analyzed: number;
  blocked: number;
  avgScore: number;
  byStatus: Record<JobOfferStatus, number>;
}> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { total: 0, analyzed: 0, blocked: 0, avgScore: 0, byStatus: {} as Record<JobOfferStatus, number> };
  }

  const { data, error } = await supabase
    .from('job_offers')
    .select('status, is_blocked, overall_score')
    .eq('user_id', userId);

  if (error || !data) {
    return { total: 0, analyzed: 0, blocked: 0, avgScore: 0, byStatus: {} as Record<JobOfferStatus, number> };
  }

  const total = data.length;
  const analyzed = data.filter(j => j.overall_score !== null).length;
  const blocked = data.filter(j => j.is_blocked).length;
  const scores = data.filter(j => j.overall_score !== null).map(j => j.overall_score as number);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const byStatus = data.reduce((acc, job) => {
    acc[job.status as JobOfferStatus] = (acc[job.status as JobOfferStatus] || 0) + 1;
    return acc;
  }, {} as Record<JobOfferStatus, number>);

  return { total, analyzed, blocked, avgScore, byStatus };
}
