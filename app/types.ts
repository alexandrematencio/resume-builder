// Complete architecture for Job Application Tracker

export interface Template {
  id: string;
  name: string;
  type: 'design' | 'dev' | 'business' | 'custom';
  icon: string;
  color: string;
  
  content: {
    personalInfo: {
      name: string;
      email: string;
      phone: string;
      address: string;
    };
    summary: string;
    experience: string;
    education: string;
    skills: string;
  };
  
  createdAt: number;
  lastModified: number;
  usageCount: number; // How many times used
  successRate: number; // Interview rate
}

export interface CVVersion {
  id: string;
  version: number;
  content: string; // Generated CV text
  generatedBy: 'ai' | 'manual';
  createdAt: number;
  modifiedAt?: number;
}

export type CoverLetterStyle =
  | 'french_formal'      // Style français traditionnel, très formel
  | 'french_modern'      // Style français moderne, professionnel mais moins rigide
  | 'american_standard'  // Style américain standard
  | 'american_creative'; // Style américain créatif/startup

export interface RecipientInfo {
  companyName: string;
  recipientName?: string;
  recipientTitle?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface CoverLetter {
  id: string;
  version: number;
  content: string;
  style: CoverLetterStyle;
  recipientInfo: RecipientInfo;
  generatedBy: 'ai' | 'manual';
  createdAt: number;
  modifiedAt?: number;
}

export type ClosedReason = 'accepted' | 'declined' | 'expired';

export type ApplicationStatus =
  | 'draft'
  | 'sent'
  | 'waiting'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'closed';

export type SentVia = 
  | 'indeed' 
  | 'linkedin' 
  | 'email' 
  | 'company_site' 
  | 'other';

export type InterviewType = 
  | 'phone' 
  | 'video' 
  | 'onsite';

export interface InterviewInfo {
  date: number;
  type: InterviewType;
  interviewer?: string;
  location?: string;
  notes?: string;
}

export interface OutcomeInfo {
  type: 'offer' | 'rejected';
  date: number;
  feedback?: string;
  salaryOffer?: string;
}

export interface ApplicationTracking {
  sentDate?: number;
  sentVia?: SentVia;
  followUpDates: number[];
  interviewScheduled?: InterviewInfo;
  outcome?: OutcomeInfo;
  closedReason?: ClosedReason;
  closedDate?: number;
}

export interface StatusChange {
  status: ApplicationStatus;
  timestamp: number;
  note?: string;
}

export interface Application {
  id: string;
  
  // Job Info
  company: string;
  role: string;
  jobDescription: string;
  jobUrl?: string;
  
  // Template & Content
  selectedTemplateId?: string; // Optional - can be created from scratch
  cvVersions: CVVersion[];
  coverLetters: CoverLetter[]; // Array of cover letter versions
  
  // Status & Timeline
  status: ApplicationStatus;
  statusHistory: StatusChange[];
  tracking: ApplicationTracking;
  
  // Dates
  createdAt: number;
  appliedAt?: number;
  
  // Notes
  notes: string;
  
  // Metadata
  tags: string[];
  isFavorite: boolean;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface DashboardStats {
  total: number;
  draft: number;
  sent: number;
  waiting: number;
  interview: number;
  offer: number;
  rejected: number;
  closed: number;
  interviewRate: number; // percentage
  avgResponseTime: number; // days
}

// ============================================
// USER PROFILE TYPES
// ============================================

export interface Education {
  id: string;
  degree: string;
  institution: string;
  field: string;
  startYear: number;
  endYear?: number;
  current?: boolean;
  gpa?: string;
  honors?: string;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string; // Format: dd-mm-yyyy (e.g., "01-09-2020")
  endDate?: string; // Format: dd-mm-yyyy
  current: boolean;
  achievements: string[];
}

export type SkillCategory = 'technical' | 'soft' | 'language' | 'tool';
export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency?: SkillProficiency;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export type LanguageProficiency = 'basic' | 'conversational' | 'professional' | 'native' | 'bilingual';
export type LanguageAcquisition = 'native' | 'education' | 'immersion' | 'self_taught' | 'practice';

export interface LanguageCertification {
  name: string; // e.g., "TOEFL", "DELF", "JLPT"
  level?: string; // e.g., "B2", "N2", "C1"
  score?: string; // e.g., "110/120"
  date?: string; // When obtained
}

export interface Language {
  id: string;
  language: string;
  proficiency: LanguageProficiency;
  acquisition: LanguageAcquisition; // How the language was learned
  yearsOfPractice?: number; // Years of daily/regular practice
  certification?: LanguageCertification; // Optional certification
  notes?: string; // Additional context (e.g., "23 years of daily practice")
}

export interface Affiliation {
  id: string;
  organization: string;
  role?: string;
  startDate?: string;
  endDate?: string;
}

export interface VolunteerExperience {
  id: string;
  organization: string;
  role: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface PortfolioLink {
  id: string;
  type: 'linkedin' | 'github' | 'portfolio' | 'twitter' | 'dribbble' | 'behance' | 'other';
  url: string;
  label?: string;
}

export interface UserProfile {
  id: string;
  userId: string;

  // Personal Info (required)
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  city?: string;
  country?: string;

  // Professional Core
  professionalSummary?: string;

  // Structured Data
  education: Education[];
  workExperience: WorkExperience[];
  skills: Skill[];

