'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, User, LogOut, ChevronDown, Edit2, Send, Calendar, Star, Ban, Trash2, FileText, Target, Clock, Bell, Copy, CalendarPlus, ExternalLink, CheckCircle, X, HelpCircle, MapPin, Menu, Activity } from 'lucide-react';
import Button from '@/app/components/Button';
import { SkeletonList } from '@/app/components/SkeletonCard';
import { SkeletonStatsGrid } from '@/app/components/SkeletonStatCard';
import { ToastContainer } from '@/app/components/Toast';
import NewApplicationModal from '@/app/components/NewApplicationModal';
import CVDetailModal from '@/app/components/CVDetailModal';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { useAuth } from '@/app/contexts/AuthContext';
import { useProfile } from '@/app/contexts/ProfileContext';
import { JobIntelligenceProvider } from '@/app/contexts/JobIntelligenceContext';
import {
  Template,
  Application,
  ApplicationStatus,
  CVVersion,
  Toast as ToastType,
  DashboardStats,
  SentVia,
  InterviewInfo,
  ParsedJobContext,
} from '@/app/types';
import {
  loadApplications,
  loadTemplates,
  saveAllApplications,
  saveAllTemplates,
  deleteApplication as deleteAppFromDb,
  deleteCVVersion,
  deleteCoverLetter as deleteCoverLetterFromDb,
  migrateFromLocalStorage,
} from '@/lib/supabase-db';
import { getJobOffersStats } from '@/lib/job-intelligence-db';

