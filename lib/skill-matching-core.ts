import type { Skill, WorkExperience } from '@/app/types';
import { MIN_SKILL_FRAGMENT_LENGTH, MIN_EXPERIENCE_MATCH_LENGTH } from './constants';

/**
 * Core skill matching utilities shared between client and server
 * Consolidates duplicate logic from skill-matcher.ts and job-filter-service.ts
 */

// ============================================
// SEMANTIC EQUIVALENCES
// ============================================

export const SKILL_EQUIVALENCES: Record<string, string[]> = {
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
  teamwork: ['travail en équipe', "esprit d'équipe", 'team spirit', 'collaboration'],
} as const;

// ============================================
// CORE UTILITIES
// ============================================

/**
 * Splits compound skills on separators: /, &, " et ", " and "
 * Returns array with original + fragments
 */
export function splitCompoundSkill(skill: string): string[] {
  const parts = skill.split(/[\/&]|\s+et\s+|\s+and\s+/gi)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
  const original = skill.toLowerCase();
  if (parts.length <= 1) return [original];
  return [original, ...parts];
}

/**
 * Builds searchable texts from user profile (skills + experience)
 */
export function buildProfileTexts(
  userSkills: Skill[],
  workExperience?: WorkExperience[]
): { skillNames: string[]; experienceTexts: string[] } {
  const skillNames = userSkills.map(s => s.name.toLowerCase());
  const experienceTexts: string[] = [];
  for (const exp of workExperience || []) {
    if (exp.title) experienceTexts.push(exp.title.toLowerCase());
    for (const achievement of exp.achievements || []) {
      experienceTexts.push(achievement.toLowerCase());
    }
  }
  return { skillNames, experienceTexts };
}

/**
 * Checks semantic similarity using cross-language equivalences
 */
export function checkSemanticSimilarity(skill: string, texts: string[]): boolean {
  for (const [key, aliases] of Object.entries(SKILL_EQUIVALENCES)) {
    const allTerms = [key, ...aliases];
    if (allTerms.some(term => skill.includes(term) || term.includes(skill))) {
      return texts.some(text => allTerms.some(term => text.includes(term)));
    }
  }
  return false;
}

/**
 * Checks if a skill fragment is matched in profile (boolean)
 * Used by client-side skill-matcher.ts
 */
export function isSkillFragmentMatched(
  fragment: string,
  skillNames: string[],
  experienceTexts: string[]
): boolean {
  if (fragment.length < MIN_SKILL_FRAGMENT_LENGTH) return false;

  // Exact match
  if (skillNames.includes(fragment)) return true;

  // Partial match against skills
  if (skillNames.some(s => s.includes(fragment) || fragment.includes(s))) return true;

  // Semantic match against skills
  if (checkSemanticSimilarity(fragment, skillNames)) return true;

  // Substring match against experience (requires longer fragment)
  if (fragment.length >= MIN_EXPERIENCE_MATCH_LENGTH && experienceTexts.some(t => t.includes(fragment))) return true;

  // Semantic match against experience
  if (checkSemanticSimilarity(fragment, experienceTexts)) return true;

  return false;
}
