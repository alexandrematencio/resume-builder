import type {
  JobOffer,
  JobPreferences,
  JobAnalysisResult,
  AIInsights,
  Skill,
  UserProfile,
} from '@/app/types';

// ============================================
// HARD BLOCKERS
// ============================================

export interface BlockerResult {
  blocked: boolean;
  reasons: string[];
}

export function applyHardBlockers(
  job: Partial<JobOffer>,
  prefs: JobPreferences
): BlockerResult {
  const reasons: string[] = [];

  // Salary check - based on rate type
  const rateType = job.salaryRateType || 'annual';

  if (rateType === 'hourly' && prefs.minHourlyRate && job.salaryMax) {
    // Hourly rate check
    if (job.salaryMax < prefs.minHourlyRate) {
      reasons.push(
        `Hourly rate below minimum (max offered: ${formatCurrency(job.salaryMax, job.salaryCurrency || 'EUR')}/h, min required: ${formatCurrency(prefs.minHourlyRate, prefs.salaryCurrency)}/h)`
      );
    }
  } else if (rateType === 'daily' && prefs.minDailyRate && job.salaryMax) {
    // Daily rate check (TJM)
    if (job.salaryMax < prefs.minDailyRate) {
      reasons.push(
        `Daily rate below minimum (max offered: ${formatCurrency(job.salaryMax, job.salaryCurrency || 'EUR')}/day, min required: ${formatCurrency(prefs.minDailyRate, prefs.salaryCurrency)}/day)`
      );
    }
  } else if (rateType === 'annual' && prefs.minSalary && job.salaryMax) {
    // Annual salary check (default)
    if (job.salaryMax < prefs.minSalary) {
      reasons.push(
        `Salary below minimum (max offered: ${formatCurrency(job.salaryMax, job.salaryCurrency || 'EUR')}, min required: ${formatCurrency(prefs.minSalary, prefs.salaryCurrency)})`
      );
    }
  }

  // Location check - only if user has specified allowed cities
  if (prefs.allowedCities.length > 0 && job.city) {
    const cityMatch = prefs.allowedCities.some((allowedCity) =>
      job.city?.toLowerCase().includes(allowedCity.toLowerCase()) ||
      allowedCity.toLowerCase().includes(job.city?.toLowerCase() || '')
    );
    if (!cityMatch) {
      reasons.push(`Location "${job.city}" not in allowed cities`);
    }
  }

  // Country check - only if user has specified allowed countries
  if (prefs.allowedCountries.length > 0 && job.country) {
    const countryMatch = prefs.allowedCountries.some((allowedCountry) =>
      job.country?.toLowerCase().includes(allowedCountry.toLowerCase()) ||
      allowedCountry.toLowerCase().includes(job.country?.toLowerCase() || '')
    );
    if (!countryMatch) {
      reasons.push(`Country "${job.country}" not in allowed countries`);
    }
  }

  // Hours check
  if (job.hoursPerWeek) {
    if (job.hoursPerWeek < prefs.minHoursPerWeek) {
      reasons.push(
        `Hours below minimum (${job.hoursPerWeek}h < ${prefs.minHoursPerWeek}h)`
      );
    }
    if (job.hoursPerWeek > prefs.maxHoursPerWeek) {
      reasons.push(
        `Hours above maximum (${job.hoursPerWeek}h > ${prefs.maxHoursPerWeek}h)`
      );
    }
  }

  // Remote preference check
  if (prefs.remotePreference !== 'any' && job.presenceType) {
    if (prefs.remotePreference !== job.presenceType) {
      const presenceLabels = {
        full_remote: 'Full Remote',
        hybrid: 'Hybrid',
        on_site: 'On-site',
      };
      reasons.push(
        `Work mode mismatch (job: ${presenceLabels[job.presenceType]}, wanted: ${presenceLabels[prefs.remotePreference]})`
      );
    }
  }

  return {
    blocked: reasons.length > 0,
    reasons,
  };
}

// ============================================
// SEMANTIC SCORING
// ============================================

