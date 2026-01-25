import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileText, User, Briefcase, Link as LinkIcon, Sparkles, Plus, Loader2, Zap, FilePlus, Lightbulb, ChevronDown, ChevronUp, MapPin, Clock, AlertCircle, Upload, ClipboardList, CheckCircle, Trash2, Pencil } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Button from './Button';
import { Template, ParsedJobContext, Language, LanguageProficiency, PortfolioLink, Certification } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { compareSkillsClient } from '@/lib/skill-matcher';

interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  achievements: string[];
}

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  field: string;
  startYear: string;
  endYear: string;
  current: boolean;
}

function formatExperienceToText(entries: ExperienceEntry[]): string {
  return entries.map(exp => {
    const achievements = exp.achievements.filter(a => a.trim()).map(a => `  - ${a}`).join('\n');
    return `${exp.title} at ${exp.company}${exp.location ? ` (${exp.location})` : ''}\n${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || ''}\n${achievements}`;
  }).join('\n\n');
}

function formatEducationToText(entries: EducationEntry[]): string {
  return entries.map(edu => {
    return `${edu.degree} in ${edu.field}\n${edu.institution}, ${edu.startYear} - ${edu.current ? 'Present' : edu.endYear || ''}`;
  }).join('\n\n');
}

interface PrefilledJob {
  company: string;
  role: string;
  jobDescription: string;
  jobUrl?: string;
}

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    company: string;
    role: string;
    jobDescription: string;
    jobUrl?: string;
    parsedJobContext?: ParsedJobContext;
    cvData?: {
      name: string;
      email: string;
      phone: string;
      address: string;
      age?: string;
      languages?: string;
      portfolio?: string;
      summary: string;
      experience: string;
      skills: string;
      education: string;
      projects?: string;
    };
    useExistingTemplate: boolean;
    selectedTemplateId?: string;
  }) => void;
  templates: Template[];
  prefilledJob?: PrefilledJob;
}

