import { NextRequest, NextResponse } from 'next/server';
import type {
  JobOffer,
  JobPreferences,
  UserProfile,
  AIInsights,
  JobAnalysisResult,
} from '@/app/types';
import {
  applyHardBlockers,
  calculateSkillsMatch,
  calculatePerksMatch,
  calculateOverallScore,
  getMatchedSkills,
  getMissingSkills,
  type MatchData,
} from '@/lib/job-filter-service';
import { AnalyzeJobSchema, createValidationErrorResponse, logAndGetSafeError, extractJsonFromText } from '@/lib/validation-schemas';
import { MAX_TOKENS } from '@/lib/constants';
import { callAnthropic } from '@/lib/anthropic-client';

interface AnalyzeJobResponse {
  success: boolean;
  result: JobAnalysisResult | null;
  error?: string;
}

function getAIInsightsPrompt(
  job: Partial<JobOffer>,
  profile: UserProfile,
  matchData: MatchData
): string {
  const jobSkills = [...(job.requiredSkills || []), ...(job.niceToHaveSkills || [])];
  const userSkillNames = profile.skills.map(s => s.name);

  return `You are a career advisor analyzing a job opportunity for a candidate. Provide personalized insights based on the analysis below.

## JOB INFORMATION
- Title: ${job.title || 'Not specified'}
- Company: ${job.company || 'Not specified'}
- Location: ${job.location || 'Not specified'}
- Salary: ${job.salaryMin && job.salaryMax ? `${job.salaryMin} - ${job.salaryMax} ${job.salaryCurrency || 'EUR'}` : 'Not specified'}
- Work Mode: ${job.presenceType || 'Not specified'}
- Required Skills: ${job.requiredSkills?.join(', ') || 'None specified'}
- Nice to Have: ${job.niceToHaveSkills?.join(', ') || 'None specified'}
- Perks: ${job.perks?.join(', ') || 'None specified'}

## CANDIDATE PROFILE
- Current Title: ${profile.workExperience?.[0]?.title || 'Not specified'}
- Years of Experience: ${calculateYearsOfExperience(profile.workExperience)}
- Skills: ${userSkillNames.join(', ') || 'None specified'}
- Languages: ${formatLanguages(profile.languages) || 'None specified'}
- Education: ${profile.education?.[0]?.degree || 'Not specified'} in ${profile.education?.[0]?.field || 'Not specified'}

## WORK EXPERIENCE
${profile.workExperience?.map(exp => `- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})
  Achievements: ${exp.achievements?.join('; ') || 'None listed'}`).join('\n') || 'None specified'}

## MATCH ANALYSIS
- Skills Match: ${matchData.skillsMatchPercent}%
- Matched Skills: ${matchData.matchedSkills.join(', ') || 'None'}
- Missing Skills: ${matchData.missingSkills.join(', ') || 'None'}
- Perks Match: ${matchData.perksMatchCount} matched
- Overall Score: ${matchData.overallScore}/100
${matchData.blockerResult.blocked ? `- BLOCKERS: ${matchData.blockerResult.reasons.join('; ')}` : ''}

Based on this analysis, provide personalized insights in the following JSON format:

{
  "strengths": [
    "Specific strength 1 based on profile match",
    "Specific strength 2",
    "Specific strength 3"
  ],
  "skillGaps": [
    "Specific skill gap 1 with brief context",
    "Specific skill gap 2 with brief context"
  ],
  "strategicAdvice": "2-3 sentences of actionable advice on how to approach this application, what to highlight in the CV/cover letter, or how to address skill gaps",
  "cultureFit": "1 sentence assessment of potential culture fit based on available info, or null if insufficient data",
  "growthPotential": "1 sentence about career growth potential in this role, or null if insufficient data",
  "redFlags": [
    "Any concerns or red flags to be aware of"
  ],
  "matchSummary": "1-2 sentence summary of the overall match quality and recommendation"
}

IMPORTANT:
- Be specific and reference actual skills/experience from the profile
- Keep each point concise (1 sentence max)
- If there are blockers, acknowledge them in the matchSummary
- Don't make up information not present in the data
- Focus on actionable, helpful insights
- The candidate's profile may be in a different language than the job posting. Perform cross-language matching: treat descriptions in any language as equivalent when they describe the same skills (e.g., "encaissement" = "cash handling", "préparation de cocktails" = "cocktail preparation", "service en salle" = "table service")
- Consider work experience achievements as direct evidence of skills, even if those skills are not explicitly listed in the Skills section`;
}

