// ============================================
// ANTHROPIC API CONFIGURATION
// ============================================
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
export const ANTHROPIC_API_VERSION = '2023-06-01';

export const MAX_TOKENS = {
  COVER_LETTER: 2000,
  RESUME: 2500,
  JOB_PARSING: 2000,
  CV_SECTION_PARSING: 4000,
  JOB_INSIGHTS: 1500,
  SUGGEST_PROJECTS: 500,
} as const;

// ============================================
// FILE UPLOAD LIMITS
// ============================================
export const FILE_SIZE_LIMITS = {
  PDF_MAX_BYTES: 8 * 1024 * 1024, // 8MB
  PDF_MAX_MB: 8,
} as const;

// ============================================
// VALIDATION LIMITS
// ============================================
export const INPUT_LIMITS = {
  CV_CONTENT_MAX_CHARS: 50000,
  JOB_DESCRIPTION_MAX_CHARS: 100000,
  PROMPT_MAX_CHARS: 50000,
  URL_MAX_LENGTH: 2048,
} as const;

// ============================================
// SCORING THRESHOLDS
// ============================================
export const MATCH_SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  MODERATE: 55,
  LOW: 0,
} as const;

export const SKILL_MATCH_WEIGHTS = {
  EXACT_MATCH: 1.0,
  PARTIAL_MATCH: 0.8,
  SEMANTIC_MATCH: 0.6,
  EXPERIENCE_MATCH: 0.5,
  EXPERIENCE_SEMANTIC: 0.4,
} as const;

// ============================================
// UI CONSTANTS
// ============================================
export const MIN_SKILL_FRAGMENT_LENGTH = 2;
export const MIN_EXPERIENCE_MATCH_LENGTH = 4;
export const CRITICAL_SKILL_GAPS_LIMIT = 3;
