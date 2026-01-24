import { createClient } from './supabase-browser';
import type {
  UserProfile,
  RoleProfile,
  Education,
  WorkExperience,
  Skill,
  Certification,
  Award,
  Language,
  Affiliation,
  VolunteerExperience,
  PortfolioLink,
  CustomAchievement,
} from '@/app/types';

// Get current user ID helper
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// PROFILE COMPLETENESS CALCULATION
// ============================================

export function calculateProfileCompleteness(profile: Partial<UserProfile>): number {
  let score = 0;
  const weights = {
    fullName: 10,
    email: 10,
    phone: 5,
    city: 5,
    country: 5,
    professionalSummary: 15,
    education: 15,
    workExperience: 20,
    skills: 15,
  };

  if (profile.fullName) score += weights.fullName;
  if (profile.email) score += weights.email;
  if (profile.phone) score += weights.phone;
  if (profile.city) score += weights.city;
  if (profile.country) score += weights.country;
  if (profile.professionalSummary && profile.professionalSummary.length > 50) score += weights.professionalSummary;
  if (profile.education && profile.education.length > 0) score += weights.education;
  if (profile.workExperience && profile.workExperience.length > 0) score += weights.workExperience;
  if (profile.skills && profile.skills.length >= 5) score += weights.skills;

  return score;
}

// ============================================
// USER PROFILE CRUD
// ============================================

export async function loadUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile exists yet
      return null;
    }
    console.error('Error loading user profile:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone || undefined,
    dateOfBirth: data.date_of_birth || undefined,
    city: data.city || undefined,
    country: data.country || undefined,
    professionalSummary: data.professional_summary || undefined,
    education: (data.education as Education[]) || [],
    workExperience: (data.work_experience as WorkExperience[]) || [],
    skills: (data.skills as Skill[]) || [],
    certifications: (data.certifications as Certification[]) || [],
    awards: (data.awards as Award[]) || [],
    languages: (data.languages as Language[]) || [],
    affiliations: (data.affiliations as Affiliation[]) || [],
    volunteerExperience: (data.volunteer_experience as VolunteerExperience[]) || [],
    portfolioLinks: (data.portfolio_links as PortfolioLink[]) || [],
    profileCompleteness: data.profile_completeness || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  const completeness = calculateProfileCompleteness(profile);

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: profile.id || crypto.randomUUID(),
      user_id: userId,
      full_name: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || null,
      date_of_birth: profile.dateOfBirth || null,
      city: profile.city || null,
      country: profile.country || null,
      professional_summary: profile.professionalSummary || null,
      education: profile.education || [],
      work_experience: profile.workExperience || [],
      skills: profile.skills || [],
      certifications: profile.certifications || [],
      awards: profile.awards || [],
      languages: profile.languages || [],
      affiliations: profile.affiliations || [],
      volunteer_experience: profile.volunteerExperience || [],
      portfolio_links: profile.portfolioLinks || [],
      profile_completeness: completeness,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error saving user profile:', error);
    return false;
  }

  return true;
}

export async function createEmptyProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data: { user } } = await supabase.auth.getUser();

  if (!userId || !user) {
    console.error('No authenticated user');
    return null;
  }

  const newProfile: Partial<UserProfile> = {
    id: crypto.randomUUID(),
    userId,
    fullName: '',
    email: user.email || '',
    education: [],
    workExperience: [],
    skills: [],
    certifications: [],
    awards: [],
    languages: [],
    affiliations: [],
    volunteerExperience: [],
    portfolioLinks: [],
    profileCompleteness: 0,
  };

  const success = await saveUserProfile(newProfile);
  if (success) {
    return loadUserProfile();
  }
  return null;
}

// ============================================
// ROLE PROFILE CRUD
// ============================================

