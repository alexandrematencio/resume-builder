import React, { useState, useEffect } from 'react';
import { X, Save, User, FileText, Briefcase, GraduationCap, Zap, Rocket, AlertTriangle, Trash2, Plus, Camera } from 'lucide-react';
import { Application, UserProfile } from '../types';

interface CVContent {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    age?: string;
    languages?: string;
    portfolio?: string;
    photo?: string;
  };
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  projects?: Project[];
}

interface Project {
  id: string;
  name: string;
  description: string;
}

interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

interface CVEditorProps {
  application: Application;
  onSave: (cvContent: CVContent) => void;
  onCancel: () => void;
  onDeleteApplication?: () => void;
  selectedCVId?: string;
  userProfile?: UserProfile | null;
}

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

export default function CVEditor({ application, onSave, onCancel, onDeleteApplication, selectedCVId, userProfile }: CVEditorProps) {
  const parseInitialCV = (): CVContent => {
    const cv = selectedCVId
      ? application.cvVersions.find(v => v.id === selectedCVId) || application.cvVersions[0]
      : application.cvVersions[0];

    if (!cv || !cv.content) {
      return {
        personalInfo: { name: '', email: '', phone: '', location: '' },
        summary: '',
        experiences: [],
        education: [],
        skills: [],
      };
    }

    const trimmedContent = cv.content.trim();
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        const jsonData = JSON.parse(trimmedContent);

        if (jsonData.personalInfo && jsonData.experiences && jsonData.education) {
          const experiences = jsonData.experiences.map((exp: any, index: number) => ({
            id: exp.id || `exp-${Date.now()}-${index}`,
            company: exp.company || '',
            title: exp.jobTitle || '',
            startDate: exp.period ? exp.period.split(' - ')[0] || '' : '',
            endDate: exp.period ? exp.period.split(' - ')[1] || '' : '',
            current: exp.period ? exp.period.toLowerCase().includes('present') : false,
            description: exp.achievements ? exp.achievements.join('\n') : '',
          }));

          const education = jsonData.education.map((edu: any, index: number) => ({
            id: edu.id || `edu-${Date.now()}-${index}`,
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.specialization || '',
            year: edu.years || '',
          }));

          const skills: string[] = [];
          if (jsonData.skills?.technical) skills.push(...jsonData.skills.technical);
          if (jsonData.skills?.marketing) skills.push(...jsonData.skills.marketing);
          if (jsonData.skills?.soft) skills.push(...jsonData.skills.soft);

          const projects = jsonData.projects?.map((proj: any, index: number) => ({
            id: proj.id || `proj-${Date.now()}-${index}`,
            name: proj.name || '',
            description: proj.description || '',
          })) || [];

          return {
            personalInfo: {
              name: jsonData.personalInfo.name || '',
              email: jsonData.personalInfo.email || '',
              phone: jsonData.personalInfo.phone || '',
              location: jsonData.personalInfo.address || '',
              age: jsonData.personalInfo.age?.toString() || undefined,
              languages: jsonData.personalInfo.languages || undefined,
              portfolio: jsonData.personalInfo.portfolio || undefined,
              photo: jsonData.personalInfo.photo || undefined,
            },
            summary: jsonData.profile?.text || '',
            experiences,
            education,
            skills,
            projects: projects.length > 0 ? projects : undefined,
          };
        }
      } catch (e) {
        console.warn('Failed to parse JSON CV, falling back to markdown parser:', e);
      }
    }

    const lines = cv.content.split('\n');
    const result: CVContent = {
      personalInfo: { name: '', email: '', phone: '', location: '' },
      summary: '',
      experiences: [],
      education: [],
      skills: [],
    };

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();

      if (line.startsWith('# ') && !result.personalInfo.name) {
        result.personalInfo.name = line.replace(/^#\s+/, '').trim();
      }

      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) result.personalInfo.email = emailMatch[0];

      const phoneMatch = line.match(/(\+?\d[\d\s\(\)-]{9,})/);
      if (phoneMatch) result.personalInfo.phone = phoneMatch[0].trim();

      if (line.includes('📍') || line.match(/\d+\s+\w+.*,/)) {
        result.personalInfo.location = line.replace(/📍/g, '').trim();
      }
    }

    let currentSection = 'none';
    let currentExp: Partial<Experience> | null = null;
    let currentEdu: Partial<Education> | null = null;
    let expDescLines: string[] = [];
    let summaryLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.match(/^##\s+(professional\s+)?summary/i)) {
        currentSection = 'summary';
        continue;
      }

      if (trimmed.match(/^##\s+(professional\s+)?experience/i)) {
        currentSection = 'experience';
        continue;
      }

      if (trimmed.match(/^##\s+education/i)) {
        if (currentExp) {
          result.experiences.push({
            id: `exp-${Date.now()}-${result.experiences.length}`,
            company: currentExp.company || '',
            title: currentExp.title || '',
            startDate: currentExp.startDate || '',
            endDate: currentExp.endDate || '',
            current: currentExp.current || false,
            description: expDescLines.join('\n'),
          });
          currentExp = null;
          expDescLines = [];
        }
        currentSection = 'education';
        continue;
      }

      if (trimmed.match(/^##\s+(technical\s+)?(skills?|competencies|proficiencies)/i)) {
        if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
          result.education.push({
            id: `edu-${Date.now()}-${result.education.length}`,
            institution: currentEdu.institution || '',
            degree: currentEdu.degree || '',
            field: currentEdu.field || '',
            year: currentEdu.year || '',
          });
          currentEdu = null;
        }
        currentSection = 'skills';
        continue;
      }

      if (trimmed === '---' || trimmed === '***') continue;

      if (currentSection === 'summary') {
        if (trimmed.startsWith('#')) continue;
        const cleanText = trimmed.replace(/\*\*/g, '');
        if (cleanText && !cleanText.match(/^##/)) {
          summaryLines.push(cleanText);
        }
      }
      else if (currentSection === 'experience') {
        if (trimmed.startsWith('###')) {
          if (currentExp) {
            result.experiences.push({
              id: `exp-${Date.now()}-${result.experiences.length}`,
              company: currentExp.company || '',
              title: currentExp.title || '',
              startDate: currentExp.startDate || '',
              endDate: currentExp.endDate || '',
              current: currentExp.current || false,
              description: expDescLines.join('\n'),
            });
            expDescLines = [];
          }

          const headerText = trimmed.replace(/^###\s+/, '');
          currentExp = {};

          const titleMatch = headerText.match(/\*\*([^*]+)\*\*/);
          if (titleMatch) {
            currentExp.title = titleMatch[1].trim();
          }

          const dateMatch = headerText.match(/\*([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)\*/i);
          if (dateMatch) {
            currentExp.startDate = dateMatch[1];
            currentExp.endDate = dateMatch[2];
            currentExp.current = /present|current/i.test(dateMatch[2]);
          }
        }
        else if (trimmed.startsWith('*') && !trimmed.startsWith('**') && currentExp) {
          const subtitle = trimmed.replace(/\*/g, '').trim();

          const dateMatch = subtitle.match(/([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/i);
          if (dateMatch && !currentExp.startDate) {
            currentExp.startDate = dateMatch[1];
            currentExp.endDate = dateMatch[2];
            currentExp.current = /present|current/i.test(dateMatch[2]);
          } else if (!currentExp.company) {
            currentExp.company = subtitle;
          }
        }
        else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const cleanLine = trimmed
            .replace(/^[-•]\s+/, '')
            .replace(/\*\*/g, '');
          expDescLines.push(cleanLine);
        }
      }
      else if (currentSection === 'education') {
        if (trimmed.startsWith('**') || trimmed.match(/\d{4}/)) {
          if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
            result.education.push({
              id: `edu-${Date.now()}-${result.education.length}`,
              institution: currentEdu.institution || '',
              degree: currentEdu.degree || '',
              field: currentEdu.field || '',
              year: currentEdu.year || '',
            });
          }

          currentEdu = {};

          if (trimmed.includes('|')) {
            const parts = trimmed.split('|').map(p => p.trim());
            if (parts.length >= 1) {
              currentEdu.degree = parts[0].replace(/\*\*/g, '').trim();
            }
            if (parts.length >= 2) {
              currentEdu.institution = parts[1].replace(/\*/g, '').trim();
            }
            if (parts.length >= 3) {
              currentEdu.year = parts[2].replace(/\*/g, '').trim();
            }
          } else {
            const years = trimmed.match(/\d{4}(-\d{4})?/);
            if (years) {
              currentEdu.year = years[0];
              const beforeYear = trimmed.substring(0, trimmed.indexOf(years[0])).trim();
              currentEdu.degree = beforeYear.replace(/\*\*/g, '');
            } else {
              currentEdu.degree = trimmed.replace(/\*\*/g, '');
            }
          }
        }
        else if (trimmed.startsWith('*') && !trimmed.startsWith('**')) {
          const text = trimmed.replace(/\*/g, '').trim();
          if (currentEdu) {
            if (!currentEdu.institution) {
              currentEdu.institution = text;
            } else if (!currentEdu.field) {
              currentEdu.field = text;
            }
          }
        }
      }
      else if (currentSection === 'skills') {
        if (trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(','))) {
          continue;
        }

        const cleaned = trimmed.replace(/^[-•]\s+/, '').replace(/\*\*/g, '');
        const skillsList = cleaned.split(/[,|•]/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length < 50 && !s.match(/^##/));

        result.skills.push(...skillsList);
      }
    }

    if (currentExp) {
      result.experiences.push({
        id: `exp-${Date.now()}-${result.experiences.length}`,
        company: currentExp.company || '',
        title: currentExp.title || '',
        startDate: currentExp.startDate || '',
        endDate: currentExp.endDate || '',
        current: currentExp.current || false,
        description: expDescLines.join('\n'),
      });
    }

    if (currentEdu && (currentEdu.institution || currentEdu.degree)) {
      result.education.push({
        id: `edu-${Date.now()}-${result.education.length}`,
        institution: currentEdu.institution || '',
        degree: currentEdu.degree || '',
        field: currentEdu.field || '',
        year: currentEdu.year || '',
      });
    }

    result.summary = summaryLines.join('\n').trim();
    result.skills = [...new Set(result.skills)]
      .filter(s => s && !s.match(/^(design|technical|additional|languages|tools|web|mobile|methodologies)/i));

    return result;
  };

  const [cvData, setCvData] = useState<CVContent>(parseInitialCV());
  const [newSkill, setNewSkill] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const newData = parseInitialCV();
    setCvData(newData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.cvVersions, selectedCVId]);

  useEffect(() => {
    if (userProfile?.dateOfBirth && !cvData.personalInfo.age) {
      const calculatedAge = calculateAge(userProfile.dateOfBirth);
      if (calculatedAge) {
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, age: calculatedAge.toString() }
        }));
      }
    }
  }, [userProfile?.dateOfBirth, cvData.personalInfo.age]);

  const updatePersonalInfo = (field: keyof CVContent['personalInfo'], value: string) => {
    setCvData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, photo: result }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: `exp-${Date.now()}`,
      company: '',
      title: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    };
    setCvData(prev => ({
      ...prev,
      experiences: [...prev.experiences, newExp]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setCvData(prev => ({
      ...prev,
      experiences: prev.experiences.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setCvData(prev => ({
      ...prev,
      experiences: prev.experiences.filter(exp => exp.id !== id)
    }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      field: '',
      year: '',
    };
    setCvData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setCvData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setCvData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addProject = () => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: '',
      description: '',
    };
    setCvData(prev => ({
      ...prev,
      projects: [...(prev.projects || []), newProject]
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setCvData(prev => ({
      ...prev,
      projects: (prev.projects || []).map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const removeProject = (id: string) => {
    setCvData(prev => ({
      ...prev,
      projects: (prev.projects || []).filter(proj => proj.id !== id)
    }));
  };

  const handleSave = () => {
    onSave(cvData);
  };

  const handleDeleteApplication = () => {
    if (onDeleteApplication) {
      onDeleteApplication();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="bg-white dark:bg-primary-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-error-500/10 hover:bg-error-500/20 dark:bg-error-500/20 dark:hover:bg-error-500/30 transition-all"
          aria-label="Close editor"
        >
          <X className="w-5 h-5 text-error-600 dark:text-error-400" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="bg-accent-600 dark:bg-accent-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Edit CV</h2>
            <p className="text-white/90 text-sm mt-1">
              {application.company} - {application.role}
            </p>
          </div>
          <div className="flex items-center gap-3 mr-12">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-white text-accent-600 hover:bg-primary-100 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-primary-50 dark:bg-primary-900">
          {/* Personal Info Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-accent-500" aria-hidden="true" />
              Personal Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-primary-700 shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-accent-500 flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
                      {cvData.personalInfo.name.charAt(0) || '?'}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-accent-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-accent-700 shadow-lg transition-colors">
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <Camera className="w-4 h-4 text-white" aria-hidden="true" />
                  </label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={cvData.personalInfo.name}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    placeholder="Full Name *"
                    className="input-primary font-semibold text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  value={cvData.personalInfo.email}
                  onChange={(e) => updatePersonalInfo('email', e.target.value)}
                  placeholder="Email *"
                  className="input-primary"
                />
                <input
                  type="tel"
                  value={cvData.personalInfo.phone}
                  onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                  placeholder="Phone"
                  className="input-primary"
                />
              </div>

              <input
                type="text"
                value={cvData.personalInfo.location}
                onChange={(e) => updatePersonalInfo('location', e.target.value)}
                placeholder="Location (City, Country)"
                className="input-primary"
              />

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  value={cvData.personalInfo.age || ''}
                  onChange={(e) => updatePersonalInfo('age', e.target.value)}
                  placeholder="Age"
                  min="18"
                  max="99"
                  className="input-primary"
                />
                <input
                  type="text"
                  value={cvData.personalInfo.languages || ''}
                  onChange={(e) => updatePersonalInfo('languages', e.target.value)}
                  placeholder="Languages"
                  className="input-primary col-span-2"
                />
              </div>

              <input
                type="text"
                value={cvData.personalInfo.portfolio || ''}
                onChange={(e) => updatePersonalInfo('portfolio', e.target.value)}
                placeholder="Portfolio / Website URL"
                className="input-primary"
              />
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-500" aria-hidden="true" />
              Professional Summary
            </h3>
            <textarea
              value={cvData.summary}
              onChange={(e) => setCvData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Write a brief summary of your professional background, key achievements, and career goals..."
              rows={4}
              className="textarea-primary resize-none"
            />
          </div>

          {/* Experience Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent-500" aria-hidden="true" />
                Work Experience
              </h3>
              <button
                onClick={addExperience}
                className="px-4 py-2 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-xl hover:bg-success-100 dark:hover:bg-success-900/50 font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {cvData.experiences.map((exp, index) => (
                <div key={exp.id} className="bg-primary-50 dark:bg-primary-900/50 rounded-xl p-5 pt-2 border-2 border-primary-200 dark:border-primary-700 relative">
                  <button
                    onClick={() => removeExperience(exp.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-error-100 dark:hover:bg-error-900/30 transition-all"
                    aria-label="Remove experience"
                  >
                    <X className="w-4 h-4 text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors" aria-hidden="true" />
                  </button>

                  <div className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        placeholder="Company Name *"
                        className="input-primary font-semibold"
                      />
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                        placeholder="Job Title *"
                        className="input-primary font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-center">
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                        placeholder="Start Date (e.g., Sep 2020)"
                        className="input-primary"
                      />
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                        placeholder="End Date (e.g., Jul 2023)"
                        disabled={exp.current}
                        className="input-primary disabled:opacity-50"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                          className="w-4 h-4 rounded border-primary-300 dark:border-primary-600 text-accent-600 focus:ring-accent-500"
                        />
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Currently working here</span>
                      </label>
                    </div>

                    <textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                      placeholder="Describe your responsibilities, achievements, and key projects..."
                      rows={3}
                      className="textarea-primary resize-none"
                    />
                  </div>
                </div>
              ))}

              {cvData.experiences.length === 0 && (
                <div className="text-center py-8 text-primary-500 dark:text-primary-400">
                  No experiences added yet. Click &quot;Add Experience&quot; to start.
                </div>
              )}
            </div>
          </div>

          {/* Education Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-accent-500" aria-hidden="true" />
                Education
              </h3>
              <button
                onClick={addEducation}
                className="px-4 py-2 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-xl hover:bg-success-100 dark:hover:bg-success-900/50 font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Education
              </button>
            </div>

            <div className="space-y-4">
              {cvData.education.map((edu) => (
                <div key={edu.id} className="bg-primary-50 dark:bg-primary-900/50 rounded-xl p-5 pt-2 border-2 border-primary-200 dark:border-primary-700 relative">
                  <button
                    onClick={() => removeEducation(edu.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-error-100 dark:hover:bg-error-900/30 transition-all"
                    aria-label="Remove education"
                  >
                    <X className="w-4 h-4 text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors" aria-hidden="true" />
                  </button>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                      placeholder="Institution *"
                      className="input-primary font-semibold"
                    />
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                      placeholder="Degree *"
                      className="input-primary"
                    />
                    <input
                      type="text"
                      value={edu.field}
                      onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                      placeholder="Field of Study"
                      className="input-primary"
                    />
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) => updateEducation(edu.id, 'year', e.target.value)}
                      placeholder="Year (e.g., 2020-2024)"
                      className="input-primary"
                    />
                  </div>
                </div>
              ))}

              {cvData.education.length === 0 && (
                <div className="text-center py-8 text-primary-500 dark:text-primary-400">
                  No education added yet. Click &quot;Add Education&quot; to start.
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent-500" aria-hidden="true" />
              Skills
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill (e.g., Figma, JavaScript, Project Management)"
                className="input-primary flex-1"
              />
              <button
                onClick={addSkill}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {cvData.skills.map((skill, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full font-medium flex items-center gap-2"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-accent-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            {cvData.skills.length === 0 && (
              <div className="text-center py-8 text-primary-500 dark:text-primary-400">
                No skills added yet. Add your technical and soft skills above.
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div className="bg-white dark:bg-primary-800 rounded-2xl p-6 border-2 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-50 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-accent-500" aria-hidden="true" />
                Key Projects
              </h3>
              <button
                onClick={addProject}
                className="px-4 py-2 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-xl hover:bg-success-100 dark:hover:bg-success-900/50 font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Project
              </button>
            </div>

            <div className="space-y-4">
              {(cvData.projects || []).map((project) => (
                <div key={project.id} className="bg-primary-50 dark:bg-primary-900/50 rounded-xl p-5 pt-2 border-2 border-primary-200 dark:border-primary-700 relative">
                  <button
                    onClick={() => removeProject(project.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-error-100 dark:hover:bg-error-900/30 transition-all"
                    aria-label="Remove project"
                  >
                    <X className="w-4 h-4 text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors" aria-hidden="true" />
                  </button>

                  <div className="space-y-3 mt-4">
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                      placeholder="Project Name *"
                      className="input-primary font-semibold"
                    />
                    <textarea
                      value={project.description}
                      onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                      placeholder="Brief description with impact metrics..."
                      rows={2}
                      className="textarea-primary resize-none"
                    />
                  </div>
                </div>
              ))}

              {(!cvData.projects || cvData.projects.length === 0) && (
                <div className="text-center py-8 text-primary-500 dark:text-primary-400">
                  No projects added yet. Click &quot;Add Project&quot; to add key projects.
                </div>
              )}
            </div>
          </div>

          {/* Delete Application Section */}
          {onDeleteApplication && (
            <div className="bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-error-900 dark:text-error-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                Danger Zone
              </h3>
              <p className="text-sm text-error-700 dark:text-error-400 mb-4">
                Once you delete this application, there is no going back. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-3 bg-error-600 text-white rounded-xl hover:bg-error-700 font-semibold transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Delete Application
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteApplication}
                    className="px-6 py-3 bg-error-600 text-white rounded-xl hover:bg-error-700 font-semibold transition-colors"
                  >
                    Yes, Delete Forever
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