function calculateYearsOfExperience(workExperience?: { startDate: string; endDate?: string; current?: boolean }[]): number {
  if (!workExperience || workExperience.length === 0) return 0;

  const earliest = workExperience.reduce((min, exp) => {
    const start = parseDate(exp.startDate);
    return start < min ? start : min;
  }, new Date());

  const years = Math.floor((Date.now() - earliest.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.max(0, years);
}

function parseDate(dateStr: string): Date {
  // Handle dd-mm-yyyy format
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 2) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  // Fallback to standard parsing
  return new Date(dateStr);
}

function formatLanguages(languages?: { language: string; proficiency: string }[]): string {
  if (!languages || languages.length === 0) return '';

  return languages.map(lang => {
    const proficiencyLabels: Record<string, string> = {
      native: 'Native',
      bilingual: 'Bilingual',
      professional: 'Professional',
      conversational: 'Conversational',
      basic: 'Basic',
    };
    const level = proficiencyLabels[lang.proficiency] || lang.proficiency;
    return `${lang.language} (${level})`;
  }).join(', ');
}

async function generateAIInsights(
  job: Partial<JobOffer>,
  profile: UserProfile,
  matchData: MatchData
): Promise<AIInsights> {
  const prompt = getAIInsightsPrompt(job, profile, matchData);

  try {
    const responseText = await callAnthropic({
      prompt,
      maxTokens: MAX_TOKENS.JOB_INSIGHTS,
    });

    // Parse the JSON response
    const parsed = extractJsonFromText<Record<string, unknown>>(responseText);

    // Validate and return
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
      strategicAdvice: typeof parsed.strategicAdvice === 'string' ? parsed.strategicAdvice : '',
      cultureFit: typeof parsed.cultureFit === 'string' ? parsed.cultureFit : null,
      growthPotential: typeof parsed.growthPotential === 'string' ? parsed.growthPotential : null,
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      matchSummary: typeof parsed.matchSummary === 'string' ? parsed.matchSummary : '',
    };

  } catch (error) {
    console.error('Error generating AI insights:', error);

    // Return fallback insights based on match data
    return generateFallbackInsights(matchData);
  }
}

function generateFallbackInsights(matchData: MatchData): AIInsights {
  const strengths: string[] = [];
  const skillGaps: string[] = [];
  const redFlags: string[] = [];

  if (matchData.skillsMatchPercent >= 70) {
    strengths.push(`Strong skills alignment at ${matchData.skillsMatchPercent}%`);
  } else if (matchData.skillsMatchPercent >= 50) {
    strengths.push(`Moderate skills alignment at ${matchData.skillsMatchPercent}%`);
  }

  if (matchData.matchedSkills.length > 0) {
    strengths.push(`Key matching skills: ${matchData.matchedSkills.slice(0, 3).join(', ')}`);
  }

  if (matchData.missingSkills.length > 0) {
    skillGaps.push(...matchData.missingSkills.slice(0, 3).map(s => `Missing: ${s}`));
  }

  if (matchData.blockerResult.blocked) {
    redFlags.push(...matchData.blockerResult.reasons);
  }

  let matchSummary = '';
  if (matchData.overallScore >= 80) {
    matchSummary = 'This is an excellent match for your profile. Consider applying with confidence.';
  } else if (matchData.overallScore >= 60) {
    matchSummary = 'Good alignment with some gaps. Highlight transferable skills in your application.';
  } else {
    matchSummary = 'Significant gaps exist. Consider if this role aligns with your career goals.';
  }

  return {
    strengths,
    skillGaps,
    strategicAdvice: 'Review the skill gaps and consider how your experience demonstrates related capabilities.',
    cultureFit: null,
    growthPotential: null,
    redFlags,
    matchSummary,
  };
}


export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeJobResponse>> {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = AnalyzeJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, result: null, ...createValidationErrorResponse(validation.error) },
        { status: 400 }
      );
    }

    // Cast to proper types (Zod validated structure, TypeScript types are authoritative)
    const jobOffer = validation.data.jobOffer as unknown as Partial<JobOffer>;
    const preferences = validation.data.preferences as unknown as JobPreferences;
    const userProfile = validation.data.userProfile as unknown as UserProfile;

    // Step 1: Apply hard blockers
    const blockerResult = applyHardBlockers(jobOffer, preferences);

    // Step 2: Calculate skills match
    const jobSkills = [...(jobOffer.requiredSkills || []), ...(jobOffer.niceToHaveSkills || [])];
    const skillsMatchPercent = calculateSkillsMatch(jobSkills, userProfile.skills, userProfile.workExperience);

    // Step 3: Calculate perks match
    const perksMatchCount = calculatePerksMatch(jobOffer.perks || [], preferences.preferredPerks);

    // Step 4: Calculate overall score
    const hasSalaryInfo = jobOffer.salaryMin !== null || jobOffer.salaryMax !== null;
    const meetsMinSalary = !preferences.minSalary ||
      (jobOffer.salaryMax !== null && jobOffer.salaryMax !== undefined && jobOffer.salaryMax >= preferences.minSalary);

    const overallScore = calculateOverallScore(
      skillsMatchPercent,
      perksMatchCount,
      preferences.preferredPerks.length,
      hasSalaryInfo,
      meetsMinSalary,
      {
        salary: preferences.weightSalary,
        skills: preferences.weightSkills,
        perks: preferences.weightPerks,
      }
    );

    // Step 5: Prepare match data for AI insights
    const matchData: MatchData = {
      skillsMatchPercent,
      perksMatchCount,
      overallScore,
      blockerResult,
      matchedSkills: getMatchedSkills(jobSkills, userProfile.skills, userProfile.workExperience),
      missingSkills: getMissingSkills(jobSkills, userProfile.skills, userProfile.workExperience),
    };

    // Step 6: Generate AI insights
    const aiInsights = await generateAIInsights(jobOffer, userProfile, matchData);

    const result: JobAnalysisResult = {
      isBlocked: blockerResult.blocked,
      blockReasons: blockerResult.reasons,
      skillsMatchPercent,
      perksMatchCount,
      overallScore,
      aiInsights,
      matchedSkills: matchData.matchedSkills,
      missingSkills: matchData.missingSkills,
    };

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    const errorMessage = logAndGetSafeError('Analyze Job Error', error, 'Failed to analyze job');
    return NextResponse.json(
      {
        success: false,
        result: null,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