export function calculateSkillsMatch(
  jobSkills: string[],
  userSkills: Skill[]
): number {
  if (jobSkills.length === 0) {
    return 100; // No requirements = perfect match
  }

  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());

  let matchCount = 0;
  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = jobSkill.toLowerCase();

    // Check for exact match
    if (userSkillNames.includes(normalizedJobSkill)) {
      matchCount++;
      continue;
    }

    // Check for partial match (e.g., "React.js" matches "React")
    const partialMatch = userSkillNames.some(
      (userSkill) =>
        userSkill.includes(normalizedJobSkill) ||
        normalizedJobSkill.includes(userSkill)
    );

    if (partialMatch) {
      matchCount += 0.8; // Partial matches count as 80%
      continue;
    }

    // Check for semantic similarity (basic)
    const semanticMatch = checkSemanticSimilarity(normalizedJobSkill, userSkillNames);
    if (semanticMatch) {
      matchCount += 0.6; // Semantic matches count as 60%
    }
  }

  return Math.round((matchCount / jobSkills.length) * 100);
}

// Basic semantic similarity check
function checkSemanticSimilarity(skill: string, userSkills: string[]): boolean {
  // Common skill equivalences
  const equivalences: Record<string, string[]> = {
    javascript: ['js', 'ecmascript', 'es6', 'es2015'],
    typescript: ['ts'],
    react: ['reactjs', 'react.js'],
    vue: ['vuejs', 'vue.js'],
    angular: ['angularjs', 'angular.js'],
    node: ['nodejs', 'node.js'],
    python: ['py'],
    postgres: ['postgresql', 'psql'],
    mongo: ['mongodb'],
    aws: ['amazon web services'],
    gcp: ['google cloud', 'google cloud platform'],
    azure: ['microsoft azure'],
    docker: ['containerization'],
    kubernetes: ['k8s'],
    ci: ['continuous integration'],
    cd: ['continuous deployment', 'continuous delivery'],
    agile: ['scrum', 'kanban'],
    sql: ['mysql', 'postgresql', 'sqlite'],
  };

  for (const [key, aliases] of Object.entries(equivalences)) {
    const allTerms = [key, ...aliases];
    if (allTerms.includes(skill)) {
      return userSkills.some((userSkill) =>
        allTerms.some((term) => userSkill.includes(term))
      );
    }
  }

  return false;
}

export function calculatePerksMatch(
  jobPerks: string[],
  preferredPerks: string[]
): number {
  if (preferredPerks.length === 0 || jobPerks.length === 0) {
    return 0;
  }

  const normalizedJobPerks = jobPerks.map((p) => p.toLowerCase().replace(/[_-]/g, ' '));
  const normalizedPreferred = preferredPerks.map((p) => p.toLowerCase().replace(/[_-]/g, ' '));

  let matchCount = 0;
  for (const preferred of normalizedPreferred) {
    const hasMatch = normalizedJobPerks.some(
      (jobPerk) =>
        jobPerk.includes(preferred) || preferred.includes(jobPerk)
    );
    if (hasMatch) {
      matchCount++;
    }
  }

  return matchCount;
}