export default function NewApplicationModal({
  isOpen,
  onClose,
  onCreate,
  templates,
  prefilledJob,
}: NewApplicationModalProps) {
  const router = useRouter();
  const { profile, isComplete: profileComplete, roleProfiles, missingFields, updateProfile, updateRoleProfile } = useProfile();
  const [step, setStep] = useState(1);

  // Step 1: Job Info
  const [jobInputMode, setJobInputMode] = useState<'manual' | 'import'>('manual');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [useUrl, setUseUrl] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [importText, setImportText] = useState('');

  // Parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parsedJobContext, setParsedJobContext] = useState<ParsedJobContext | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showParsedPreview, setShowParsedPreview] = useState(true);

  // CV Import (Step 3)
  const [cvInputMode, setCvInputMode] = useState<'pdf' | 'text' | 'manual'>('manual');
  const [cvTextContent, setCvTextContent] = useState('');
  const [cvImportStatus, setCvImportStatus] = useState<'idle' | 'extracting' | 'parsing' | 'done' | 'error'>('idle');
  const [cvImportError, setCvImportError] = useState<string | null>(null);


  // Step 2: CV Source
  const [cvSource, setCvSource] = useState<'scratch' | 'template' | 'profile'>('scratch');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedRoleProfileId, setSelectedRoleProfileId] = useState<string>('');
  
  // Step 3: CV Data (if from scratch)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [summary, setSummary] = useState('');
  const [experienceEntries, setExperienceEntries] = useState<ExperienceEntry[]>([]);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [projects, setProjects] = useState('');
  const [isLoadingProjectSuggestions, setIsLoadingProjectSuggestions] = useState(false);
  const [showProfileSaveConfirm, setShowProfileSaveConfirm] = useState(false);
  const [showRoleProfileSaveConfirm, setShowRoleProfileSaveConfirm] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Derived text representations for backwards compatibility
  const experience = formatExperienceToText(experienceEntries);
  const education = formatEducationToText(educationEntries);
  const skills = skillTags.join(', ');

  const hasTemplates = templates.length > 0;
  const hasRoleProfiles = roleProfiles.length > 0;

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge > 0 ? calculatedAge : null;
  };

  // Pre-fill from job offer data (skip Step 1)
  useEffect(() => {
    if (isOpen && prefilledJob) {
      setCompany(prefilledJob.company);
      setRole(prefilledJob.role);
      setJobDescription(prefilledJob.jobDescription);
      if (prefilledJob.jobUrl) setJobUrl(prefilledJob.jobUrl);
      setStep(2);
    }
  }, [isOpen, prefilledJob]);

  // Pre-fill basic info from profile when modal opens (for both 'profile' and 'scratch' modes)
  useEffect(() => {
    if (isOpen && profile) {
      // Pre-fill basic personal info if available and fields are empty
      if (!name && profile.fullName) setName(profile.fullName);
      if (!email && profile.email) setEmail(profile.email);
      if (!phone && profile.phone) setPhone(profile.phone);
      if (!address && (profile.city || profile.country)) {
        setAddress([profile.city, profile.country].filter(Boolean).join(', '));
      }
      // Age - calculate from date of birth
      if (!age && profile.dateOfBirth) {
        const calculatedAge = calculateAge(profile.dateOfBirth);
        if (calculatedAge) setAge(calculatedAge.toString());
      }
      // Portfolio URL - pre-fill from links
      if (!portfolio) {
        const portfolioLink = profile.portfolioLinks?.find(l => l.type === 'portfolio' || l.type === 'linkedin');
        if (portfolioLink) setPortfolio(portfolioLink.url);
      }
      // Languages
      if (!languages && profile.languages?.length) {
        setLanguages(profile.languages.map(l => `${l.language} (${l.proficiency})`).join(', '));
      }
    }
  }, [isOpen, profile]);

  // Full pre-fill form from profile when source is 'profile'
  useEffect(() => {
    if (cvSource === 'profile' && profile && profileComplete) {
      // Find selected role profile or use general profile
      const roleProfile = selectedRoleProfileId
        ? roleProfiles.find(rp => rp.id === selectedRoleProfileId)
        : null;

      // Build name
      setName(profile.fullName || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setAddress([profile.city, profile.country].filter(Boolean).join(', '));

      // Languages from profile
      const langList = profile.languages?.map(l => `${l.language} (${l.proficiency})`).join(', ') || '';
      setLanguages(langList);

      // Portfolio - first link
      const portfolioLink = profile.portfolioLinks?.find(l => l.type === 'portfolio' || l.type === 'linkedin');
      setPortfolio(portfolioLink?.url || '');

      // Summary - use role profile custom summary if available
      setSummary(roleProfile?.customSummary || profile.professionalSummary || '');

      // Experience - filter by role profile if selected
      const experiencesToUse = roleProfile
        ? profile.workExperience.filter(exp => roleProfile.selectedExperienceIds.includes(exp.id))
        : profile.workExperience;

      setExperienceEntries(experiencesToUse.map(exp => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        location: exp.location || '',
        startDate: exp.startDate,
        endDate: exp.endDate || '',
        current: exp.current,
        achievements: exp.achievements.length > 0 ? exp.achievements : [''],
      })));

      // Skills - filter by role profile if selected
      const skillsToUse = roleProfile
        ? profile.skills.filter(s => roleProfile.selectedSkillIds.includes(s.id))
        : profile.skills;

      setSkillTags(skillsToUse.map(s => s.name));

      // Education - filter by role profile if selected
      const educationToUse = roleProfile
        ? profile.education.filter(e => roleProfile.selectedEducationIds.includes(e.id))
        : profile.education;

      setEducationEntries(educationToUse.map(edu => ({
        id: edu.id,
        degree: edu.degree,
        institution: edu.institution,
        field: edu.field,
        startYear: edu.startYear?.toString() || '',
        endYear: edu.endYear?.toString() || '',
        current: edu.current || false,
      })));

      // Projects from certifications/awards
      const projectsText = [
        ...(profile.certifications?.map(c => `${c.name} - ${c.issuer} (${c.date})`) || []),
        ...(profile.awards?.map(a => `${a.title} - ${a.issuer} (${a.date})`) || []),
      ].join('\n');
      setProjects(projectsText);

      // Save snapshot for role profile change detection
      if (selectedRoleProfileId) {
        const summaryVal = roleProfile?.customSummary || profile.professionalSummary || '';
        const expIds = experiencesToUse.map(e => e.id).sort().join(',');
        const skillNames = skillsToUse.map(s => s.name).sort().join(',');
        const eduIds = educationToUse.map(e => e.id).sort().join(',');
        setProfileSnapshot(JSON.stringify({ summary: summaryVal, expIds, skillNames, eduIds }));
      } else {
        setProfileSnapshot(null);
      }
    }
  }, [cvSource, profile, profileComplete, selectedRoleProfileId, roleProfiles]);

  const handleParseJob = async () => {
    setIsParsing(true);
    setParseError(null);

    try {
      let textToParse = jobInputMode === 'import' ? importText : jobDescription;

      // If URL mode (manual tab only), fetch content first
      if (jobInputMode === 'manual' && useUrl && jobUrl.trim()) {
        const fetchRes = await fetch('/api/fetch-job-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: jobUrl.trim() }),
        });
        const fetchData = await fetchRes.json();
        if (!fetchData.success || !fetchData.content) {
          setParseError('Failed to fetch URL content. Please paste the job description directly.');
          setIsParsing(false);
          return;
        }
        textToParse = fetchData.content;
      }

      if (!textToParse.trim()) {
        setParseError('No content to analyze.');
        setIsParsing(false);
        return;
      }

      // Parse the job description
      const parseRes = await fetch('/api/parse-job-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: textToParse }),
      });
      const parseData = await parseRes.json();

      if (!parseData.success || !parseData.data) {
        setParseError('Failed to parse job description. Please try again.');
        setIsParsing(false);
        return;
      }

      const parsed = parseData.data;

      // Compare skills against user profile
      const skillComparison = profile
        ? compareSkillsClient(
            profile.skills || [],
            profile.workExperience || [],
            parsed.requiredSkills || []
          )
        : { matched: [], missing: parsed.requiredSkills || [], matchPercent: 0 };

      const context: ParsedJobContext = {
        title: parsed.title || null,
        company: parsed.company || null,
        location: parsed.location || null,
        salaryMin: parsed.salaryMin || null,
        salaryMax: parsed.salaryMax || null,
        salaryCurrency: parsed.salaryCurrency || null,
        presenceType: parsed.presenceType || null,
        contractType: parsed.contractType || null,
        requiredSkills: parsed.requiredSkills || [],
        niceToHaveSkills: parsed.niceToHaveSkills || [],
        perks: parsed.perks || [],
        matchedSkills: skillComparison.matched,
        missingSkills: skillComparison.missing,
        skillsMatchPercent: skillComparison.matchPercent,
      };

      setParsedJobContext(context);
      setShowParsedPreview(true);

      // Auto-fill company and role if empty
      if (!company.trim() && context.company) {
        setCompany(context.company);
      }
      if (!role.trim() && context.title) {
        setRole(context.title);
      }

      // In import mode, set jobDescription to the full pasted text for CV generation
      if (jobInputMode === 'import' && importText.trim()) {
        setJobDescription(importText.trim());
      }
    } catch (error) {
      console.error('Error parsing job:', error);
      setParseError('An unexpected error occurred. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // CV Import: PDF dropzone
  const onCvDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setCvImportError('File too large. Maximum size is 8MB.');
      return;
    }

    setCvInputMode('manual');
    setCvImportStatus('extracting');
    setCvImportError(null);

    try {
      // Extract text from PDF
      const formData = new FormData();
      formData.append('file', file);

      const extractRes = await fetch('/api/extract-pdf-text', {
        method: 'POST',
        body: formData,
      });
      const extractData = await extractRes.json();

      if (!extractData.success || !extractData.text) {
        setCvImportError(extractData.error || 'Failed to extract text from PDF.');
        setCvImportStatus('error');
        return;
      }

      // Parse the extracted text
      await parseCvText(extractData.text);
    } catch (error) {
      console.error('PDF import error:', error);
      setCvImportError('Failed to process PDF. Try pasting text instead.');
      setCvImportStatus('error');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onCvDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    noClick: false,
    noKeyboard: false,
  });

  // CV Import: Parse text content
  const parseCvText = async (text: string) => {
    setCvImportStatus('parsing');
    setCvImportError(null);

    try {
      // Parse all sections in parallel
      const [personalRes, expRes, skillsRes, eduRes] = await Promise.all([
        fetch('/api/parse-cv-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'personal', content: text }),
        }),
        fetch('/api/parse-cv-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'experience', content: text }),
        }),
        fetch('/api/parse-cv-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'skills', content: text }),
        }),
        fetch('/api/parse-cv-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'education', content: text }),
        }),
      ]);

      const [personalData, expData, skillsData, eduData] = await Promise.all([
        personalRes.json(),
        expRes.json(),
        skillsRes.json(),
        eduRes.json(),
      ]);

      // Fill personal info
      if (personalData.success && personalData.data) {
        const p = personalData.data;
        if (p.fullName && !name.trim()) setName(p.fullName);
        if (p.email && !email.trim()) setEmail(p.email);
        if (p.phone && !phone.trim()) setPhone(p.phone);
        if (p.address && !address.trim()) setAddress(p.address);
        if (p.age && !age.trim()) setAge(String(p.age));
        if (p.portfolio && !portfolio.trim()) setPortfolio(p.portfolio);
        if (p.languages && Array.isArray(p.languages) && p.languages.length > 0 && !languages.trim()) {
          setLanguages(p.languages.map((l: { language: string; proficiency: string }) => `${l.language} (${l.proficiency})`).join(', '));
        }
      }

      // Fill experience as structured entries
      if (expData.success && expData.data) {
        const entries = Array.isArray(expData.data) ? expData.data : [];
        if (entries.length > 0) {
          setExperienceEntries(entries.map((exp: { title?: string; company?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; achievements?: string[] }) => ({
            id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: exp.title || '',
            company: exp.company || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current || false,
            achievements: (exp.achievements && exp.achievements.length > 0) ? exp.achievements : [''],
          })));
        }
      }

      // Fill skills
      if (skillsData.success && skillsData.data) {
        const parsedSkills = Array.isArray(skillsData.data) ? skillsData.data : [];
        const skillNames = parsedSkills.map((s: { name?: string }) => s.name || '').filter(Boolean);
        if (skillNames.length > 0) setSkillTags(skillNames);
      }

      // Fill education as structured entries
      if (eduData.success && eduData.data) {
        const entries = Array.isArray(eduData.data) ? eduData.data : [];
        if (entries.length > 0) {
          setEducationEntries(entries.map((edu: { degree?: string; field?: string; institution?: string; startYear?: number; endYear?: number; current?: boolean }) => ({
            id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            degree: edu.degree || '',
            institution: edu.institution || '',
            field: edu.field || '',
            startYear: edu.startYear ? String(edu.startYear) : '',
            endYear: edu.endYear ? String(edu.endYear) : '',
            current: edu.current || false,
          })));
        }
      }

      setCvImportStatus('done');
    } catch (error) {
      console.error('CV parse error:', error);
      setCvImportError('Failed to parse CV content. You can edit the fields manually.');
      setCvImportStatus('error');
    }
  };

  const handleCvTextImport = async () => {
    if (!cvTextContent.trim()) return;
    await parseCvText(cvTextContent.trim());
    setCvInputMode('manual');
  };

  // Profile save: merge entered data into core profile
  const saveToProfile = async () => {
    if (!profile) return;

    try {
      const updates: Partial<typeof profile> = {};

      // Personal info: only fill empty fields
      if (!profile.fullName && name.trim()) updates.fullName = name.trim();
      if (!profile.email && email.trim()) updates.email = email.trim();
      if (!profile.phone && phone.trim()) updates.phone = phone.trim();
      if (!profile.city && address.trim()) {
        const parts = address.split(',').map(p => p.trim());
        updates.city = parts[0] || address.trim();
        if (parts[1]) updates.country = parts[1];
      }
      if (!profile.professionalSummary && summary.trim()) {
        updates.professionalSummary = summary.trim();
      }

      // Skills: add new ones not already in profile (case-insensitive dedup)
      if (skillTags.length > 0) {
        const existingSkills = profile.skills || [];
        const existingNames = new Set(existingSkills.map(s => s.name.toLowerCase()));
        const newSkills = skillTags
          .filter(tag => !existingNames.has(tag.toLowerCase()))
          .map(tag => ({
            id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: tag,
            category: 'technical' as const,
          }));
        if (newSkills.length > 0) {
          updates.skills = [...existingSkills, ...newSkills];
        }
      }

      // Experience: add new entries not already in profile (dedup by title+company)
      if (experienceEntries.length > 0) {
        const existingExp = profile.workExperience || [];
        const existingExpKeys = new Set(
          existingExp.map(e => `${e.title.toLowerCase()}|${e.company.toLowerCase()}`)
        );
        const newExperiences = experienceEntries
          .filter(entry => entry.title.trim() && entry.company.trim())
          .filter(entry => !existingExpKeys.has(`${entry.title.toLowerCase()}|${entry.company.toLowerCase()}`))
          .map(entry => ({
            id: entry.id,
            title: entry.title.trim(),
            company: entry.company.trim(),
            location: entry.location.trim() || undefined,
            startDate: entry.startDate.trim() || `01-01-${new Date().getFullYear()}`,
            endDate: entry.current ? undefined : entry.endDate.trim() || undefined,
            current: entry.current,
            achievements: entry.achievements.filter(a => a.trim()),
          }));
        if (newExperiences.length > 0) {
          updates.workExperience = [...existingExp, ...newExperiences];
        }
      }

      // Education: add new entries not already in profile (dedup by degree+institution)
      if (educationEntries.length > 0) {
        const existingEdu = profile.education || [];
        const existingEduKeys = new Set(
          existingEdu.map(e => `${e.degree.toLowerCase()}|${e.institution.toLowerCase()}`)
        );
        const newEducation = educationEntries
          .filter(entry => entry.degree.trim() && entry.institution.trim())
          .filter(entry => !existingEduKeys.has(`${entry.degree.toLowerCase()}|${entry.institution.toLowerCase()}`))
          .map(entry => ({
            id: entry.id,
            degree: entry.degree.trim(),
            institution: entry.institution.trim(),
            field: entry.field.trim(),
            startYear: parseInt(entry.startYear) || new Date().getFullYear(),
            endYear: entry.current ? undefined : (parseInt(entry.endYear) || undefined),
            current: entry.current || false,
          }));
        if (newEducation.length > 0) {
          updates.education = [...existingEdu, ...newEducation];
        }
      }

      // Languages: parse text field into structured Language entries
      if (languages.trim()) {
        const existingLangs = profile.languages || [];
        const existingLangNames = new Set(existingLangs.map(l => l.language.toLowerCase()));
        const langParts = languages.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        const newLangs: Language[] = [];

        for (const part of langParts) {
          const match = part.match(/^(.+?)\s*\((.+?)\)\s*$/);
          const langName = match ? match[1].trim() : part.trim();
          const rawProficiency = match ? match[2].trim().toLowerCase() : '';

          if (langName && !existingLangNames.has(langName.toLowerCase())) {
            const proficiency: LanguageProficiency =
              /natif|native|maternelle|mother/i.test(rawProficiency) ? 'native' :
              /bilingu/i.test(rawProficiency) ? 'bilingual' :
              /fluent|courant|c1|c2|advanced|avanc/i.test(rawProficiency) ? 'professional' :
              /professional|professionnel|b2/i.test(rawProficiency) ? 'professional' :
              /intermediate|interm|b1|conversational/i.test(rawProficiency) ? 'conversational' :
              /basic|débutant|beginner|a1|a2|élémentaire/i.test(rawProficiency) ? 'basic' :
              'professional';

            newLangs.push({
              id: `lang-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              language: langName,
              proficiency,
              acquisition: proficiency === 'native' ? 'native' : 'education',
            });
          }
        }

        if (newLangs.length > 0) {
          updates.languages = [...existingLangs, ...newLangs];
        }
      }

      // Portfolio links: detect URLs and determine type
      if (portfolio.trim()) {
        const existingLinks = profile.portfolioLinks || [];
        const existingUrls = new Set(existingLinks.map(l => l.url.toLowerCase()));
        const urlRegex = /https?:\/\/[^\s,;]+/gi;
        const urls = portfolio.match(urlRegex) || (portfolio.trim().includes('.') ? [portfolio.trim()] : []);
        const newLinks: PortfolioLink[] = [];

        for (const url of urls) {
          const cleanUrl = url.replace(/[.,;)]+$/, ''); // Remove trailing punctuation
          if (existingUrls.has(cleanUrl.toLowerCase())) continue;

          const type: PortfolioLink['type'] =
            /linkedin\.com/i.test(cleanUrl) ? 'linkedin' :
            /github\.com/i.test(cleanUrl) ? 'github' :
            /dribbble\.com/i.test(cleanUrl) ? 'dribbble' :
            /behance\.net/i.test(cleanUrl) ? 'behance' :
            /(twitter\.com|x\.com)/i.test(cleanUrl) ? 'twitter' :
            'portfolio';

          newLinks.push({
            id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type,
            url: cleanUrl,
            label: type === 'portfolio' ? 'Portfolio' : type.charAt(0).toUpperCase() + type.slice(1),
          });
        }

        if (newLinks.length > 0) {
          updates.portfolioLinks = [...existingLinks, ...newLinks];
        }
      }

      // Certifications: detect known patterns in all text fields
      const allText = [experience, skills, summary, languages].join(' ');
      if (allText.trim()) {
        const certPatterns: { regex: RegExp; buildName: (m: RegExpMatchArray) => string; issuer: string }[] = [
          { regex: /TOEIC\s*(\d+)/i, buildName: (m) => `TOEIC ${m[1]}`, issuer: 'ETS' },
          { regex: /TOEFL\s*(?:iBT\s*)?(\d+)/i, buildName: (m) => `TOEFL ${m[1]}`, issuer: 'ETS' },
          { regex: /DELF\s*(A1|A2|B1|B2|C1|C2)/i, buildName: (m) => `DELF ${m[1].toUpperCase()}`, issuer: 'France Education International' },
          { regex: /DALF\s*(C1|C2)/i, buildName: (m) => `DALF ${m[1].toUpperCase()}`, issuer: 'France Education International' },
          { regex: /IELTS\s*(\d+\.?\d*)/i, buildName: (m) => `IELTS ${m[1]}`, issuer: 'British Council' },
          { regex: /\bPMP\b/i, buildName: () => 'PMP', issuer: 'PMI' },
          { regex: /\bCISSP\b/i, buildName: () => 'CISSP', issuer: 'ISC2' },
          { regex: /\bSCRUM\s*MASTER\b/i, buildName: () => 'Scrum Master', issuer: 'Scrum Alliance' },
          { regex: /AWS\s+(?:Certified\s+)?([\w\s]+?)(?:\s*[-–,.]|\s*$)/i, buildName: (m) => `AWS ${m[1].trim()}`, issuer: 'Amazon Web Services' },
          { regex: /Google\s+(?:Certified|Professional)\s+([\w\s]+?)(?:\s*[-–,.]|\s*$)/i, buildName: (m) => `Google ${m[1].trim()}`, issuer: 'Google' },
        ];

        const existingCerts = profile.certifications || [];
        const existingCertNames = new Set(existingCerts.map(c => c.name.toLowerCase()));
        const newCerts: Certification[] = [];

        for (const pattern of certPatterns) {
          const match = allText.match(pattern.regex);
          if (match) {
            const certName = pattern.buildName(match);
            if (!existingCertNames.has(certName.toLowerCase())) {
              newCerts.push({
                id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: certName,
                issuer: pattern.issuer,
                date: '',
              });
              existingCertNames.add(certName.toLowerCase()); // Prevent duplicates within same parse
            }
          }
        }

        if (newCerts.length > 0) {
          updates.certifications = [...existingCerts, ...newCerts];
        }
      }

      // Only save if there are actual updates
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const resetForm = () => {
    setStep(1);
    setJobInputMode('manual');
    setCompany('');
    setRole('');
    setUseUrl(false);
    setJobDescription('');
    setJobUrl('');
    setImportText('');
    setParsedJobContext(null);
    setParseError(null);
    setShowParsedPreview(true);
    setCvSource('scratch');
    setSelectedTemplateId('');
    setSelectedRoleProfileId('');
    setCvInputMode('manual');
    setCvTextContent('');
    setCvImportStatus('idle');
    setCvImportError(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setAge('');
    setLanguages('');
    setPortfolio('');
    setSummary('');
    setExperienceEntries([]);
    setEditingExpId(null);
    setSkillTags([]);
    setNewSkillInput('');
    setEducationEntries([]);
    setEditingEduId(null);
    setProjects('');
    setShowProfileSaveConfirm(false);
    setIsCreating(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (step === 1) {
      if (!company.trim() || !role.trim()) return;
      if (jobInputMode === 'manual') {
        if (!useUrl && !jobDescription.trim()) return;
        if (useUrl && !jobUrl.trim()) return;
      } else {
        // Import mode: importText must exist, and it becomes the jobDescription
        if (!importText.trim()) return;
        if (!jobDescription) setJobDescription(importText.trim());
      }
      setStep(2);
    } else if (step === 2) {
      if (cvSource === 'template' && hasTemplates) {
        // Use template - can create directly
        handleCreate();
      } else {
        // From scratch or profile - go to step 3 (profile data is pre-filled via useEffect)
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Perform the actual application creation and reset
  const performCreate = async () => {
    try {
      if (cvSource === 'scratch' || cvSource === 'profile') {
        const finalJobDescription = jobInputMode === 'import'
          ? (jobDescription.trim() || importText.trim())
          : (useUrl ? '' : jobDescription.trim());
        const finalJobUrl = (jobInputMode === 'manual' && useUrl ? jobUrl.trim() : undefined) || (prefilledJob?.jobUrl) || undefined;

        onCreate({
          company: company.trim(),
          role: role.trim(),
          jobDescription: finalJobDescription,
          jobUrl: finalJobUrl,
          parsedJobContext: parsedJobContext || undefined,
          cvData: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            age: age.trim() || undefined,
            languages: languages.trim() || undefined,
            portfolio: portfolio.trim() || undefined,
            summary: summary.trim(),
            experience: experience.trim(),
            skills: skills.trim(),
            education: education.trim(),
            projects: projects.trim() || undefined,
          },
          useExistingTemplate: false,
        });
      } else {
        // Use template
        const finalJobDescription = jobInputMode === 'import'
          ? (jobDescription.trim() || importText.trim())
          : (useUrl ? '' : jobDescription.trim());
        const finalJobUrl = (jobInputMode === 'manual' && useUrl ? jobUrl.trim() : undefined) || (prefilledJob?.jobUrl) || undefined;

        onCreate({
          company: company.trim(),
          role: role.trim(),
          jobDescription: finalJobDescription,
          jobUrl: finalJobUrl,
          parsedJobContext: parsedJobContext || undefined,
          useExistingTemplate: true,
          selectedTemplateId,
        });
      }
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const updateRoleProfileFromEdits = async () => {
    if (!selectedRoleProfileId || !profile) return;
    const roleProfile = roleProfiles.find(rp => rp.id === selectedRoleProfileId);
    if (!roleProfile) return;

    const selectedExpIds = experienceEntries.map(e => e.id).filter(Boolean);
    const selectedSkillIds = profile.skills
      .filter(s => skillTags.some(tag => tag.toLowerCase() === s.name.toLowerCase()))
      .map(s => s.id);
    const selectedEduIds = educationEntries.map(e => e.id).filter(Boolean);

    await updateRoleProfile({
      ...roleProfile,
      customSummary: summary,
      selectedExperienceIds: selectedExpIds,
      selectedSkillIds: selectedSkillIds,
      selectedEducationIds: selectedEduIds,
    });
  };

  const handleCreate = async () => {
    if (cvSource === 'scratch' || cvSource === 'profile') {
      // Validate CV data (same validation for scratch and profile)
      if (!name.trim() || !email.trim() || !experience.trim()) {
        return;
      }
    }

    // If profile is incomplete and user entered data, prompt before creating
    if (cvSource === 'scratch' && !profileComplete && (name.trim() || experienceEntries.length > 0 || skillTags.length > 0 || educationEntries.length > 0)) {
      setShowProfileSaveConfirm(true);
      return;
    }

    // If using a role profile and user modified data, prompt to save changes
    if (cvSource === 'profile' && selectedRoleProfileId && profileSnapshot) {
      const currentExpIds = experienceEntries.map(e => e.id).sort().join(',');
      const currentSkillNames = skillTags.slice().sort().join(',');
      const currentEduIds = educationEntries.map(e => e.id).sort().join(',');
      const currentData = JSON.stringify({ summary, expIds: currentExpIds, skillNames: currentSkillNames, eduIds: currentEduIds });
      if (currentData !== profileSnapshot) {
        setShowRoleProfileSaveConfirm(true);
        return;
      }
    }

    setIsCreating(true);
    await performCreate();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop z-40"
        onClick={handleClose}
      />

      {/* Slide Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-white dark:bg-primary-800 shadow-2xl z-50 overflow-y-auto animate-slide-in-right transition-colors">
        {/* Header */}
        <div className="sticky top-0 bg-accent-600 text-white p-6 shadow-lg z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <FilePlus className="w-6 h-6" aria-hidden="true" />
                New Application
              </h2>
              <p className="text-white/90 mt-1 text-sm">
                Step {prefilledJob ? step - 1 : step} of {prefilledJob ? (cvSource === 'template' && hasTemplates ? 1 : 2) : (cvSource === 'template' && hasTemplates ? 2 : 3)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-white/80 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-accent-400/30 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${((prefilledJob ? step - 1 : step) / (prefilledJob ? (cvSource === 'template' && hasTemplates ? 1 : 2) : (cvSource === 'template' && hasTemplates ? 2 : 3))) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: Job Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Job Information
                </h3>
              </div>

              {/* Tab Toggle */}
              <div className="flex p-1 bg-primary-100 dark:bg-primary-700/50 rounded-lg">
                <button
                  onClick={() => setJobInputMode('manual')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    jobInputMode === 'manual'
                      ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-50 shadow-sm'
                      : 'text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setJobInputMode('import')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    jobInputMode === 'import'
                      ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-50 shadow-sm'
                      : 'text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200'
                  }`}
                >
                  Import text format
                </button>
              </div>

              {/* MANUAL MODE */}
              {jobInputMode === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g., Google, Meta, Airbnb..."
                      className="input-primary"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g., Senior Product Designer"
                      className="input-primary"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-primary-700 dark:text-primary-300">
                        Job Description *
                      </label>
                      <button
                        onClick={() => setUseUrl(!useUrl)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 transition-colors"
                      >
                        {useUrl ? (
                          <>
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                            Switch to text
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                            Switch to URL
                          </>
                        )}
                      </button>
                    </div>

                    {useUrl ? (
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://linkedin.com/jobs/..."
                        className="input-primary"
                      />
                    ) : (
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job description here..."
                        rows={6}
                        className="textarea-primary text-sm"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* IMPORT MODE */}
              {jobInputMode === 'import' && (
                <div className="space-y-4">
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    Paste the complete job posting below. AI will extract the company name, job title, requirements, and more.
                  </p>

                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      if (parsedJobContext) {
                        setParsedJobContext(null);
                        setParseError(null);
                      }
                    }}
                    placeholder="Paste the entire job posting here...

Example:
Senior Product Designer - Acme Corp
Location: Paris, France (Hybrid)
Salary: 55-70k€

We're looking for a talented designer who...

Requirements:
- 5+ years experience in product design
- Figma expert
..."
                    rows={12}
                    className="textarea-primary text-sm"
                    autoFocus
                  />

                  {/* Parse error */}
                  {parseError && (
                    <div className="flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{parseError}</span>
                      <button
                        onClick={() => { setParseError(null); handleParseJob(); }}
                        className="ml-2 text-accent-600 dark:text-accent-400 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Parsed preview + extracted fields */}
                  {parsedJobContext && (
                    <div className="space-y-4">
                      {/* Extracted company/role fields (editable) */}
                      <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg space-y-3">
                        <p className="text-xs font-medium text-success-700 dark:text-success-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Extracted information (editable)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-primary-600 dark:text-primary-400 mb-1">Company</label>
                            <input
                              type="text"
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              placeholder="Company name"
                              className="input-primary text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-primary-600 dark:text-primary-400 mb-1">Job Title</label>
                            <input
                              type="text"
                              value={role}
                              onChange={(e) => setRole(e.target.value)}
                              placeholder="Job title"
                              className="input-primary text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Parsed insights panel */}
                      <div className="border border-accent-200 dark:border-accent-800 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setShowParsedPreview(!showParsedPreview)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-accent-50 dark:bg-accent-900/30 text-sm font-medium text-accent-700 dark:text-accent-300"
                        >
                          <span className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Job Insights
                            {parsedJobContext.requiredSkills.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-800 text-accent-600 dark:text-accent-400">
                                {parsedJobContext.matchedSkills.length}/{parsedJobContext.requiredSkills.length} skills matched
                              </span>
                            )}
                          </span>
                          {showParsedPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showParsedPreview && (
                          <div className="px-4 py-3 space-y-3 bg-white dark:bg-primary-800">
                            {/* Meta badges */}
                            <div className="flex flex-wrap gap-2">
                              {parsedJobContext.salaryMin || parsedJobContext.salaryMax ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 rounded text-xs font-medium">
                                  {parsedJobContext.salaryMin && parsedJobContext.salaryMax
                                    ? `${parsedJobContext.salaryCurrency || '€'}${parsedJobContext.salaryMin.toLocaleString()} - ${parsedJobContext.salaryMax.toLocaleString()}`
                                    : parsedJobContext.salaryMax
                                    ? `Up to ${parsedJobContext.salaryCurrency || '€'}${parsedJobContext.salaryMax.toLocaleString()}`
                                    : `From ${parsedJobContext.salaryCurrency || '€'}${parsedJobContext.salaryMin!.toLocaleString()}`}
                                </span>
                              ) : null}
                              {parsedJobContext.presenceType && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-300 rounded text-xs">
                                  <MapPin className="w-3 h-3" />
                                  {parsedJobContext.presenceType === 'full_remote' ? 'Remote' : parsedJobContext.presenceType === 'hybrid' ? 'Hybrid' : 'On-site'}
                                </span>
                              )}
                              {parsedJobContext.contractType && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-700/50 text-primary-700 dark:text-primary-300 rounded text-xs">
                                  <Clock className="w-3 h-3" />
                                  {parsedJobContext.contractType}
                                </span>
                              )}
                            </div>

                            {/* Required skills */}
                            {parsedJobContext.requiredSkills.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 mb-1.5">Required Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {parsedJobContext.requiredSkills.map((skill, idx) => {
                                    const isMatched = parsedJobContext.matchedSkills.includes(skill);
                                    return (
                                      <span
                                        key={idx}
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          isMatched
                                            ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                                            : 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300'
                                        }`}
                                      >
                                        {skill}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Nice to have */}
                            {parsedJobContext.niceToHaveSkills.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-primary-500 dark:text-primary-400 mb-1.5">Nice to Have</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {parsedJobContext.niceToHaveSkills.map((skill, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-300 rounded text-xs"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Re-analyze button */}
                            <button
                              onClick={() => { setParsedJobContext(null); setCompany(''); setRole(''); }}
                              className="text-xs text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200"
                            >
                              Clear and re-analyze
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CV Source */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  CV Source
                </h3>
                <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
                  Choose how to create your CV for this application
                </p>
              </div>

              {/* Skill gap info banner */}
              {parsedJobContext && parsedJobContext.missingSkills.length > 0 && (
                <div className="p-3 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
                  <p className="text-sm text-accent-700 dark:text-accent-300 mb-2">
                    Your profile matches <strong>{parsedJobContext.matchedSkills.length}/{parsedJobContext.requiredSkills.length}</strong> required skills.
                    {parsedJobContext.missingSkills.length > 0 && ' Missing:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedJobContext.missingSkills.slice(0, 6).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                    {parsedJobContext.missingSkills.length > 6 && (
                      <span className="text-xs text-primary-500 dark:text-primary-400 self-center">
                        +{parsedJobContext.missingSkills.length - 6} more
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push('/account')}
                    className="mt-2 text-xs text-accent-600 dark:text-accent-400 hover:underline"
                  >
                    Update your profile to improve matching
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* From Profile Option - Recommended if profile is complete */}
                <button
                  onClick={() => {
                    if (profileComplete) {
                      setCvSource('profile');
                      // Auto-select default role profile if exists
                      const defaultRole = roleProfiles.find(rp => rp.isDefault);
                      if (defaultRole) {
                        setSelectedRoleProfileId(defaultRole.id);
                      }
                    }
                  }}
                  disabled={!profileComplete}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    !profileComplete
                      ? 'opacity-60 cursor-not-allowed bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700/30'
                      : cvSource === 'profile'
                      ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                      : 'border-primary-200 dark:border-primary-600 hover:border-success-300 dark:hover:border-success-600 hover:bg-success-50/50 dark:hover:bg-success-900/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      cvSource === 'profile' && profileComplete ? 'border-success-500' : 'border-primary-300 dark:border-primary-500'
                    }`}>
                      {cvSource === 'profile' && profileComplete && (
                        <div className="w-3 h-3 rounded-full bg-success-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-primary-900 dark:text-primary-100 text-lg flex items-center gap-2">
                          <User className="w-5 h-5" aria-hidden="true" />
                          Use my profile
                        </span>
                        {profileComplete && (
                          <span className="text-xs bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 px-2 py-0.5 rounded-full font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-primary-600 dark:text-primary-400 mb-3">
                        {profileComplete
                          ? 'Use your profile data to automatically generate an optimized CV'
                          : 'Complete your profile to use this option'}
                      </div>

                      {!profileComplete && (
                        <div className="bg-warning-100 dark:bg-warning-900/30 rounded-lg p-3 mb-3">
                          <p className="text-sm text-warning-800 dark:text-warning-300 font-medium mb-1">Incomplete profile</p>
                          <p className="text-xs text-warning-700 dark:text-warning-400">
                            Missing fields: {missingFields.slice(0, 3).join(', ')}
                            {missingFields.length > 3 && ` +${missingFields.length - 3}`}
                          </p>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              router.push('/account');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                                router.push('/account');
                              }
                            }}
                            className="mt-2 inline-block text-sm text-warning-800 dark:text-warning-300 underline hover:text-warning-900 dark:hover:text-warning-200 cursor-pointer"
                          >
                            Complete my profile
                          </span>
                        </div>
                      )}

                      {profileComplete && cvSource === 'profile' && hasRoleProfiles && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-primary-600 dark:text-primary-400">Role profile (optional)</label>
                          <select
                            value={selectedRoleProfileId}
                            onChange={(e) => setSelectedRoleProfileId(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="select-primary"
                          >
                            <option value="">General profile (all data)</option>
                            {roleProfiles.map(rp => (
                              <option key={rp.id} value={rp.id}>
                                {rp.icon} {rp.name} {rp.isDefault ? '(Default)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* From Scratch Option */}
                <button
                  onClick={() => setCvSource('scratch')}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    cvSource === 'scratch'
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                      : 'border-primary-200 dark:border-primary-600 hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      cvSource === 'scratch' ? 'border-accent-500' : 'border-primary-300 dark:border-primary-500'
                    }`}>
                      {cvSource === 'scratch' && (
                        <div className="w-3 h-3 rounded-full bg-accent-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-primary-900 dark:text-primary-100 text-lg mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" aria-hidden="true" />
                        Manual entry
                      </div>
                      <div className="text-sm text-primary-600 dark:text-primary-400">
                        Enter your information manually. If you have completed your profile, it will be used to prefill the fields.
                      </div>
                    </div>
                  </div>
                </button>

                {/* Use Template Option */}
                <button
                  onClick={() => {
                    if (hasTemplates) {
                      setCvSource('template');
                      if (!selectedTemplateId && templates.length > 0) {
                        setSelectedTemplateId(templates[0].id);
                      }
                    }
                  }}
                  disabled={!hasTemplates}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    !hasTemplates
                      ? 'opacity-50 cursor-not-allowed bg-primary-50 dark:bg-primary-700/50'
                      : cvSource === 'template'
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                      : 'border-primary-200 dark:border-primary-600 hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                      cvSource === 'template' && hasTemplates ? 'border-accent-500' : 'border-primary-300 dark:border-primary-500'
                    }`}>
                      {cvSource === 'template' && hasTemplates && (
                        <div className="w-3 h-3 rounded-full bg-accent-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-primary-900 dark:text-primary-100 text-lg mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5" aria-hidden="true" />
                        Use Existing Template
                        {!hasTemplates && (
                          <span className="ml-2 text-xs font-normal text-primary-500 dark:text-primary-400">(No templates yet)</span>
                        )}
                      </div>
                      <div className="text-sm text-primary-600 dark:text-primary-400 mb-1">
                        {hasTemplates
                          ? 'AI will match and adapt your best existing template for this job'
                          : 'Create your first CV to use templates in future applications'}
                      </div>
                      <p className="text-xs text-warning-600 dark:text-warning-400 mb-3 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        This feature is not available yet.
                      </p>

                      {hasTemplates && cvSource === 'template' && (
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="select-primary"
                        >
                          {templates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.icon} {template.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CV Data (From Scratch) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-accent-500" aria-hidden="true" />
                  Your Information
                </h3>
                <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
                  Fill in your details or import from an existing CV
                </p>
              </div>

              {/* Input Mode Selector */}
              {cvImportStatus !== 'done' && (
                <div className="flex gap-2 p-1 bg-primary-100 dark:bg-primary-700/50 rounded-lg">
                  <button
                    onClick={() => setCvInputMode('pdf')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      cvInputMode === 'pdf'
                        ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 shadow-sm'
                        : 'text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => setCvInputMode('text')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      cvInputMode === 'text'
                        ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 shadow-sm'
                        : 'text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Paste Text
                  </button>
                  <button
                    onClick={() => setCvInputMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      cvInputMode === 'manual'
                        ? 'bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 shadow-sm'
                        : 'text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200'
                    }`}
                  >
                    <Pencil className="w-4 h-4" />
                    Manual
                  </button>
                </div>
              )}

              {/* PDF Import Mode */}
              {cvInputMode === 'pdf' && cvImportStatus !== 'done' && (
                <div
                  {...getRootProps()}
                  className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10'
                      : 'border-primary-300 dark:border-primary-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-700/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-10 h-10 text-primary-400 dark:text-primary-500 mb-3" />
                    <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">
                      {isDragActive ? 'Drop your PDF here' : 'Drag & drop your CV, or click to browse'}
                    </span>
                    <span className="text-xs text-primary-500 dark:text-primary-400 mt-1">PDF files up to 8MB</span>
                  </div>
                </div>
              )}

              {/* Text Paste Mode */}
              {cvInputMode === 'text' && cvImportStatus !== 'done' && (
                <div className="space-y-3">
                  <textarea
                    value={cvTextContent}
                    onChange={(e) => setCvTextContent(e.target.value)}
                    placeholder="Paste your full CV or resume content here..."
                    rows={10}
                    className="textarea-primary text-sm"
                    autoFocus
                  />

                  <div className="flex items-center justify-end">
                    <span className="text-xs text-primary-500 dark:text-primary-400">
                      {cvTextContent.length.toLocaleString()} characters
                    </span>
                  </div>
                </div>
              )}

              {/* Import status messages */}
              {cvImportStatus === 'extracting' && (
                <div className="flex items-center gap-2 text-sm text-accent-600 dark:text-accent-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting text from PDF...</span>
                </div>
              )}
              {cvImportStatus === 'done' && (
                <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>CV imported. Review and edit the fields below.</span>
                </div>
              )}
              {cvImportError && (
                <div className="flex items-center gap-2 text-sm text-error-600 dark:text-error-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{cvImportError}</span>
                </div>
              )}

              {/* Form fields: visible in manual mode always, or after successful import */}
              {(cvInputMode === 'manual' || cvImportStatus === 'done') && (
              <>
              {/* Personal Info */}
              <div className="bg-primary-50 dark:bg-primary-700/50 rounded-xl p-5 space-y-4">
                <h4 className="font-medium text-primary-900 dark:text-primary-100">Personal Details</h4>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name *"
                  className="input-primary"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email *"
                    className="input-primary"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone"
                    className="input-primary"
                  />
                </div>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address / Location"
                  className="input-primary"
                />

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Age"
                    min="18"
                    max="99"
                    className="input-primary"
                  />
                  <input
                    type="text"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="Languages"
                    className="input-primary col-span-2"
                  />
                </div>

                <input
                  type="text"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="Portfolio / Website URL"
                  className="input-primary"
                />
              </div>

              {/* Experience */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300">
                    Experience *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `exp-${Date.now()}`;
                      setExperienceEntries([...experienceEntries, {
                        id: newId,
                        title: '',
                        company: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        current: false,
                        achievements: [''],
                      }]);
                      setEditingExpId(newId);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {experienceEntries.length === 0 ? (
                  <p className="text-sm text-primary-400 dark:text-primary-500 italic py-4 text-center border border-dashed border-primary-300 dark:border-primary-600 rounded-lg">
                    No experience added yet. Import your CV or add entries manually.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {experienceEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-primary-200 dark:border-primary-600 rounded-lg p-4 bg-white dark:bg-primary-800"
                      >
                        {editingExpId === entry.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={entry.title}
                                onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, title: e.target.value } : en))}
                                placeholder="Job Title *"
                                className="input-primary text-sm"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={entry.company}
                                onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, company: e.target.value } : en))}
                                placeholder="Company *"
                                className="input-primary text-sm"
                              />
                            </div>
                            <input
                              type="text"
                              value={entry.location}
                              onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, location: e.target.value } : en))}
                              placeholder="Location (optional)"
                              className="input-primary text-sm"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={entry.startDate}
                                onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, startDate: e.target.value } : en))}
                                placeholder="Start (e.g. 01-2020)"
                                className="input-primary text-sm"
                              />
                              {!entry.current && (
                                <input
                                  type="text"
                                  value={entry.endDate}
                                  onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, endDate: e.target.value } : en))}
                                  placeholder="End (e.g. 06-2023)"
                                  className="input-primary text-sm"
                                />
                              )}
                            </div>
                            <label className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
                              <input
                                type="checkbox"
                                checked={entry.current}
                                onChange={(e) => setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, current: e.target.checked } : en))}
                                className="rounded border-primary-300 dark:border-primary-600"
                              />
                              Current position
                            </label>
                            <div>
                              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1 block">Achievements</span>
                              {entry.achievements.map((ach, achIdx) => (
                                <div key={achIdx} className="flex items-center gap-2 mb-1">
                                  <span className="text-primary-400 text-xs">-</span>
                                  <input
                                    type="text"
                                    value={ach}
                                    onChange={(e) => {
                                      const newAchs = [...entry.achievements];
                                      newAchs[achIdx] = e.target.value;
                                      setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, achievements: newAchs } : en));
                                    }}
                                    placeholder="Achievement or responsibility"
                                    className="input-primary text-sm flex-1"
                                  />
                                  {entry.achievements.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newAchs = entry.achievements.filter((_, i) => i !== achIdx);
                                        setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, achievements: newAchs } : en));
                                      }}
                                      className="text-primary-400 hover:text-error-500 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setExperienceEntries(entries => entries.map(en => en.id === entry.id ? { ...en, achievements: [...en.achievements, ''] } : en));
                                }}
                                className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 mt-1"
                              >
                                + Add achievement
                              </button>
                            </div>
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingExpId(null)}
                                className="px-3 py-1.5 text-sm font-medium text-accent-700 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-primary-900 dark:text-primary-100 text-sm truncate">
                                {entry.title || 'Untitled'} <span className="text-primary-500 dark:text-primary-400 font-normal">at</span> {entry.company || '...'}
                              </p>
                              <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                                {entry.startDate || '...'} - {entry.current ? 'Present' : entry.endDate || '...'}
                                {entry.location && ` · ${entry.location}`}
                              </p>
                              {entry.achievements.filter(a => a.trim()).length > 0 && (
                                <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 truncate">
                                  {entry.achievements.filter(a => a.trim()).length} achievement(s)
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingExpId(entry.id)}
                                className="p-1.5 text-primary-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExperienceEntries(entries => entries.filter(en => en.id !== entry.id))}
                                className="p-1.5 text-primary-500 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills - Tags UI */}
              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                  Skills
                </label>

                {/* Skills Tags Display */}
                <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] p-3 border border-primary-200 dark:border-primary-600 rounded-lg bg-primary-50 dark:bg-primary-700/50">
                  {skillTags.length === 0 ? (
                    <span className="text-primary-400 dark:text-primary-500 text-sm">No skills added yet</span>
                  ) : (
                    skillTags.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-sm font-medium"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => setSkillTags(skillTags.filter((_, i) => i !== index))}
                          className="ml-1 text-accent-500 hover:text-accent-700 dark:hover:text-accent-300 focus:outline-none"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkillInput.trim()) {
                        e.preventDefault();
                        if (!skillTags.includes(newSkillInput.trim())) {
                          setSkillTags([...skillTags, newSkillInput.trim()]);
                        }
                        setNewSkillInput('');
                      }
                    }}
                    placeholder="Add a skill"
                    className="input-primary flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSkillInput.trim() && !skillTags.includes(newSkillInput.trim())) {
                        setSkillTags([...skillTags, newSkillInput.trim()]);
                        setNewSkillInput('');
                      }
                    }}
                    className="px-4 py-2 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add
                  </button>
                </div>
                <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                  Press Enter or click Add to add each skill
                </p>
              </div>

              {/* Education */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300">
                    Education
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `edu-${Date.now()}`;
                      setEducationEntries([...educationEntries, {
                        id: newId,
                        degree: '',
                        institution: '',
                        field: '',
                        startYear: '',
                        endYear: '',
                        current: false,
                      }]);
                      setEditingEduId(newId);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {educationEntries.length === 0 ? (
                  <p className="text-sm text-primary-400 dark:text-primary-500 italic py-4 text-center border border-dashed border-primary-300 dark:border-primary-600 rounded-lg">
                    No education added yet. Import your CV or add entries manually.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {educationEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="border border-primary-200 dark:border-primary-600 rounded-lg p-4 bg-white dark:bg-primary-800"
                      >
                        {editingEduId === entry.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={entry.degree}
                              onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, degree: e.target.value } : en))}
                              placeholder="Degree (e.g. Bachelor of Science)"
                              className="input-primary text-sm"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={entry.field}
                              onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, field: e.target.value } : en))}
                              placeholder="Field of study"
                              className="input-primary text-sm"
                            />
                            <input
                              type="text"
                              value={entry.institution}
                              onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, institution: e.target.value } : en))}
                              placeholder="Institution"
                              className="input-primary text-sm"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={entry.startYear}
                                onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, startYear: e.target.value } : en))}
                                placeholder="Start year"
                                className="input-primary text-sm"
                              />
                              {!entry.current && (
                                <input
                                  type="text"
                                  value={entry.endYear}
                                  onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, endYear: e.target.value } : en))}
                                  placeholder="End year"
                                  className="input-primary text-sm"
                                />
                              )}
                            </div>
                            <label className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
                              <input
                                type="checkbox"
                                checked={entry.current}
                                onChange={(e) => setEducationEntries(entries => entries.map(en => en.id === entry.id ? { ...en, current: e.target.checked } : en))}
                                className="rounded border-primary-300 dark:border-primary-600"
                              />
                              Currently studying
                            </label>
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingEduId(null)}
                                className="px-3 py-1.5 text-sm font-medium text-accent-700 dark:text-accent-300 bg-accent-50 dark:bg-accent-900/30 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-primary-900 dark:text-primary-100 text-sm truncate">
                                {entry.degree || 'Untitled'} {entry.field && `in ${entry.field}`}
                              </p>
                              <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
                                {entry.institution || '...'} · {entry.startYear || '...'} - {entry.current ? 'Present' : entry.endYear || '...'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingEduId(entry.id)}
                                className="p-1.5 text-primary-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEducationEntries(entries => entries.filter(en => en.id !== entry.id))}
                                className="p-1.5 text-primary-500 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Projects with AI Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300">
                    Key Projects (Optional)
                  </label>
                  {(jobDescription || jobUrl) && profile?.certifications?.length || profile?.awards?.length ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (isLoadingProjectSuggestions) return;
                        setIsLoadingProjectSuggestions(true);
                        try {
                          const response = await fetch('/api/suggest-projects', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              jobDescription: jobDescription || '',
                              role,
                              company,
                              certifications: profile?.certifications || [],
                              awards: profile?.awards || [],
                              experience: experience,
                            }),
                          });
                          if (response.ok) {
                            const data = await response.json();
                            if (data.suggestions) {
                              setProjects(data.suggestions);
                            }
                          }
                        } catch (error) {
                          console.error('Failed to get project suggestions:', error);
                        } finally {
                          setIsLoadingProjectSuggestions(false);
                        }
                      }}
                      disabled={isLoadingProjectSuggestions}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoadingProjectSuggestions ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" aria-hidden="true" />
                          Suggest
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={projects}
                  onChange={(e) => setProjects(e.target.value)}
                  placeholder="Notable projects, achievements, portfolio pieces...
e.g., Nike Campaign 2023 - Led creative direction, +300% engagement"
                  rows={3}
                  className="textarea-primary"
                />
                {(jobDescription || jobUrl) && (
                  <p className="text-xs text-accent-600 dark:text-accent-400 mt-1">
                    Click &quot;Suggest&quot; to get project recommendations based on the job description
                  </p>
                )}
              </div>
              </>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-primary-800 border-t border-primary-200 dark:border-primary-700 p-6 flex gap-4 shadow-lg transition-colors">
          {step > 1 && !(prefilledJob && step === 2) && (
            <Button
              onClick={handleBack}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              Back
            </Button>
          )}

          {step < (cvSource === 'template' && hasTemplates ? 2 : 3) ? (
            step === 1 && jobInputMode === 'import' && !parsedJobContext ? (
              <Button
                onClick={handleParseJob}
                disabled={!importText.trim() || isParsing}
                size="lg"
                className="flex-1"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract with AI
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={
                  step === 1 && (
                    !company.trim() || !role.trim() ||
                    (jobInputMode === 'manual' && !useUrl && !jobDescription.trim()) ||
                    (jobInputMode === 'manual' && useUrl && !jobUrl.trim()) ||
                    (jobInputMode === 'import' && !parsedJobContext)
                  )
                }
                size="lg"
                className="flex-1"
              >
                Next
              </Button>
            )
          ) : step === 3 && cvInputMode === 'text' && cvImportStatus !== 'done' ? (
            <Button
              onClick={handleCvTextImport}
              disabled={!cvTextContent.trim() || cvImportStatus === 'parsing'}
              size="lg"
              className="flex-1"
            >
              {cvImportStatus === 'parsing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Parse with AI
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={
                isCreating ||
                ((cvSource === 'scratch' || cvSource === 'profile') && (!name.trim() || !email.trim() || !experience.trim()))
              }
              size="lg"
              className="flex-1"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              ) : (
                'Create application'
              )}
            </Button>
          )}
        </div>

        {/* Role Profile Update Confirmation Prompt */}
        {showRoleProfileSaveConfirm && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-white/95 dark:bg-primary-800/95 flex items-center justify-center z-[60] p-8">
            <div className="max-w-sm text-center space-y-4">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                Save changes to role profile?
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                You modified some fields. Do you want to update the associated role profile with these changes?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setShowRoleProfileSaveConfirm(false);
                    setIsCreating(true);
                    await performCreate();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-700 hover:bg-primary-200 dark:hover:bg-primary-600 rounded-lg transition-colors"
                >
                  No, just create
                </button>
                <button
                  onClick={async () => {
                    setShowRoleProfileSaveConfirm(false);
                    await updateRoleProfileFromEdits();
                    setIsCreating(true);
                    await performCreate();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600 rounded-lg transition-colors"
                >
                  Yes, save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Save Confirmation Prompt */}
        {showProfileSaveConfirm && (
          <div className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-white/95 dark:bg-primary-800/95 flex items-center justify-center z-[60] p-8">
            <div className="max-w-sm text-center space-y-4">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto">
                <User className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                Save to your profile?
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Would you like to save this information to your profile to complete it? This will fill in any empty fields.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setShowProfileSaveConfirm(false);
                    setIsCreating(true);
                    await performCreate();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-700 hover:bg-primary-200 dark:hover:bg-primary-600 rounded-lg transition-colors"
                >
                  No thanks
                </button>
                <button
                  onClick={async () => {
                    setIsCreating(true);
                    await saveToProfile();
                    setShowProfileSaveConfirm(false);
                    await performCreate();
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600 rounded-lg transition-colors"
                >
                  Yes, save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