export default function JobHunterPro() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, isComplete: profileComplete } = useProfile();
  const [applications, setApplications] = useState<Application[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
  
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);

  // Post-interview result flow
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [confirmDeclineId, setConfirmDeclineId] = useState<string | null>(null);
  const declineTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interview modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewAppId, setInterviewAppId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [isEditingInterview, setIsEditingInterview] = useState(false);


  // Saved job offers count for Matching badge
  const [savedJobsCount, setSavedJobsCount] = useState(0);

  // Data loading state
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Load saved jobs count for badge
    getJobOffersStats().then(stats => {
      setSavedJobsCount(stats.byStatus?.saved || 0);
    }).catch(() => {});
  }, []);

  // Close user menu and mobile nav when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setShowMobileNav(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-fill interview modal when opening
  useEffect(() => {
    if (showInterviewModal && interviewAppId) {
      const app = applications.find(a => a.id === interviewAppId);
      if (app?.tracking.interviewScheduled) {
        const interview = app.tracking.interviewScheduled;
        setInterviewDate(new Date(interview.date).toISOString().split('T')[0]);
        setInterviewTime(new Date(interview.date).toTimeString().slice(0, 5));
        setInterviewLocation(interview.location || '');
      } else {
        // Reset form for new interview
        setInterviewDate('');
        setInterviewTime('');
        setInterviewLocation('');
      }
    }
  }, [showInterviewModal, interviewAppId, applications]);

  // Cleanup decline timer on unmount
  useEffect(() => {
    return () => {
      if (declineTimerRef.current) {
        clearTimeout(declineTimerRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    try {
      // First, try to migrate from localStorage if needed
      await migrateFromLocalStorage();

      // Load from Supabase
      const [apps, temps] = await Promise.all([
        loadApplications(),
        loadTemplates(),
      ]);

      setApplications(apps);
      setTemplates(temps);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const saveApplications = async (apps: Application[]) => {
    try {
      setApplications(apps);
      // Save to Supabase in background
      await saveAllApplications(apps);
    } catch (error) {
      console.error('Failed to save:', error);
      addToast('error', 'Failed to save');
    }
  };

  const saveTemplates = async (temps: Template[]) => {
    try {
      setTemplates(temps);
      // Save to Supabase in background
      await saveAllTemplates(temps);
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  };

  const addToast = (type: ToastType['type'], message: string) => {
    const toast: ToastType = {
      id: Date.now().toString(),
      type,
      message,
    };
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const generateCVFromScratch = async (
    jobDescription: string,
    cvData: any,
    parsedJobContext?: ParsedJobContext
  ): Promise<string> => {
    // Parse name into firstName/lastName
    const nameParts = cvData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

    const prompt = `You are an expert resume writer with 15+ years of experience. Create a professional, ATS-optimized resume tailored for this job.

CANDIDATE INFORMATION:
Name: ${cvData.name}
Email: ${cvData.email}
Phone: ${cvData.phone}
Location: ${cvData.address}
${cvData.age ? `Age: ${cvData.age}` : ''}
${cvData.languages ? `Languages: ${cvData.languages}` : ''}
${cvData.portfolio ? `Portfolio: ${cvData.portfolio}` : ''}

PROFESSIONAL SUMMARY:
${cvData.summary || 'Create a compelling 3-4 sentence professional summary'}

WORK EXPERIENCE:
${cvData.experience}

SKILLS:
${cvData.skills}

EDUCATION:
${cvData.education}

${cvData.projects ? `KEY PROJECTS:\n${cvData.projects}` : ''}

TARGET JOB DESCRIPTION:
${jobDescription}
${parsedJobContext ? `
AI-PARSED JOB REQUIREMENTS:
- Required Skills: ${parsedJobContext.requiredSkills.join(', ')}
- Nice-to-Have Skills: ${parsedJobContext.niceToHaveSkills.join(', ')}
- Your Matched Skills: ${parsedJobContext.matchedSkills.join(', ')}
- Missing Skills to Address: ${parsedJobContext.missingSkills.join(', ')}

TAILORING INSTRUCTIONS:
- Prioritize experiences demonstrating the REQUIRED skills listed above
- In the skills section, list matched required skills FIRST
- Mirror the job posting's language in the professional summary
- For matched skills found in experience, highlight them explicitly in achievements
- Do NOT fabricate skills the candidate doesn't have
` : ''}
CRITICAL INSTRUCTIONS:
You MUST respond with ONLY valid JSON matching this exact structure (no markdown, no code blocks, just raw JSON):

{
  "personalInfo": {
    "name": "${cvData.name}",
    "firstName": "${firstName}",
    "lastName": "${lastName}",
    "age": ${cvData.age || 'null'},
    "languages": ${cvData.languages ? `"${cvData.languages}"` : 'null'},
    "address": "${cvData.address}",
    "email": "${cvData.email}",
    "phone": "${cvData.phone}",
    "portfolio": ${cvData.portfolio ? `"${cvData.portfolio}"` : 'null'},
    "photo": null
  },
  "profile": {
    "text": "3-4 sentences tailored professional summary highlighting most relevant experience for THIS role",
    "availability": "Disponible immédiatement" or similar
  },
  "skills": {
    "technical": ["Skill1", "Skill2", "Skill3"],
    "marketing": ["Skill1", "Skill2"],
    "soft": []
  },
  "experiences": [
    {
      "id": "1",
      "company": "COMPANY NAME",
      "jobTitle": "Job Title",
      "period": "Mon YYYY - Mon YYYY",
      "industry": "Industry/sector",
      "achievements": [
        "Achievement 1 with metrics • Key result",
        "Achievement 2 with numbers • Impact delivered"
      ]
    }
  ],
  "projects": [
    {
      "id": "1",
      "name": "Project Name",
      "description": "Brief description with impact metrics"
    }
  ],
  "education": [
    {
      "id": "1",
      "institution": "INSTITUTION NAME",
      "years": "YYYY - YYYY",
      "degree": "Degree Name",
      "specialization": "Field of study"
    }
  ]
}

REQUIREMENTS:
- Extract 4-6 experiences from work history (reverse chronological)
- 2 achievement bullets per experience (focused, metrics-driven)
- Skills: categorize into technical/marketing/soft based on candidate's background
- Projects: extract 2-3 key projects if mentioned, otherwise create based on impressive work achievements
- Education: extract all degrees mentioned
- IMPORTANT: Return ONLY the JSON object, no other text, no markdown formatting`;

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      // The API returns { resume: "..." }, extract and parse JSON
      const cvJson = data.resume;

      // Clean up response if it contains markdown code blocks
      let cleanedJson = cvJson.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Validate it's valid JSON
      JSON.parse(cleanedJson);

      return cleanedJson;
    } catch (error) {
      console.error('CV generation failed:', error);
      throw error;
    }
  };

  const generateCVFromTemplate = async (
    jobDescription: string,
    template: Template,
    company: string,
    role: string,
    parsedJobContext?: ParsedJobContext
  ): Promise<string> => {
    const prompt = `You are an expert resume writer specializing in job application optimization. Create a highly targeted, ATS-friendly resume for this specific job opportunity.

TARGET POSITION:
Company: ${company}
Role: ${role}

JOB DESCRIPTION:
${jobDescription}
${parsedJobContext ? `
AI-PARSED JOB REQUIREMENTS:
- Required Skills: ${parsedJobContext.requiredSkills.join(', ')}
- Nice-to-Have Skills: ${parsedJobContext.niceToHaveSkills.join(', ')}
- Your Matched Skills: ${parsedJobContext.matchedSkills.join(', ')}
- Missing Skills to Address: ${parsedJobContext.missingSkills.join(', ')}

TAILORING PRIORITY:
- Prioritize experiences demonstrating the REQUIRED skills listed above
- In the skills section, list matched required skills FIRST
- Mirror the job posting's language in the professional summary
- For matched skills found in experience, highlight them explicitly in bullet points
- Do NOT fabricate skills the candidate doesn't have
` : ''}
CANDIDATE PROFILE (use as foundation):
Name: ${template.content.personalInfo.name}
Email: ${template.content.personalInfo.email}
Phone: ${template.content.personalInfo.phone}
Location: ${template.content.personalInfo.address}

Professional Summary:
${template.content.summary}

Work Experience:
${template.content.experience}

Education:
${template.content.education}

Skills:
${template.content.skills}

CRITICAL INSTRUCTIONS:
1. STRUCTURE: Use markdown headers (##) for main sections: Professional Summary, Work Experience, Education, Skills
2. PROFESSIONAL SUMMARY:
   - Rewrite the summary to align perfectly with the target role at ${company}
   - Keep it to 3-4 impactful sentences
   - Mirror language from the job description while remaining authentic
3. WORK EXPERIENCE:
   - Maintain chronological order and factual accuracy from template
   - Format: **Job Title** at **Company Name** | *Start Date - End Date*
   - Reframe bullet points to emphasize skills/experience matching the job description
   - Use strong action verbs: Spearheaded, Architected, Delivered, Transformed, Orchestrated, Drove
   - Add metrics and quantifiable results wherever possible (%, $, numbers, time)
   - Prioritize most relevant achievements for THIS role
   - 3-5 bullets per position, focusing on transferable skills
4. SKILLS SECTION:
   - Extract and prioritize skills from template that match job requirements
   - Add any missing skills from job description that candidate likely possesses based on experience
   - Format as comma-separated list (NOT bullets)
   - Group by category if helpful (e.g., "Technical Skills:", "Languages:", "Tools:")
5. EDUCATION: Keep factual, include degree, field, institution, year
6. KEYWORDS: Naturally integrate 10-15 keywords from job description throughout the resume
7. TONE: Confident, results-driven, professional - show expertise without arrogance
8. ATS OPTIMIZATION:
   - Use standard section names
   - Avoid graphics, tables, or complex formatting
   - Use industry-standard job titles when possible
9. DO NOT:
   - Fabricate experience or skills not in the template
   - Use first-person pronouns (I, me, my)
   - Include irrelevant sections (hobbies, references, headshot)
   - Create "Projects" section unless genuinely relevant to the role
10. LENGTH: Aim for 1 page equivalent (400-500 words) - be concise and impactful

OUTPUT: Clean, professional resume in markdown format that will pass ATS screening and impress human recruiters.`;

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.resume;
    } catch (error) {
      console.error('CV generation failed:', error);
      throw error;
    }
  };

  const generateCoverLetter = async (
    application: Application,
    style: import('./types').CoverLetterStyle,
    recipientInfo: import('./types').RecipientInfo,
    availabilityDate?: string
  ): Promise<string> => {
    const cvContent = application.cvVersions[0].content; // Use main CV

    // System context - Expert persona with strict quality requirements
    const systemContext = `Tu es l'un des meilleurs experts RH au monde avec 40 ans d'expérience dans le recrutement et le développement de carrière. Tu as aidé des milliers de candidats à décrocher des postes dans les entreprises les plus prestigieuses (Google, Apple, McKinsey, LVMH, etc.).

TON RÔLE: Créer des lettres de motivation d'une qualité EXCEPTIONNELLE, personnalisées et impactantes - jamais génériques, jamais superficielles, jamais exagérées.

INTERDICTIONS ABSOLUES - RESPECT STRICT EXIGÉ:
❌ NE JAMAIS inclure d'adresse postale (ni "139 Blvd...", ni "Rue...", AUCUNE adresse)
❌ NE JAMAIS inclure de numéro de téléphone (ni "06...", ni "+33...", AUCUN numéro)
❌ NE JAMAIS inclure de portfolio/website (ni "www.", ni "instagram", ni "http", RIEN)
❌ NE JAMAIS inclure de date (ni "Le 15 janvier", ni "19/01/2026", AUCUNE date)
❌ NE JAMAIS inventer d'expériences ou compétences absentes du CV
❌ NE JAMAIS utiliser de formulations vagues ou génériques ("dynamique", "motivé" sans preuve concrète)
❌ NE JAMAIS exagérer - rester authentique et crédible

FORMAT DE SORTIE OBLIGATOIRE - AUCUNE DÉVIATION ACCEPTÉE:
Tu génères EXACTEMENT et UNIQUEMENT ce format (pas une ligne de plus, pas une ligne de moins):

[Ligne 1] NOM COMPLET du candidat (extrait du CV)
[Ligne 2] Email du candidat
[Ligne 3] LIGNE VIDE
[Ligne 4] Objet: [titre précis et professionnel]
[Ligne 5] LIGNE VIDE
[Ligne 6] Formule d'appel
[Ligne 7] LIGNE VIDE
[Lignes 8+] Corps de la lettre (paragraphes bien structurés)
[Ligne N] LIGNE VIDE
[Ligne N+1] Formule de politesse
[Ligne N+2] LIGNE VIDE
[Ligne N+3] Nom complet du candidat (signature)

VÉRIFICATION FINALE AVANT SOUMISSION:
- ✋ STOP: As-tu inclus une adresse postale? SI OUI → SUPPRIME-LA IMMÉDIATEMENT
- ✋ STOP: As-tu inclus un numéro de téléphone? SI OUI → SUPPRIME-LE IMMÉDIATEMENT
- ✋ STOP: As-tu inclus un portfolio/site web? SI OUI → SUPPRIME-LE IMMÉDIATEMENT
- ✋ STOP: As-tu inclus une date dans l'en-tête? SI OUI → SUPPRIME-LA IMMÉDIATEMENT
- ✋ STOP: L'en-tête contient-il UNIQUEMENT nom + email? SI NON → CORRIGE IMMÉDIATEMENT

PROCESSUS DE GÉNÉRATION AVEC AUTO-CRITIQUE:
Avant de soumettre ta lettre, tu DOIS:
1. ✓ Vérifier que TOUTES les informations proviennent du CV fourni (zéro invention)
2. ✓ T'assurer que la qualité est EXCEPTIONNELLE (pas juste "bonne" - vise l'excellence)
3. ✓ Confirmer que le ton est approprié, authentique et professionnel
4. ✓ Vérifier que les réalisations sont concrètes avec impact mesurable (chiffres, résultats)
5. ✓ Éliminer tout langage générique, cliché ou vide de sens
6. ✓ Vérifier qu'aucune adresse ou date n'a été inventée
7. ✓ Si quelque chose ne respecte pas ces critères: AMÉLIORE immédiatement avant de soumettre

RAPPEL CRITIQUE: L'utilisateur compte sur toi pour créer une lettre qui le démarquera vraiment. Ne le déçois pas avec du contenu générique ou approximatif.`;

    // Style-specific prompts
    const stylePrompts = {
      french_formal: `${systemContext}

STYLE DEMANDÉ: Français traditionnel - très formel, respectueux des codes RH français

STRUCTURE OBLIGATOIRE:
- En-tête minimal: Nom + Email uniquement
- Objet: Candidature au poste de ${application.role}
- Formule d'appel: "Madame, Monsieur," ou "${recipientInfo.recipientName ? `${recipientInfo.recipientTitle || 'Madame/Monsieur'} ${recipientInfo.recipientName},` : 'Madame, Monsieur,'}"
- 3 paragraphes structurés avec impact réel
- Formule de politesse française complète: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
- Signature: Nom complet uniquement

CONTENU (qualité exceptionnelle requise):
§1 - Présentation ciblée: Pourquoi ce poste précis chez ${recipientInfo.companyName} (avec recherche réelle sur l'entreprise)
§2 - Preuves de valeur: 2-3 réalisations concrètes du CV avec résultats mesurables
§3 - Disponibilité et proposition d'échange professionnel

TONALITÉ: Sobre, respectueuse, professionnelle, mais avec substance - éviter le vide marketing`,

      french_modern: `${systemContext}

STYLE DEMANDÉ: Français moderne - professionnel, dynamique, authentique

STRUCTURE:
- En-tête minimal: Nom + Email uniquement
- Objet: Candidature au poste de ${application.role}
- Formule d'appel: "${recipientInfo.recipientName ? `Bonjour ${recipientInfo.recipientName},` : 'Bonjour,'}"
- 3-4 paragraphes courts et impactants
- Formule de politesse moderne: "Cordialement," ou "Dans l'attente de vous rencontrer, cordialement,"
- Signature: Nom complet uniquement

CONTENU (qualité exceptionnelle requise):
§1 - Accroche impactante: Pourquoi ce poste chez ${recipientInfo.companyName} (spécifique, pas générique)
§2 - Valeur ajoutée concrète: 2-3 réalisations CHIFFRÉES du CV avec impact mesurable
§3 - Adéquation culturelle authentique (basée sur recherche réelle de l'entreprise)
§4 (optionnel) - Call-to-action professionnel et engageant

TONALITÉ: Dynamique, authentique, orientée résultats, personnalité tout en restant professionnel`,

      american_standard: `${systemContext}

STYLE REQUESTED: Professional American business correspondence

STRUCTURE:
- Minimal header: Name + Email only
- Subject line: Application for ${application.role} position
- Salutation: "${recipientInfo.recipientName ? `Dear ${recipientInfo.recipientTitle || 'Hiring Manager'} ${recipientInfo.recipientName}` : 'Dear Hiring Manager'},"
- 3-4 concise, impactful paragraphs
- Closing: "Sincerely," or "Best regards,"
- Signature: Full name only

CONTENT (exceptional quality required):
§1 - Strong opening: Specific enthusiasm for the ${application.role} position at ${recipientInfo.companyName} (not generic)
§2 - Proven value: 2-3 specific achievements from resume with MEASURABLE metrics
§3 - Cultural alignment: Authentic connection to ${recipientInfo.companyName}'s mission (based on real research)
§4 - Professional call to action: Express genuine interest in contributing

TONE: Confident, results-oriented, enthusiastic yet professional, focus on value delivery to the company`,

      american_creative: `${systemContext}

STYLE REQUESTED: Creative American - bold yet professional, personality-driven

STRUCTURE:
- Modern minimal header: Name + Email only
- Engaging salutation: "${recipientInfo.recipientName ? `Hi ${recipientInfo.recipientName}` : 'Hi there'}," or "Dear ${recipientInfo.companyName} team,"
- 3-4 short, punchy paragraphs with impact
- Creative yet professional closing: "Excited to connect," "Looking forward to creating together," or similar
- Signature: Full name only

CONTENT (exceptional quality required):
§1 - Compelling hook: Start with authentic story, insight, or statement about ${recipientInfo.companyName} (no fluff)
§2 - Unique differentiation: What makes candidate stand out + 1-2 standout achievements with measurable impact
§3 - Genuine passion: Real connection to ${recipientInfo.companyName}'s mission/product (backed by research)
§4 - Forward-thinking CTA: Invite meaningful conversation about future possibilities

TONE: Authentic, energetic, conversational yet professional, confident use of "I", avoid corporate clichés and jargon`
    };

    const prompt = `${stylePrompts[style]}

INFORMATIONS DESTINATAIRE:
Entreprise: ${recipientInfo.companyName}
${recipientInfo.recipientName ? `Destinataire: ${recipientInfo.recipientTitle || ''} ${recipientInfo.recipientName}` : ''}

POSTE VISÉ: ${application.role}

${availabilityDate ? `DATE DE DISPONIBILITÉ FOURNIE: ${new Date(availabilityDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}\nTu DOIS mentionner cette date de disponibilité dans le corps de la lettre de manière naturelle.\n` : 'AUCUNE date de disponibilité fournie - N\'en invente PAS.\n'}

DESCRIPTION DU POSTE:
${application.jobDescription}

CV DU CANDIDAT (SOURCE UNIQUE ET OBLIGATOIRE d'informations):
${cvContent}

INSTRUCTIONS FINALES CRITIQUES:
1. ✅ EN-TÊTE: STRICTEMENT nom complet + email (RIEN D'AUTRE - pas d'adresse, pas de téléphone, pas de portfolio, pas de date)
2. ✅ ZÉRO INVENTION: Utilise UNIQUEMENT les informations du CV fourni
3. ✅ QUALITÉ EXCEPTIONNELLE: Personnalisation profonde pour ${recipientInfo.companyName} et ${application.role}
4. ✅ PREUVES CONCRÈTES: Réalisations avec chiffres et impact mesurable (du CV)
5. ✅ LONGUEUR: ${style.startsWith('french') ? '250-350 mots' : '200-300 words'} - concis et percutant
6. ✅ FORMATAGE: Texte pur (JAMAIS d'astérisques ** ou markdown)
7. ✅ AUTO-RÉVISION: Vérifie ta génération AVANT de soumettre et améliore si nécessaire
8. ✅ AUTHENTICITÉ: Évite les clichés, le marketing vide, les exagérations

⚠️ DERNIÈRE VÉRIFICATION AVANT SOUMISSION - CHECKLIST OBLIGATOIRE:
□ L'en-tête contient UNIQUEMENT le nom et l'email (2 lignes seulement)?
□ Il n'y a AUCUNE adresse postale nulle part dans l'en-tête?
□ Il n'y a AUCUN numéro de téléphone nulle part dans l'en-tête?
□ Il n'y a AUCUN portfolio/website nulle part dans l'en-tête?
□ Il n'y a AUCUNE date dans l'en-tête (avant "Objet:")?
□ La première ligne de contenu est bien "Objet:" (après nom, email, ligne vide)?
□ La qualité est VRAIMENT exceptionnelle (pas juste "correcte")?
□ Les réalisations sont concrètes et mesurables?

Si UNE SEULE case n'est pas cochée: CORRIGE IMMÉDIATEMENT avant de soumettre.

Génère maintenant la lettre de motivation en respectant STRICTEMENT le format:`;



    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.coverLetter;
    } catch (error) {
      console.error('Cover letter generation failed:', error);
      throw error;
    }
  };

  const createApplication = async (data: {
    company: string;
    role: string;
    jobDescription: string;
    jobUrl?: string;
    cvData?: any;
    useExistingTemplate: boolean;
    selectedTemplateId?: string;
    parsedJobContext?: ParsedJobContext;
  }) => {
    setGeneratingCV(true);
    
    try {
      let cvContent: string;
      let usedTemplateId: string | undefined;

      if (data.useExistingTemplate && data.selectedTemplateId) {
        const template = templates.find(t => t.id === data.selectedTemplateId);
        if (!template) throw new Error('Template not found');
        
        cvContent = await generateCVFromTemplate(
          data.jobDescription,
          template,
          data.company,
          data.role,
          data.parsedJobContext
        );
        usedTemplateId = template.id;
        
        const updatedTemplates = templates.map(t => 
          t.id === template.id 
            ? { ...t, usageCount: t.usageCount + 1 }
            : t
        );
        saveTemplates(updatedTemplates);
      } else {
        cvContent = await generateCVFromScratch(data.jobDescription, data.cvData, data.parsedJobContext);
      }

      const firstCV: CVVersion = {
        id: `cv-${Date.now()}`,
        version: 1,
        content: cvContent,
        generatedBy: 'ai',
        createdAt: Date.now(),
      };

      const newApp: Application = {
        id: `app-${Date.now()}`,
        company: data.company,
        role: data.role,
        jobDescription: data.jobDescription,
        jobUrl: data.jobUrl,
        selectedTemplateId: usedTemplateId,
        cvVersions: [firstCV],
        coverLetters: [],
        status: 'draft',
        statusHistory: [
          {
            status: 'draft',
            timestamp: Date.now(),
            note: 'Application created',
          },
        ],
        tracking: {
          followUpDates: [],
        },
        createdAt: Date.now(),
        notes: '',
        tags: [],
        isFavorite: false,
      };

      const updatedApps = [newApp, ...applications];
      saveApplications(updatedApps);
      setShowNewAppModal(false);
      setSelectedApp(newApp);

      addToast('success', `CV created for ${data.company}`);
    } catch (error) {
      addToast('error', 'Failed to generate CV. Please try again.');
    } finally {
      setGeneratingCV(false);
    }
  };

  const markAsSent = (appId: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: 'waiting' as ApplicationStatus,
          statusHistory: [
            ...app.statusHistory,
            {
              status: 'sent' as ApplicationStatus,
              timestamp: Date.now(),
            },
            {
              status: 'waiting' as ApplicationStatus,
              timestamp: Date.now(),
            },
          ],
          tracking: {
            ...app.tracking,
            sentDate: Date.now(),
            sentVia: 'indeed' as SentVia, // Default, can be changed later
          },
          appliedAt: Date.now(),
        };
      }
      return app;
    });

    saveApplications(updatedApps);
    addToast('success', 'Application marked as sent');
  };

  const markAsRejected = (appId: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: 'rejected' as ApplicationStatus,
          statusHistory: [
            ...app.statusHistory,
            {
              status: 'rejected' as ApplicationStatus,
              timestamp: Date.now(),
            },
          ],
        };
      }
      return app;
    });

    saveApplications(updatedApps);
    addToast('info', 'Application marked as rejected');
  };

  const markAsClosed = (appId: string, reason: import('./types').ClosedReason) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status: 'closed' as ApplicationStatus,
          statusHistory: [
            ...app.statusHistory,
            {
              status: 'closed' as ApplicationStatus,
              timestamp: Date.now(),
              note: `Closed: ${reason}`,
            },
          ],
          tracking: {
            ...app.tracking,
            closedReason: reason,
            closedDate: Date.now(),
          },
        };
      }
      return app;
    });

    saveApplications(updatedApps);

    if (reason === 'accepted') {
      addToast('success', 'Offer accepted');
    } else if (reason === 'declined') {
      addToast('info', 'Offer declined');
    } else if (reason === 'expired') {
      addToast('info', 'Application marked as expired');
    }
  };

  const toggleOffer = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        // Toggle: if already offer, revert to interview or waiting based on history
        if (a.status === 'offer') {
          // Find the previous status from history (before offer)
          const previousStatus = a.statusHistory.length >= 2
            ? a.statusHistory[a.statusHistory.length - 2].status
            : 'waiting' as ApplicationStatus;

          return {
            ...a,
            status: previousStatus,
            statusHistory: [
              ...a.statusHistory,
              {
                status: previousStatus,
                timestamp: Date.now(),
                note: 'Offer status removed',
              },
            ],
          };
        } else {
          // Set as offer
          return {
            ...a,
            status: 'offer' as ApplicationStatus,
            statusHistory: [
              ...a.statusHistory,
              {
                status: 'offer' as ApplicationStatus,
                timestamp: Date.now(),
                note: 'Offer received',
              },
            ],
          };
        }
      }
      return a;
    });

    saveApplications(updatedApps);

    if (app.status === 'offer') {
      addToast('info', 'Offer status removed');
    } else {
      addToast('success', 'Offer received');
    }
  };

  const saveInterviewDetails = () => {
    if (!interviewAppId || !interviewDate || !interviewTime) return;

    const dateTime = new Date(`${interviewDate}T${interviewTime}`).getTime();

    const updatedApps = applications.map(app => {
      if (app.id === interviewAppId) {
        return {
          ...app,
          status: 'interview' as ApplicationStatus,
          tracking: {
            ...app.tracking,
            interviewScheduled: {
              date: dateTime,
              type: 'video' as const,
              location: interviewLocation,
            },
          },
        };
      }
      return app;
    });

    saveApplications(updatedApps);
    closeInterviewModal();
    setInterviewAppId(null);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewLocation('');
    addToast('success', 'Interview scheduled!');
  };

  const closeInterviewModal = () => {
    setShowInterviewModal(false);
    setIsEditingInterview(false);
  };

  const addToCalendar = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app || !app.tracking.interviewScheduled) return;

    const interview = app.tracking.interviewScheduled;
    const startDate = new Date(interview.date);
    const endDate = new Date(interview.date + 60 * 60 * 1000); // +1 hour

    // Format dates for iCalendar (YYYYMMDDTHHmmss)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Res Buildr//Interview//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `UID:interview-${app.id}@resbuildr.com`,
      `SUMMARY:Interview - ${app.role} at ${app.company}`,
      `DESCRIPTION:Interview for the position of ${app.role} at ${app.company}`,
      interview.location ? `LOCATION:${interview.location.replace(/,/g, '\\,')}` : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'DESCRIPTION:Interview reminder',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    // Create download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Interview_${app.company}_${app.role}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    addToast('success', 'Calendar event downloaded');
  };

  const deleteInterview = (appId: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        // Remove interview scheduled and potentially revert status
        const newTracking = { ...app.tracking };
        delete newTracking.interviewScheduled;

        // If status is 'interview', revert to 'waiting'
        const newStatus = app.status === 'interview' ? 'waiting' as ApplicationStatus : app.status;

        return {
          ...app,
          tracking: newTracking,
          status: newStatus,
          statusHistory: [
            ...app.statusHistory,
            {
              status: newStatus,
              timestamp: Date.now(),
              note: 'Interview cancelled',
            },
          ],
        };
      }
      return app;
    });

    saveApplications(updatedApps);
    setShowInterviewModal(false);
    setInterviewAppId(null);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewLocation('');
    addToast('info', 'Interview deleted');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Copied to clipboard!');
  };

  const setMainVersion = (appId: string, cvId: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        // Reorder versions: put selected version first (first = main)
        const selectedVersion = app.cvVersions.find(cv => cv.id === cvId);
        const otherVersions = app.cvVersions.filter(cv => cv.id !== cvId);
        
        if (selectedVersion) {
          return {
            ...app,
            cvVersions: [selectedVersion, ...otherVersions]
          };
        }
      }
      return app;
    });
    
    saveApplications(updatedApps);
    setApplications(updatedApps); // Force immediate state update
    
    // Force selectedApp update with new object reference
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp({ ...updatedApp }); // Create new object reference
      }
    }
    
    addToast('success', 'Main version updated!');
  };

  const downloadCV = (cv: CVVersion, app: Application) => {
    const element = document.createElement('a');
    const file = new Blob([cv.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${app.company}_${app.role}_CV_v${cv.version}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    addToast('success', 'CV downloaded!');
  };

  const updateCV = (appId: string, cvId: string, newContent: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          cvVersions: app.cvVersions.map(cv => 
            cv.id === cvId 
              ? { ...cv, content: newContent, modifiedAt: Date.now() }
              : cv
          )
        };
      }
      return app;
    });
    
    saveApplications(updatedApps);
    
    // Update selectedApp if it's the one being edited
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }
    
    addToast('success', 'CV updated successfully!');
  };

  const deleteApplication = async (appId: string) => {
    const updatedApps = applications.filter(app => app.id !== appId);
    setApplications(updatedApps);
    setSelectedApp(null); // Close modal

    // Delete from Supabase
    await deleteAppFromDb(appId);
    addToast('success', 'Application deleted successfully!');
  };

  const deleteCV = async (appId: string, cvId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app || app.cvVersions.length <= 1) {
      addToast('error', 'Cannot delete the only CV version');
      return;
    }

    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        const remainingVersions = a.cvVersions.filter(cv => cv.id !== cvId);
        return { ...a, cvVersions: remainingVersions };
      }
      return a;
    });

    setApplications(updatedApps);

    // Delete from Supabase
    await deleteCVVersion(cvId);

    // Update selectedApp
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }

    addToast('success', 'CV version deleted');
  };

  const createNewCVVersion = (appId: string, currentCvId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    // Find current CV to copy its content
    const currentCV = app.cvVersions.find(cv => cv.id === currentCvId);
    const contentToCopy = currentCV ? currentCV.content : '';

    const newVersion: CVVersion = {
      id: `cv-${Date.now()}`,
      version: app.cvVersions.length + 1,
      content: contentToCopy, // Copy current CV content
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      generatedBy: 'manual',
    };

    const updatedApps = applications.map(a => 
      a.id === appId 
        ? { ...a, cvVersions: [...a.cvVersions, newVersion] }
        : a
    );

    saveApplications(updatedApps);
    
    // Update selectedApp
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }

    addToast('success', 'New CV version created from current!');
    return newVersion.id;
  };

  // Cover Letter Handlers
  const createCoverLetter = async (
    appId: string,
    style: import('./types').CoverLetterStyle,
    recipientInfo: import('./types').RecipientInfo,
    availabilityDate?: string
  ) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    try {
      setGeneratingCoverLetter(true);

      const content = await generateCoverLetter(app, style, recipientInfo, availabilityDate);

      const newCoverLetter: import('./types').CoverLetter = {
        id: `cl-${Date.now()}`,
        version: app.coverLetters.length + 1,
        content,
        style,
        recipientInfo,
        generatedBy: 'ai',
        createdAt: Date.now(),
      };

      const updatedApps = applications.map(a =>
        a.id === appId
          ? { ...a, coverLetters: [...a.coverLetters, newCoverLetter] }
          : a
      );

      saveApplications(updatedApps);

      // Update selectedApp
      if (selectedApp?.id === appId) {
        const updatedApp = updatedApps.find(a => a.id === appId);
        if (updatedApp) {
          setSelectedApp(updatedApp);
        }
      }

      addToast('success', 'Cover letter generated successfully!');
      return newCoverLetter.id;
    } catch (error) {
      addToast('error', 'Failed to generate cover letter');
      throw error;
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const updateCoverLetter = (appId: string, coverLetterId: string, newContent: string) => {
    const updatedApps = applications.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          coverLetters: app.coverLetters.map(cl =>
            cl.id === coverLetterId
              ? { ...cl, content: newContent, modifiedAt: Date.now() }
              : cl
          )
        };
      }
      return app;
    });

    saveApplications(updatedApps);

    // Update selectedApp
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }

    addToast('success', 'Cover letter updated!');
  };

  const deleteCoverLetter = async (appId: string, coverLetterId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app || app.coverLetters.length <= 1) {
      addToast('error', 'Cannot delete the only cover letter version');
      return;
    }

    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        const remainingLetters = a.coverLetters.filter(cl => cl.id !== coverLetterId);
        return { ...a, coverLetters: remainingLetters };
      }
      return a;
    });

    setApplications(updatedApps);

    // Delete from Supabase
    await deleteCoverLetterFromDb(coverLetterId);

    // Update selectedApp
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }

    addToast('success', 'Cover letter deleted');
  };

  const createNewCoverLetterVersion = (appId: string, currentCoverLetterId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    // Find current cover letter to copy its content and info
    const currentCoverLetter = app.coverLetters.find(cl => cl.id === currentCoverLetterId);
    if (!currentCoverLetter) return;

    const newVersion: import('./types').CoverLetter = {
      id: `cl-${Date.now()}`,
      version: app.coverLetters.length + 1,
      content: currentCoverLetter.content,
      style: currentCoverLetter.style,
      recipientInfo: currentCoverLetter.recipientInfo,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      generatedBy: 'manual',
    };

    const updatedApps = applications.map(a =>
      a.id === appId
        ? { ...a, coverLetters: [...a.coverLetters, newVersion] }
        : a
    );

    saveApplications(updatedApps);

    // Update selectedApp
    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    }

    addToast('success', 'New cover letter version created!');
    return newVersion.id;
  };

  const setMainCoverLetter = (appId: string, coverLetterId: string) => {
    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        const selected = a.coverLetters.find(cl => cl.id === coverLetterId);
        if (!selected) return a;
        const others = a.coverLetters.filter(cl => cl.id !== coverLetterId);
        return { ...a, coverLetters: [selected, ...others] };
      }
      return a;
    });

    saveApplications(updatedApps);

    if (selectedApp?.id === appId) {
      const updatedApp = updatedApps.find(a => a.id === appId);
      if (updatedApp) setSelectedApp({ ...updatedApp });
    }

    addToast('success', 'Main cover letter updated!');
  };

  const downloadCoverLetter = (coverLetter: import('./types').CoverLetter, app: Application) => {
    const element = document.createElement('a');
    const file = new Blob([coverLetter.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${app.company}_${app.role}_CoverLetter_v${coverLetter.version}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    addToast('success', 'Cover letter downloaded!');
  };

  // Filter applications
  const filteredApps = filterStatus === 'all'
    ? applications
    : filterStatus === 'sent'
      // "Sent" includes all applications that have been sent (have sentDate or appliedAt)
      ? applications.filter(a => a.tracking.sentDate || a.appliedAt)
      : filterStatus === 'waiting'
        // "Waiting" includes sent, waiting, and interview statuses (all pending final response)
        ? applications.filter(a => a.status === 'sent' || a.status === 'waiting' || a.status === 'interview' || (a.tracking.interviewScheduled && a.status !== 'offer' && a.status !== 'rejected'))
        : filterStatus === 'interview'
          // Interview: status is 'interview' OR has interviewScheduled
          ? applications.filter(a => a.status === 'interview' || (a.tracking.interviewScheduled && a.status !== 'offer' && a.status !== 'rejected' && a.status !== 'closed'))
          : applications.filter(a => a.status === filterStatus);

  // Sort by most recent
  const sortedApps = [...filteredApps].sort((a, b) => b.createdAt - a.createdAt);

  // Calculate basic stats
  const stats = {
    total: applications.length,
    draft: applications.filter(a => a.status === 'draft').length,
    // "Sent" includes all applications that have been sent (have sentDate or appliedAt)
    sent: applications.filter(a => a.tracking.sentDate || a.appliedAt).length,
    // "Waiting" includes sent, waiting, and interview (all pending final response)
    waiting: applications.filter(a => a.status === 'sent' || a.status === 'waiting' || a.status === 'interview' || (a.tracking.interviewScheduled && a.status !== 'offer' && a.status !== 'rejected' && a.status !== 'closed')).length,
    // Interview: status is 'interview' OR has interviewScheduled
    interview: applications.filter(a => a.status === 'interview' || (a.tracking.interviewScheduled && a.status !== 'offer' && a.status !== 'rejected' && a.status !== 'closed')).length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    closed: applications.filter(a => a.status === 'closed').length,
  };

  // Dashboard KPIs
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  // "Needs attention" — applications requiring user action
  const needsAttention = applications.filter(a => {
    if (a.status === 'sent' && a.tracking.sentDate && (now - a.tracking.sentDate) > 14 * DAY) return true;
    if (a.tracking.interviewScheduled?.date) {
      const daysUntil = (new Date(a.tracking.interviewScheduled.date).getTime() - now) / DAY;
      if (daysUntil >= 0 && daysUntil <= 3) return true;
    }
    if (a.status === 'draft' && (now - a.createdAt) > 7 * DAY) return true;
    return false;
  }).length;

  // "In progress" — active pipeline count + last activity date
  const inProgressApps = applications.filter(a => ['sent', 'waiting', 'interview'].includes(a.status));
  const inProgressCount = inProgressApps.length;
  const lastActivityDate = inProgressApps.length > 0
    ? Math.max(...inProgressApps.map(a => a.tracking.sentDate || a.createdAt))
    : null;
  const daysSinceActivity = lastActivityDate ? Math.round((now - lastActivityDate) / DAY) : null;

  // "Responses received" — total responses (interviews + outcomes)
  const responsesReceived = applications.filter(a =>
    a.tracking.interviewScheduled || a.tracking.outcome
  );
  const interviewResponses = applications.filter(a => a.tracking.interviewScheduled).length;
  const decisionResponses = applications.filter(a => a.tracking.outcome).length;

  return (
    <JobIntelligenceProvider>
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 transition-colors duration-200">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <NewApplicationModal
        isOpen={showNewAppModal}
        onClose={() => setShowNewAppModal(false)}
        onCreate={createApplication}
        templates={templates}
      />

      {/* Header */}
      <div className="bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <img src="/logo.svg" alt="Logo" className="h-8 sm:h-10 w-auto" />
              {/* Desktop nav */}
              <nav className="hidden sm:flex items-center gap-1">
                <span className="px-3 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700 rounded-lg whitespace-nowrap">
                  Apply
                </span>
                <button
                  onClick={() => router.push('/jobs')}
                  className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Target className="w-4 h-4 flex-shrink-0" />
                  Matching
                  {savedJobsCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-accent-600 text-white text-xs font-medium">
                      {savedJobsCount}
                    </span>
                  )}
                </button>
              </nav>
              {/* Mobile nav dropdown */}
              <div className="relative sm:hidden" ref={mobileNavRef}>
                <button
                  onClick={() => setShowMobileNav(!showMobileNav)}
                  className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100 hover:bg-primary-100 dark:hover:bg-primary-700 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {showMobileNav && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-primary-800 rounded-lg shadow-lg border border-primary-200 dark:border-primary-700 py-1 z-50">
                    <span className="block px-4 py-2 text-sm font-medium text-primary-900 dark:text-primary-50 bg-primary-100 dark:bg-primary-700">
                      Apply
                    </span>
                    <button
                      onClick={() => {
                        setShowMobileNav(false);
                        router.push('/jobs');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Matching
                      {savedJobsCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-accent-600 text-white text-xs font-medium">
                          {savedJobsCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowNewAppModal(true)}
              className="inline-flex items-center gap-2 px-2.5 sm:px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">New application</span>
            </button>
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-4 border-l border-primary-200 dark:border-primary-600 text-sm text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-medium text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.email}</span>
                    {!profileComplete && (
                      <span className="w-2 h-2 bg-warning-500 rounded-full" title="Incomplete profile" />
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-primary-800 rounded-lg shadow-lg border border-primary-200 dark:border-primary-700 py-2 z-50">
                    <div className="px-4 py-2 border-b border-primary-100 dark:border-primary-700">
                      <p className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">{user.email}</p>
                      {profile?.fullName && (
                        <p className="text-xs text-primary-500 dark:text-primary-400 truncate">{profile.fullName}</p>
                      )}
                      {!profileComplete && (
                        <p className="text-xs text-warning-600 dark:text-warning-400 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-warning-500 rounded-full" />
                          Incomplete profile
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/account');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-700 flex items-center gap-3"
                      >
                        <User className="w-4 h-4" aria-hidden="true" />
                        <span>Account</span>
                        {!profileComplete && (
                          <span className="ml-auto text-xs bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded-full">
                            Incomplete
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="border-t border-primary-100 dark:border-primary-700 py-1">
                      <ThemeToggle showLabel className="w-full px-4 py-2 justify-start text-sm" />
                    </div>

                    <div className="border-t border-primary-100 dark:border-primary-700 py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          signOut();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Section Title */}
        <h1 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-6">Apply to job offers</h1>

        {/* Dashboard KPIs */}
        {dataLoading ? (
          <SkeletonStatsGrid count={3} />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            {/* Needs attention */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">Attention</span>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" aria-hidden="true" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-primary-900 dark:text-primary-50 mb-1">
                {needsAttention}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-400 truncate">
                {needsAttention === 0 ? 'All clear' : `${needsAttention} to review`}
              </div>
            </div>

            {/* In progress */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-info-600 dark:text-info-400 uppercase tracking-wide">Active</span>
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-info-500" aria-hidden="true" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-primary-900 dark:text-primary-50 mb-1">
                {inProgressCount}
              </div>
              <div className="text-xs text-primary-500 dark:text-primary-400 truncate">
                {daysSinceActivity !== null ? `Last ${daysSinceActivity}d ago` : 'No activity'}
              </div>
            </div>

            {/* Responses received */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-success-600 dark:text-success-400 uppercase tracking-wide">Responses</span>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success-500" aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-primary-900 dark:text-primary-50 mb-1">
              {responsesReceived.length}
            </div>
            <div className="text-xs text-primary-500 dark:text-primary-400 truncate">
              {responsesReceived.length === 0 ? 'Waiting' : `${interviewResponses} int. ${decisionResponses} dec.`}
            </div>
          </div>
        </div>
        )}

        {/* Offers Banner */}
        {stats.offer > 0 && (
          <div className="bg-success-50 dark:bg-success-900/20 rounded-lg shadow-md p-4 sm:p-5 border border-success-200 dark:border-success-700/30 mb-6">
            <div className="flex items-center gap-3">
              <Star className="w-7 h-7 sm:w-8 sm:h-8 text-success-500" aria-hidden="true" />
              <div className="text-lg sm:text-xl font-semibold text-success-700 dark:text-success-300">
                {stats.offer} offer{stats.offer > 1 ? 's' : ''} received
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'draft', 'sent', 'waiting', 'interview', 'offer', 'rejected', 'closed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`filter-pill capitalize ${filterStatus === status ? 'active' : ''}`}
            >
              {status} ({status === 'all' ? applications.length : stats[status as keyof typeof stats] || 0})
            </button>
          ))}
        </div>

        {/* Applications List */}
        {dataLoading ? (
          <SkeletonList variant="application" count={4} />
        ) : sortedApps.length === 0 ? (
          <div className="bg-white dark:bg-primary-800 rounded-lg shadow-lg p-12 text-center border border-primary-200 dark:border-primary-700">
            <FileText className="w-16 h-16 mx-auto mb-6 text-primary-300 dark:text-primary-600" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-3">
              No applications yet
            </h2>
            <p className="text-primary-600 dark:text-primary-400 mb-8">
              Start tracking your job applications and create professional resumes
            </p>
            <Button onClick={() => setShowNewAppModal(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Create your first application
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-primary-800 rounded-lg shadow-lg overflow-hidden border border-primary-200 dark:border-primary-700">
            <div className="divide-y divide-primary-100 dark:divide-primary-700">
              {sortedApps.map(app => {
                const hasInterview = !!app.tracking.interviewScheduled;

                return (
                  <div key={app.id}>
                    <div
                      className="group relative p-4 cursor-pointer transition-all duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-700/30 border-l-4 border-l-transparent hover:border-l-primary-300 dark:hover:border-l-primary-500"
                      onClick={() => setSelectedApp(app)}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h3 className="text-base sm:text-lg font-semibold text-primary-900 dark:text-primary-50 truncate max-w-[200px] sm:max-w-none">
                              {app.role}
                            </h3>
                            <span className="text-primary-300 dark:text-primary-600 flex-shrink-0">•</span>
                            <span className="text-primary-600 dark:text-primary-400 truncate max-w-[140px] sm:max-w-none">{app.company}</span>
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open original job posting"
                                className="text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span className={`badge flex-shrink-0 ${
                              app.status === 'draft' ? 'badge-draft' :
                              app.status === 'sent' ? 'badge-sent' :
                              app.status === 'waiting' ? 'badge-waiting' :
                              app.status === 'interview' ? 'badge-interview' :
                              app.status === 'offer' ? 'badge-offer' :
                              app.status === 'rejected' ? 'badge-rejected' :
                              app.status === 'closed' ? (
                                app.tracking.closedReason === 'accepted' ? 'badge-offer' :
                                app.tracking.closedReason === 'declined' ? 'badge-waiting' :
                                'badge-draft'
                              ) :
                              'badge-draft'
                            }`}>
                              {app.status === 'closed' ? (
                                app.tracking.closedReason === 'accepted' ? 'ACCEPTED' :
                                app.tracking.closedReason === 'declined' ? 'DECLINED' :
                                'EXPIRED'
                              ) : app.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-primary-500 dark:text-primary-400 mt-1">
                            Created {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                          {hasInterview && app.tracking.interviewScheduled && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-accent-700 dark:text-accent-300">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                              <span>
                                {new Date(app.tracking.interviewScheduled.date).toLocaleDateString('en-US', {
                                  weekday: 'short', month: 'short', day: 'numeric'
                                })}
                                {' at '}
                                {new Date(app.tracking.interviewScheduled.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit', minute: '2-digit', hour12: false
                                })}
                              </span>
                              {app.tracking.interviewScheduled.location && (
                                <>
                                  <span className="text-primary-300 dark:text-primary-600">|</span>
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                                  <span className="truncate max-w-[200px]">{app.tracking.interviewScheduled.location}</span>
                                </>
                              )}
                              {/* Interview action icons */}
                              <span className="text-primary-200 dark:text-primary-700 ml-1">|</span>
                              {app.tracking.interviewScheduled.location && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(app.tracking.interviewScheduled!.location!); }}
                                  title="Copy address"
                                  className="w-6 h-6 flex items-center justify-center text-accent-500 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-200 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); addToCalendar(app.id); }}
                                title="Add to calendar"
                                className="w-6 h-6 flex items-center justify-center text-accent-500 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-200 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded transition-colors"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setInterviewAppId(app.id); setIsEditingInterview(true); setInterviewDate(new Date(app.tracking.interviewScheduled!.date).toISOString().split('T')[0]); setInterviewTime(new Date(app.tracking.interviewScheduled!.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })); setInterviewLocation(app.tracking.interviewScheduled!.location || ''); setShowInterviewModal(true); }}
                                title="Edit interview"
                                className="w-6 h-6 flex items-center justify-center text-accent-500 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-200 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this interview?')) deleteInterview(app.id); }}
                                title="Delete interview"
                                className="w-6 h-6 flex items-center justify-center text-primary-400 dark:text-primary-500 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Right: Flow-step action + Delete */}
                        <div className="flex items-center gap-1.5">
                          {/* Flow-step action: always visible */}
                          {app.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsSent(app.id);
                              }}
                              className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-info-600 text-white hover:bg-info-700"
                              title="Mark as Sent"
                              aria-label="Mark as Sent"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              Send
                            </button>
                          )}
                          {(app.status === 'sent' || app.status === 'waiting') && !hasInterview && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInterviewAppId(app.id);
                                setShowInterviewModal(true);
                              }}
                              className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/40"
                              title="Schedule Interview"
                              aria-label="Schedule Interview"
                            >
                              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                              Interview
                            </button>
                          )}
                          {/* Post-interview: Result button */}
                          {hasInterview && (app.status === 'sent' || app.status === 'waiting' || app.status === 'interview') && (
                            expandedResultId === app.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOffer(app.id);
                                    setExpandedResultId(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900/40"
                                  aria-label="Got an offer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                  Offer
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRejected(app.id);
                                    setExpandedResultId(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-600"
                                  aria-label="No offer received"
                                >
                                  No offer
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedResultId(null);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 rounded transition-colors"
                                  aria-label="Close"
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedResultId(app.id);
                                }}
                                className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-600"
                                title="Record interview result"
                                aria-label="Record interview result"
                              >
                                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Result
                              </button>
                            )
                          )}
                          {/* Offer status: Accept / Decline */}
                          {app.status === 'offer' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsClosed(app.id, 'accepted');
                                }}
                                className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-success-600 text-white hover:bg-success-700"
                                aria-label="Accept offer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Accept
                              </button>
                              {confirmDeclineId === app.id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (declineTimerRef.current) {
                                      clearTimeout(declineTimerRef.current);
                                      declineTimerRef.current = null;
                                    }
                                    setConfirmDeclineId(null);
                                    markAsClosed(app.id, 'declined');
                                  }}
                                  className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-error-100 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-300 dark:border-error-700 hover:bg-error-200 dark:hover:bg-error-900/40"
                                  aria-label="Confirm decline"
                                >
                                  Confirm?
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeclineId(app.id);
                                    declineTimerRef.current = setTimeout(() => {
                                      setConfirmDeclineId(null);
                                      declineTimerRef.current = null;
                                    }, 3000);
                                  }}
                                  className="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-600 hover:bg-primary-200 dark:hover:bg-primary-600"
                                  aria-label="Decline offer"
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          )}
                          {/* Delete: hover-only */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete the application for ${app.role} at ${app.company}?`)) {
                                deleteApplication(app.id);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center text-primary-300 dark:text-primary-600 opacity-0 group-hover:opacity-100 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-all duration-200"
                            title="Delete application"
                            aria-label="Delete application"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="modal-backdrop z-50 flex items-center justify-center p-4" onClick={closeInterviewModal}>
          <div className="modal-content max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50">
                {interviewAppId && applications.find(a => a.id === interviewAppId)?.tracking.interviewScheduled
                  ? 'Interview Details'
                  : 'Schedule Interview'}
              </h3>
              <button
                onClick={closeInterviewModal}
                className="text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 p-1 rounded-md hover:bg-primary-100 dark:hover:bg-primary-700 transition-colors"
                aria-label="Close modal"
              >
                <Ban className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {interviewAppId && applications.find(a => a.id === interviewAppId)?.tracking.interviewScheduled && !isEditingInterview ? (
              // Show details (read-only mode)
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-accent-500" aria-hidden="true" />
                    <span className="text-primary-700 dark:text-primary-300">{new Date(applications.find(a => a.id === interviewAppId)!.tracking.interviewScheduled!.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent-500" aria-hidden="true" />
                    <span className="text-primary-700 dark:text-primary-300">{new Date(applications.find(a => a.id === interviewAppId)!.tracking.interviewScheduled!.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}</span>
                  </div>
                  {applications.find(a => a.id === interviewAppId)!.tracking.interviewScheduled!.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-accent-500" aria-hidden="true" />
                      <span className="flex-1 text-primary-700 dark:text-primary-300">{applications.find(a => a.id === interviewAppId)!.tracking.interviewScheduled!.location}</span>
                      <button
                        onClick={() => copyToClipboard(applications.find(a => a.id === interviewAppId)!.tracking.interviewScheduled!.location!)}
                        className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-700 transition-colors"
                        aria-label="Copy address"
                      >
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => addToCalendar(interviewAppId)}
                    className="w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                    title="Add interview to calendar"
                  >
                    <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                    Add to Calendar
                  </button>
                  <button
                    onClick={() => setIsEditingInterview(true)}
                    className="w-full px-4 py-2 bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-200 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-600 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                    title="Edit interview details"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this interview? This cannot be undone.')) {
                        deleteInterview(interviewAppId);
                      }
                    }}
                    className="w-full px-4 py-2 bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 rounded-lg hover:bg-error-200 dark:hover:bg-error-900/50 font-medium transition-colors text-sm border border-error-300 dark:border-error-700/30 flex items-center justify-center gap-2"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete Interview
                  </button>
                </div>
              </div>
            ) : (
              // Edit form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="input-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="input-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    placeholder="123 Main St, Paris"
                    className="input-primary"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowInterviewModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveInterviewDetails}
                    className="btn-primary flex-1"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generating Overlay - CV */}
      {generatingCV && (
        <div className="modal-backdrop z-50 flex items-center justify-center">
          <div className="modal-content p-12 text-center max-w-md">
            <div className="spinner w-16 h-16 mx-auto mb-6"></div>
            <h3 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Generating Your CV
            </h3>
            <p className="text-primary-600 dark:text-primary-400">
              AI is analyzing the job and creating a tailored resume
            </p>
          </div>
        </div>
      )}

      {/* Generating Overlay - Cover Letter */}
      {generatingCoverLetter && (
        <div className="modal-backdrop z-50 flex items-center justify-center">
          <div className="modal-content p-12 text-center max-w-md">
            <div className="spinner w-16 h-16 mx-auto mb-6"></div>
            <h3 className="text-2xl font-semibold text-primary-900 dark:text-primary-50 mb-2">
              Generating Cover Letter
            </h3>
            <p className="text-primary-600 dark:text-primary-400">
              AI is crafting a personalized cover letter for this role
            </p>
          </div>
        </div>
      )}

      {/* Edit Application Modal */}
      {selectedApp && (
        <CVDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onDownloadCV={(cv) => downloadCV(cv, selectedApp)}
          onSetMainVersion={(cvId) => setMainVersion(selectedApp.id, cvId)}
          onUpdateCV={(appId, cvId, newContent) => updateCV(appId, cvId, newContent)}
          onDeleteApplication={() => deleteApplication(selectedApp.id)}
          onCreateNewVersion={(currentCvId) => createNewCVVersion(selectedApp.id, currentCvId)}
          onDeleteCV={(cvId) => deleteCV(selectedApp.id, cvId)}
          onCreateCoverLetter={(appId, style, recipientInfo) => createCoverLetter(appId, style, recipientInfo)}
          onUpdateCoverLetter={(appId, coverLetterId, newContent) => updateCoverLetter(appId, coverLetterId, newContent)}
          onDeleteCoverLetter={(appId, coverLetterId) => deleteCoverLetter(appId, coverLetterId)}
            onCreateNewCoverLetterVersion={(appId, currentCoverLetterId) => createNewCoverLetterVersion(appId, currentCoverLetterId)}
            onSetMainCoverLetter={(appId, coverLetterId) => setMainCoverLetter(appId, coverLetterId)}
            onDownloadCoverLetter={(coverLetter) => downloadCoverLetter(coverLetter, selectedApp)}
        />
      )}
    </div>
    </JobIntelligenceProvider>
  );
}