export function calculateOverallScore(
  skillsMatchPercent: number,
  perksMatchCount: number,
  totalPreferredPerks: number,
  hasSalaryInfo: boolean,
  meetsMinSalary: boolean,
  weights: { salary: number; skills: number; perks: number }
): number {
  // Normalize weights to sum to 100
  const totalWeight = weights.salary + weights.skills + weights.perks;
  const normalizedWeights = {
    salary: (weights.salary / totalWeight) * 100,
    skills: (weights.skills / totalWeight) * 100,
    perks: (weights.perks / totalWeight) * 100,
  };

  let score = 0;

  // Skills score (0-100)
  score += (skillsMatchPercent / 100) * normalizedWeights.skills;

  // Perks score (0-100 based on match ratio)
  if (totalPreferredPerks > 0) {
    const perksScore = (perksMatchCount / totalPreferredPerks) * 100;
    score += (perksScore / 100) * normalizedWeights.perks;
  } else {
    // If user has no preferred perks, redistribute weight to skills
    score += normalizedWeights.perks * (skillsMatchPercent / 100);
  }

  // Salary score
  if (hasSalaryInfo) {
    const salaryScore = meetsMinSalary ? 100 : 50; // Partial score if no min set
    score += (salaryScore / 100) * normalizedWeights.salary;
  } else {
    // No salary info - give neutral score (50%)
    score += 0.5 * normalizedWeights.salary;
  }

  return Math.round(score);
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export interface AnalysisInput {
  job: Partial<JobOffer>;
  preferences: JobPreferences;
  userProfile: UserProfile;
}

export async function analyzeJob(
  input: AnalysisInput,
  generateInsights: (job: Partial<JobOffer>, profile: UserProfile, matchData: MatchData) => Promise<AIInsights>
): Promise<JobAnalysisResult> {
  const { job, preferences, userProfile } = input;

  // Step 1: Apply hard blockers
  const blockerResult = applyHardBlockers(job, preferences);

  // Step 2: Calculate skills match
  const jobSkills = [...(job.requiredSkills || []), ...(job.niceToHaveSkills || [])];
  const skillsMatchPercent = calculateSkillsMatch(jobSkills, userProfile.skills);

  // Step 3: Calculate perks match
  const perksMatchCount = calculatePerksMatch(job.perks || [], preferences.preferredPerks);

  // Step 4: Calculate overall score
  const hasSalaryInfo = job.salaryMin != null || job.salaryMax != null;
  const meetsMinSalary = !preferences.minSalary ||
    (job.salaryMax != null && job.salaryMax >= preferences.minSalary);

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

  // Step 5: Generate AI insights
  const matchData: MatchData = {
    skillsMatchPercent,
    perksMatchCount,
    overallScore,
    blockerResult,
    matchedSkills: getMatchedSkills(jobSkills, userProfile.skills),
    missingSkills: getMissingSkills(jobSkills, userProfile.skills),
  };

  const aiInsights = await generateInsights(job, userProfile, matchData);

  return {
    isBlocked: blockerResult.blocked,
    blockReasons: blockerResult.reasons,
    skillsMatchPercent,
    perksMatchCount,
    overallScore,
    aiInsights,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export interface MatchData {
  skillsMatchPercent: number;
  perksMatchCount: number;
  overallScore: number;
  blockerResult: BlockerResult;
  matchedSkills: string[];
  missingSkills: string[];
}

function getMatchedSkills(jobSkills: string[], userSkills: Skill[]): string[] {
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
  return jobSkills.filter((skill) => {
    const normalizedSkill = skill.toLowerCase();
    return userSkillNames.some(
      (userSkill) =>
        userSkill.includes(normalizedSkill) ||
        normalizedSkill.includes(userSkill)
    );
  });
}

function getMissingSkills(jobSkills: string[], userSkills: Skill[]): string[] {
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
  return jobSkills.filter((skill) => {
    const normalizedSkill = skill.toLowerCase();
    return !userSkillNames.some(
      (userSkill) =>
        userSkill.includes(normalizedSkill) ||
        normalizedSkill.includes(userSkill)
    );
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// SKILL GAP ANALYSIS
// ============================================

export function identifySkillGaps(
  requiredSkills: string[],
  userSkills: Skill[]
): { critical: string[]; recommended: string[] } {
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());

  const missingSkills = requiredSkills.filter((skill) => {
    const normalizedSkill = skill.toLowerCase();
    return !userSkillNames.some(
      (userSkill) =>
        userSkill.includes(normalizedSkill) ||
        normalizedSkill.includes(userSkill)
    );
  });

  // First 3 missing skills are critical, rest are recommended
  return {
    critical: missingSkills.slice(0, 3),
    recommended: missingSkills.slice(3),
  };
}

// ============================================
// SCORE INTERPRETATION
// ============================================

export function interpretScore(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 85) {
    return {
      label: 'Excellent Match',
      color: 'green',
      description: 'This job is a great fit for your profile',
    };
  }
  if (score >= 70) {
    return {
      label: 'Good Match',
      color: 'blue',
      description: 'Strong alignment with your skills and preferences',
    };
  }
  if (score >= 55) {
    return {
      label: 'Moderate Match',
      color: 'yellow',
      description: 'Some alignment, but there are gaps to consider',
    };
  }
  return {
    label: 'Low Match',
    color: 'red',
    description: 'Significant gaps between this job and your profile',
  };
}
