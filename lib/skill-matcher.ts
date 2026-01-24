import type { Skill, WorkExperience } from '@/app/types';

/**
 * Client-side skill matching utility.
 * Lightweight version of the server-side calculateSkillsMatch logic,
 * used in the New Application modal to compare user profile against
 * parsed job requirements without a server round-trip.
 */

function splitCompoundSkill(skill: string): string[] {
  const parts = skill.split(/[\/&]|\s+et\s+|\s+and\s+/gi)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);
  const original = skill.toLowerCase();
  if (parts.length <= 1) return [original];
  return [original, ...parts];
}

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

const EQUIVALENCES: Record<string, string[]> = {
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
  agile: ['scrum', 'kanban'],
  sql: ['mysql', 'postgresql', 'sqlite'],
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
  management: ['gestion', 'encadrement', 'supervision', 'responsable'],
  communication: ['relation client', 'customer relations', 'interpersonal'],
  teamwork: ['travail en équipe', "esprit d'équipe", 'team spirit', 'collaboration'],
};

function checkSemanticSimilarity(skill: string, texts: string[]): boolean {
  for (const [key, aliases] of Object.entries(EQUIVALENCES)) {
    const allTerms = [key, ...aliases];
    if (allTerms.some(term => skill.includes(term) || term.includes(skill))) {
      return texts.some((text) =>
        allTerms.some((term) => text.includes(term))
      );
    }
  }
  return false;
}

function isSkillMatched(
  skill: string,
  skillNames: string[],
  experienceTexts: string[]
): boolean {
  const fragments = splitCompoundSkill(skill);
  for (const fragment of fragments) {
    if (fragment.length < 2) continue;
    // Exact match
    if (skillNames.includes(fragment)) return true;
    // Partial match against skills
    if (skillNames.some(s => s.includes(fragment) || fragment.includes(s))) return true;
    // Semantic match against skills
    if (checkSemanticSimilarity(fragment, skillNames)) return true;
    // Substring match against experience
    if (fragment.length >= 4 && experienceTexts.some(t => t.includes(fragment))) return true;
    // Semantic match against experience
    if (checkSemanticSimilarity(fragment, experienceTexts)) return true;
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