  // Extended/Optional
  certifications: Certification[];
  awards: Award[];
  languages: Language[];
  affiliations: Affiliation[];
  volunteerExperience: VolunteerExperience[];
  portfolioLinks: PortfolioLink[];

  // Metadata
  profileCompleteness: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ROLE PROFILE TYPES
// ============================================

export interface CustomAchievement {
  experienceId: string;
  achievements: string[];
}

export interface RoleProfile {
  id: string;
  userId: string;

  // Basic Info
  name: string;
  description?: string;
  icon: string;
  color: string;

  // Customizations
  customSummary?: string;
  selectedExperienceIds: string[];
  experienceOrder: string[];
  selectedSkillIds: string[];
  skillPriority: string[];
  selectedEducationIds: string[];
  selectedCertificationIds: string[];
  additionalSkills: Skill[];
  customAchievements: CustomAchievement[];

  // Metadata
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// JOB INTELLIGENCE ENGINE TYPES
// ============================================

export type RemotePreference = 'full_remote' | 'hybrid' | 'on_site' | 'any';
export type PresenceType = 'full_remote' | 'hybrid' | 'on_site';
export type SalaryRateType = 'annual' | 'monthly' | 'hourly' | 'daily';
export type JobOfferStatus = 'new' | 'analyzed' | 'saved' | 'applied' | 'rejected' | 'archived';
export type FeedbackType = 'helpful' | 'not_helpful' | 'wrong_score' | 'good_match' | 'bad_match';
export type UserAction = 'saved' | 'applied' | 'dismissed' | 'ignored';

export interface JobPreferences {
  id: string;
  userId: string;

  // Location
  allowedCountries: string[];
  allowedCities: string[];

  // Salary (annual)
  minSalary: number | null;
  salaryCurrency: string;

  // Freelance rates
  minHourlyRate: number | null;
  minDailyRate: number | null;

  // Hours
  minHoursPerWeek: number;
  maxHoursPerWeek: number;

  // Presence
  remotePreference: RemotePreference;

  // Perks
  preferredPerks: string[];

  // Weights (0-100)
  weightSalary: number;
  weightSkills: number;
  weightPerks: number;

  // Thresholds
  minSkillsMatchPercent: number;

  // GDPR Consent
  aiConsent: boolean; // User has consented to AI analysis

  createdAt?: string;
  updatedAt?: string;
}

export interface AIInsights {
  strengths: string[];
  skillGaps: string[];
  strategicAdvice: string;
  cultureFit: string | null;
  growthPotential: string | null;
  redFlags: string[];
  matchSummary: string;
}

export interface JobOffer {
  id: string;
  userId: string;

  // Basic
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  city: string | null;

  // Compensation
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryRateType: SalaryRateType | null;

  // Conditions
  hoursPerWeek: number | null;
  presenceType: PresenceType | null;
  contractType: string | null;

  // Content
  description: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  perks: string[];

  // Source
  sourceUrl: string | null;
  sourcePlatform: string | null;

  // Analysis
  isBlocked: boolean;
  blockReasons: string[];
  skillsMatchPercent: number | null;
  perksMatchCount: number | null;
  overallScore: number | null;
  aiInsights: AIInsights | null;
  matchedSkills: string[];
  missingSkills: string[];
  dismissedRedFlags: string[];

  // Status
  status: JobOfferStatus;

  createdAt: string;
  updatedAt?: string;
  analyzedAt: string | null;
}

export interface JobAnalysisResult {
  isBlocked: boolean;
  blockReasons: string[];
  skillsMatchPercent: number;
  perksMatchCount: number;
  overallScore: number;
  aiInsights: AIInsights;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface JobAnalysisFeedback {
  id: string;
  userId: string;
  jobOfferId: string;
  feedbackType: FeedbackType;
  feedbackNotes?: string;
  userAction: UserAction;
  createdAt: string;
}

export interface JobOfferFilters {
  status?: JobOfferStatus[];
  minScore?: number;
  isBlocked?: boolean;
  search?: string;
  sortBy?: 'score' | 'date' | 'company';
  sortOrder?: 'asc' | 'desc';
}

export interface ParsedJobContext {
  title: string | null;
  company: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  presenceType: PresenceType | null;
  contractType: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  perks: string[];
  matchedSkills: string[];
  missingSkills: string[];
  skillsMatchPercent: number;
}

// Common perk options for UI
export const COMMON_PERKS = [
  'meal_vouchers',
  'health_insurance',
  'dental_insurance',
  'gym_membership',
  'remote_budget',
  'training_budget',
  'stock_options',
  'bonus',
  'flexible_hours',
  'unlimited_pto',
  'parental_leave',
  'commute_allowance',
  'company_car',
  'phone_allowance',
  'retirement_plan',
] as const;

export const PERK_LABELS: Record<string, string> = {
  meal_vouchers: 'Meal Vouchers',
  health_insurance: 'Health Insurance',
  dental_insurance: 'Dental Insurance',
  gym_membership: 'Gym Membership',
  remote_budget: 'Remote Work Budget',
  training_budget: 'Training Budget',
  stock_options: 'Stock Options',
  bonus: 'Performance Bonus',
  flexible_hours: 'Flexible Hours',
  unlimited_pto: 'Unlimited PTO',
  parental_leave: 'Parental Leave',
  commute_allowance: 'Commute Allowance',
  company_car: 'Company Car',
  phone_allowance: 'Phone Allowance',
  retirement_plan: 'Retirement Plan',
};
