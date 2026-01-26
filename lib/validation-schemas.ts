import { z } from 'zod';

// Common reusable schemas
export const UrlSchema = z.string().url();

export const NonEmptyStringSchema = z.string().min(1).max(100000);

// Fetch Job URL
export const FetchJobUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

// Parse CV Section
export const ParseCvSectionSchema = z.object({
  section: z.enum(['education', 'experience', 'skills', 'personal']),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long (max 50000 characters)'),
});

// Parse Job Description
export const ParseJobDescriptionSchema = z.object({
  description: z.string().min(1, 'Job description is required').max(100000, 'Job description too long (max 100000 characters)'),
});

// Generate Resume / Cover Letter
export const GeneratePromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt too long'),
});

// Analyze Job - validate critical fields with .passthrough() for extra data
const JobOfferSchema = z.object({
  requiredSkills: z.array(z.string()).optional().default([]),
  niceToHaveSkills: z.array(z.string()).optional().default([]),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
}).passthrough(); // Allow extra fields after validating criticals

const PreferencesSchema = z.object({
  minSalary: z.number().nullable().optional(),
  weightSalary: z.number().min(0).max(100).optional(),
  weightSkills: z.number().min(0).max(100).optional(),
  weightLocation: z.number().min(0).max(100).optional(),
  weightRemote: z.number().min(0).max(100).optional(),
  weightPerks: z.number().min(0).max(100).optional(),
}).passthrough(); // Allow extra fields after validating weights

const UserProfileSchema = z.object({
  skills: z.array(z.object({
    name: z.string(),
  }).passthrough()).optional(),
}).passthrough(); // Allow extra profile fields

export const AnalyzeJobSchema = z.object({
  jobOffer: JobOfferSchema,
  preferences: PreferencesSchema,
  userProfile: UserProfileSchema,
});

// Suggest Projects
export const SuggestProjectsSchema = z.object({
  jobDescription: z.string().optional().default(''),
  role: z.string().optional().default(''),
  company: z.string().optional().default(''),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
  })).optional().default([]),
  awards: z.array(z.object({
    title: z.string(),
    issuer: z.string(),
    date: z.string(),
    description: z.string().optional(),
  })).optional().default([]),
  experience: z.string().optional().default(''),
});

// Helper function to get validation error message
export function getValidationErrorMessage(error: z.ZodError<unknown>): string {
  const issues = error.issues;
  const firstIssue = issues[0];
  return firstIssue
    ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
    : 'Validation error';
}

// Helper function to create validation error response
export function createValidationErrorResponse(error: z.ZodError<unknown>) {
  return {
    error: getValidationErrorMessage(error),
  };
}

// Safe error logging - logs details server-side, returns generic message to client
export function logAndGetSafeError(context: string, error: unknown, genericMessage: string): string {
  // Log detailed error server-side only
  if (process.env.NODE_ENV === 'development') {
    console.error(`${context}:`, error);
  } else {
    // In production, log minimal info to avoid PII/detail leaks
    console.error(`${context}: ${error instanceof Error ? error.name : 'Unknown error'}`);
  }
  // Always return generic message to client
  return genericMessage;
}

/**
 * Extracts JSON from AI response text (handles markdown code blocks)
 * @throws Error if no JSON found in response
 */
export function extractJsonFromText<T = unknown>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  return JSON.parse(jsonMatch[0]) as T;
}
