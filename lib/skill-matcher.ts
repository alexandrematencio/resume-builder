import type { Skill, WorkExperience } from '@/app/types';
import { splitCompoundSkill, buildProfileTexts, isSkillFragmentMatched } from './skill-matching-core';

/**
 * Client-side skill matching utility.
 * Lightweight version of the server-side calculateSkillsMatch logic,
 * used in the New Application modal to compare user profile against
 * parsed job requirements without a server round-trip.
 */

function isSkillMatched(
  skill: string,
  skillNames: string[],
  experienceTexts: string[]
): boolean {
  const fragments = splitCompoundSkill(skill);
  for (const fragment of fragments) {
    if (isSkillFragmentMatched(fragment, skillNames, experienceTexts)) {
      return true;
    }
  }
  return false;
}

export function compareSkillsClient(
  userSkills: Skill[],
  workExperience: WorkExperience[],
  requiredSkills: string[]
): { matched: string[]; missing: string[]; matchPercent: number } {
  if (requiredSkills.length === 0) {
    return { matched: [], missing: [], matchPercent: 100 };
  }

  const { skillNames, experienceTexts } = buildProfileTexts(userSkills, workExperience);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of requiredSkills) {
    if (isSkillMatched(skill, skillNames, experienceTexts)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const matchPercent = Math.round((matched.length / requiredSkills.length) * 100);
  return { matched, missing, matchPercent };
}