export async function loadRoleProfiles(): Promise<RoleProfile[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return [];
  }

  const { data, error } = await supabase
    .from('role_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading role profiles:', error);
    return [];
  }

  return data.map((rp) => ({
    id: rp.id,
    userId: rp.user_id,
    name: rp.name,
    description: rp.description || undefined,
    icon: rp.icon || '🎯',
    color: rp.color || '#6366f1',
    customSummary: rp.custom_summary || undefined,
    selectedExperienceIds: rp.selected_experience_ids || [],
    experienceOrder: rp.experience_order || [],
    selectedSkillIds: rp.selected_skill_ids || [],
    skillPriority: rp.skill_priority || [],
    selectedEducationIds: rp.selected_education_ids || [],
    selectedCertificationIds: rp.selected_certification_ids || [],
    additionalSkills: (rp.additional_skills as Skill[]) || [],
    customAchievements: (rp.custom_achievements as CustomAchievement[]) || [],
    isDefault: rp.is_default || false,
    usageCount: rp.usage_count || 0,
    lastUsedAt: rp.last_used_at || undefined,
    createdAt: rp.created_at,
    updatedAt: rp.updated_at,
  }));
}

export async function saveRoleProfile(roleProfile: Partial<RoleProfile>): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  const { error } = await supabase
    .from('role_profiles')
    .upsert({
      id: roleProfile.id || crypto.randomUUID(),
      user_id: userId,
      name: roleProfile.name || 'New Role',
      description: roleProfile.description || null,
      icon: roleProfile.icon || '🎯',
      color: roleProfile.color || '#6366f1',
      custom_summary: roleProfile.customSummary || null,
      selected_experience_ids: roleProfile.selectedExperienceIds || [],
      experience_order: roleProfile.experienceOrder || [],
      selected_skill_ids: roleProfile.selectedSkillIds || [],
      skill_priority: roleProfile.skillPriority || [],
      selected_education_ids: roleProfile.selectedEducationIds || [],
      selected_certification_ids: roleProfile.selectedCertificationIds || [],
      additional_skills: roleProfile.additionalSkills || [],
      custom_achievements: roleProfile.customAchievements || [],
      is_default: roleProfile.isDefault || false,
      usage_count: roleProfile.usageCount || 0,
      last_used_at: roleProfile.lastUsedAt || null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving role profile:', error);
    return false;
  }

  return true;
}

export async function deleteRoleProfile(roleProfileId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('role_profiles')
    .delete()
    .eq('id', roleProfileId);

  if (error) {
    console.error('Error deleting role profile:', error);
    return false;
  }

  return true;
}

export async function setDefaultRoleProfile(roleProfileId: string): Promise<boolean> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return false;
  }

  // First, unset all defaults for this user
  const { error: unsetError } = await supabase
    .from('role_profiles')
    .update({ is_default: false })
    .eq('user_id', userId);

  if (unsetError) {
    console.error('Error unsetting default role profiles:', unsetError);
    return false;
  }

  // Then set the new default
  const { error: setError } = await supabase
    .from('role_profiles')
    .update({ is_default: true })
    .eq('id', roleProfileId);

  if (setError) {
    console.error('Error setting default role profile:', setError);
    return false;
  }

  return true;
}

export async function incrementRoleProfileUsage(roleProfileId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_role_profile_usage', {
    profile_id: roleProfileId,
  });

  // If RPC doesn't exist, fallback to manual update
  if (error) {
    const { data: current } = await supabase
      .from('role_profiles')
      .select('usage_count')
      .eq('id', roleProfileId)
      .single();

    const { error: updateError } = await supabase
      .from('role_profiles')
      .update({
        usage_count: (current?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', roleProfileId);

    if (updateError) {
      console.error('Error incrementing role profile usage:', updateError);
      return false;
    }
  }

  return true;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.profileCompleteness >= 85;
}

export function getMissingProfileFields(profile: UserProfile | null): string[] {
  const missing: string[] = [];

  if (!profile) {
    return ['Complete profile'];
  }

  if (!profile.fullName) missing.push('Full name');
  if (!profile.email) missing.push('Email');
  if (!profile.phone) missing.push('Phone');
  if (!profile.city) missing.push('City');
  if (!profile.country) missing.push('Country');
  if (!profile.professionalSummary || profile.professionalSummary.length < 50) {
    missing.push('Professional summary');
  }
  if (!profile.education || profile.education.length === 0) {
    missing.push('Education');
  }
  if (!profile.workExperience || profile.workExperience.length === 0) {
    missing.push('Work experience');
  }
  if (!profile.skills || profile.skills.length < 5) {
    missing.push('Skills (minimum 5)');
  }

  return missing;
}
