import type {
  JobOffer,
  JobPreferences,
  JobAnalysisResult,
  AIInsights,
  Skill,
  UserProfile,
  WorkExperience,
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
  } else if (rateType === 'monthly' && prefs.minSalary && job.salaryMax) {
    // Monthly salary → normalize to annual for comparison
    const annualizedMax = job.salaryMax * 12;
    if (annualizedMax < prefs.minSalary) {
      reasons.push(
        `Monthly salary below minimum (offered: ${formatCurrency(job.salaryMax, job.salaryCurrency || 'EUR')}/month = ${formatCurrency(annualizedMax, job.salaryCurrency || 'EUR')}/year, min required: ${formatCurrency(prefs.minSalary, prefs.salaryCurrency)}/year)`
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

// Split compound skills on separators: /, &, " et ", " and "
function splitCompoundSkill(skill: string): string[] {
  const parts = skill.split(/[\/&]|\s+et\s+|\s+and\s+/gi)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
  // Always include the original for exact matching
  const original = skill.toLowerCase();
  if (parts.length <= 1) return [original];
  return [original, ...parts];
}

// Build searchable texts from profile (skills + experience)
function buildProfileTexts(
  userSkills: Skill[],
  workExperience?: WorkExperience[]
): { skillNames: string[]; experienceTexts: string[] } {
  const skillNames = userSkills.map((s) => s.name.toLowerCase());
  const experienceTexts: string[] = [];
  for (const exp of workExperience || []) {
    if (exp.title) experienceTexts.push(exp.title.toLowerCase());
    for (const achievement of exp.achievements || []) {
      experienceTexts.push(achievement.toLowerCase());
    }
  }
  return { skillNames, experienceTexts };
}

export function calculateSkillsMatch(
  jobSkills: string[],
  userSkills: Skill[],
  workExperience?: WorkExperience[]
): number {
  if (jobSkills.length === 0) {
    return 100; // No requirements = perfect match
  }

  const { skillNames, experienceTexts } = buildProfileTexts(userSkills, workExperience);

  let matchCount = 0;
  for (const jobSkill of jobSkills) {
    const fragments = splitCompoundSkill(jobSkill);
    let bestWeight = 0;

    for (const fragment of fragments) {
      if (fragment.length < 2) continue;

      // 1. Exact match against skill names (100%)
      if (skillNames.includes(fragment)) {
        bestWeight = Math.max(bestWeight, 1.0);
        continue;
      }

      // 2. Partial match against skill names (80%)
      const partialSkillMatch = skillNames.some(
        (userSkill) =>
          userSkill.includes(fragment) ||
          fragment.includes(userSkill)
      );
      if (partialSkillMatch) {
        bestWeight = Math.max(bestWeight, 0.8);
        continue;
      }

      // 3. Semantic similarity against skill names (60%)
      if (checkSemanticSimilarity(fragment, skillNames)) {
        bestWeight = Math.max(bestWeight, 0.6);
        continue;
      }

      // 4. Match against experience texts (50% - reduced weight for sentence matching)
      if (fragment.length >= 4) {
        const expMatch = experienceTexts.some(
          (text) => text.includes(fragment)
        );
        if (expMatch) {
          bestWeight = Math.max(bestWeight, 0.5);
          continue;
        }
      }

      // 5. Semantic similarity against experience texts (40%)
      if (checkSemanticSimilarity(fragment, experienceTexts)) {
        bestWeight = Math.max(bestWeight, 0.4);
      }
    }

    matchCount += bestWeight;
  }

  return Math.round((matchCount / jobSkills.length) * 100);
}

// Semantic similarity check with cross-language equivalences
function checkSemanticSimilarity(skill: string, texts: string[]): boolean {
  const equivalences: Record<string, string[]> = {
    // Tech
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
    // Hospitality / Service (FR ↔ EN)
    barman: ['bartender', 'mixologue', 'mixologist', 'bar service', 'service au bar', 'service de bar'],
    serveur: ['server', 'waiter', 'waitress', 'service en salle', 'table service'],
    caisse: ['cashier', 'encaissement', 'cash handling', 'caissier', 'tenue de caisse'],
    cocktails: ['mixologie', 'cocktail preparation', 'préparation de cocktails', 'préparation de boissons'],
    accueil: ['reception', 'customer welcome', 'accueil des clients', 'greeting'],
    vente: ['sales', 'selling', 'commercial'],
    cuisine: ['cooking', 'chef', 'cuisinier', 'préparation culinaire'],
    nettoyage: ['cleaning', 'entretien', 'housekeeping', 'hygiène'],
    commande: ['order', 'prise de commande', 'order taking', 'préparation de commande'],
    stock: ['inventory', 'gestion des stocks', 'stock management', 'approvisionnement'],
    // General (FR ↔ EN)
    management: ['gestion', 'encadrement', 'supervision', 'responsable'],
    communication: ['relation client', 'customer relations', 'interpersonal'],
    teamwork: ['travail en équipe', 'esprit d\'équipe', 'team spirit', 'collaboration'],
  };

  for (const [key, aliases] of Object.entries(equivalences)) {
    const allTerms = [key, ...aliases];
    if (allTerms.some(term => skill.includes(term) || term.includes(skill))) {
      return texts.some((text) =>
        allTerms.some((term) => text.includes(term))
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
// RED FLAG DISMISSAL RECALCULATION
// ============================================

export function recalculateWithDismissals(
  baseScore: number,
  redFlags: string[],
  dismissedFlags: string[],
  salaryBelowMin: boolean
): number {
  let bonus = 0;

  for (const flag of dismissedFlags) {
    if (!redFlags.includes(flag)) continue;

    const lower = flag.toLowerCase();
    if (lower.includes('salary') || lower.includes('salaire') || lower.includes('income') || lower.includes('rémunération') || lower.includes('reduction')) {
      // Salary-related: restore salary component from 50% to 100%
      if (salaryBelowMin) bonus += 15;
    } else if (lower.includes('skill') || lower.includes('compétence') || lower.includes('gap') || lower.includes('experience') || lower.includes('expérience')) {
      bonus += 5;
    } else if (lower.includes('career') || lower.includes('carrière') || lower.includes('change') || lower.includes('transition')) {
      bonus += 5;
    } else {
      bonus += 3;
    }
  }

  return Math.min(100, baseScore + bonus);
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
  const skillsMatchPercent = calculateSkillsMatch(jobSkills, userProfile.skills, userProfile.workExperience);

  // Step 3: Calculate perks match
  const perksMatchCount = calculatePerksMatch(job.perks || [], preferences.preferredPerks);

  // Step 4: Calculate overall score
  const hasSalaryInfo = job.salaryMin != null || job.salaryMax != null;
  const effectiveMax = job.salaryMax != null && job.salaryRateType === 'monthly'
    ? job.salaryMax * 12
    : job.salaryMax;
  const meetsMinSalary = !preferences.minSalary ||
    (effectiveMax != null && effectiveMax >= preferences.minSalary);

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
    matchedSkills: getMatchedSkills(jobSkills, userProfile.skills, userProfile.workExperience),
    missingSkills: getMissingSkills(jobSkills, userProfile.skills, userProfile.workExperience),
  };

  const aiInsights = await generateInsights(job, userProfile, matchData);

  return {
    isBlocked: blockerResult.blocked,
    blockReasons: blockerResult.reasons,
    skillsMatchPercent,
    perksMatchCount,
    overallScore,
    aiInsights,
    matchedSkills: matchData.matchedSkills,
    missingSkills: matchData.missingSkills,
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

function getMatchedSkills(jobSkills: string[], userSkills: Skill[], workExperience?: WorkExperience[]): string[] {
  const { skillNames, experienceTexts } = buildProfileTexts(userSkills, workExperience);
  const allTexts = [...skillNames, ...experienceTexts];
  return jobSkills.filter((skill) => {
    const fragments = splitCompoundSkill(skill);
    return fragments.some(fragment =>
      fragment.length >= 2 && allTexts.some(text => text.includes(fragment) || fragment.includes(text))
    );
  });
}

function getMissingSkills(jobSkills: string[], userSkills: Skill[], workExperience?: WorkExperience[]): string[] {
  const matched = getMatchedSkills(jobSkills, userSkills, workExperience);
  return jobSkills.filter(skill => !matched.includes(skill));
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
