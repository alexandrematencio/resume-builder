import React, { useState, useEffect, useRef } from 'react';
import { Crown, Zap, Flag, Rocket } from 'lucide-react';
import { Application, CVVersion, CoverLetter, CoverLetterStyle, RecipientInfo } from '../types';
import CVEditor from './CVEditor';
import CoverLetterModal from './CoverLetterModal';
import CoverLetterEditor from './CoverLetterEditor';
import CVRenderer, { CVData } from './CVRenderer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useProfile } from '../contexts/ProfileContext';

const STYLE_INFO = {
  french_formal: {
    name: 'French Formal',
    Icon: Crown,
  },
  french_modern: {
    name: 'French Modern',
    Icon: Zap,
  },
  american_standard: {
    name: 'American Standard',
    Icon: Flag,
  },
  american_creative: {
    name: 'American Creative',
    Icon: Rocket,
  }
};

interface CVDetailModalProps {
  application: Application;
  onClose: () => void;
  onUpdateCV: (appId: string, cvId: string, newContent: string) => void;
  onSetMainVersion: (cvId: string) => void;
  onDownloadCV: (cv: CVVersion, app: Application) => void;
  onDeleteApplication?: () => void;
  onCreateNewVersion?: (currentCvId: string) => string | void;
  onDeleteCV?: (cvId: string) => void;
  // Cover letter props
  onCreateCoverLetter?: (appId: string, style: CoverLetterStyle, recipientInfo: RecipientInfo, availabilityDate?: string) => Promise<string | void>;
  onUpdateCoverLetter?: (appId: string, coverLetterId: string, newContent: string) => void;
  onDeleteCoverLetter?: (appId: string, coverLetterId: string) => void;
  onCreateNewCoverLetterVersion?: (appId: string, currentCoverLetterId: string) => string | void;
  onDownloadCoverLetter?: (coverLetter: CoverLetter, app: Application) => void;
  onSetMainCoverLetter?: (appId: string, coverLetterId: string) => void;
  // Status action props
  onMarkAsSent?: (appId: string) => void;
  onScheduleInterview?: (appId: string) => void;
  onMarkOffer?: (appId: string) => void;
  onMarkRejected?: (appId: string) => void;
  onDeclineOffer?: (appId: string) => void;
}

export default function CVDetailModal({
  application,
  onClose,
  onUpdateCV,
  onSetMainVersion,
  onDownloadCV,
  onDeleteApplication,
  onCreateNewVersion,
  onDeleteCV,
  onCreateCoverLetter,
  onUpdateCoverLetter,
  onDeleteCoverLetter,
  onCreateNewCoverLetterVersion,
  onDownloadCoverLetter,
  onSetMainCoverLetter,
  onMarkAsSent,
  onScheduleInterview,
  onMarkOffer,
  onMarkRejected,
  onDeclineOffer,
}: CVDetailModalProps) {
  // Get user profile for pre-filling age
  const { profile } = useProfile();

  // Tab state: 'cv', 'cover-letter', or 'job-offer'
  const [activeTab, setActiveTab] = useState<'cv' | 'cover-letter' | 'job-offer'>('cv');

  // CV states
  const [selectedCVId, setSelectedCVId] = useState(
    application.cvVersions[0]?.id || ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [pendingNewVersionId, setPendingNewVersionId] = useState<string | null>(null);
  // Download menu state (which CV id has its download menu open)
  const [downloadMenuOpenId, setDownloadMenuOpenId] = useState<string | null>(null);

  // Cover Letter states
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState(
    application.coverLetters[0]?.id || ''
  );
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [showCoverLetterEditor, setShowCoverLetterEditor] = useState(false);
  const [isCoverLetterEditing, setIsCoverLetterEditing] = useState(false);
  const [coverLetterEditContent, setCoverLetterEditContent] = useState('');
  const [pendingNewCoverLetterId, setPendingNewCoverLetterId] = useState<string | null>(null);

  const selectedCV = application.cvVersions.find(cv => cv.id === selectedCVId);
  const mainCV = application.cvVersions[0]; // First one is main
  const selectedCoverLetter = application.coverLetters.find(cl => cl.id === selectedCoverLetterId);

  // Ref for PDF generation
  const cvRendererRef = useRef<HTMLDivElement>(null);

  // PDF download handler for JSON CVs
  const handleDownloadPDF = async () => {
    if (!cvRendererRef.current || !selectedCV || !jsonCVData) return;

    try {
      // Capture the CV element as canvas
      const canvas = await html2canvas(cvRendererRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // For external images
        logging: false,
        backgroundColor: '#ffffff'
      });

      // A4 dimensions in mm
      const imgWidth = 210;
      const imgHeight = 297;

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Convert canvas to image and add to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Download
      const fileName = `CV_${application.company}_${application.role}_v${selectedCV.version}.pdf`.replace(/\s+/g, '_');
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    }
  };

  // When a new version is created, wait for it to appear in application.cvVersions
  useEffect(() => {
    if (pendingNewVersionId) {
      const versionExists = application.cvVersions.find(cv => cv.id === pendingNewVersionId);
      if (versionExists) {
        // Version now exists in the application, safe to open editor
        setShowEditor(true);
        setPendingNewVersionId(null);
      }
    }
  }, [application.cvVersions, pendingNewVersionId]);

  const handleEdit = () => {
    if (selectedCV) {
      setEditContent(selectedCV.content);
      setIsEditing(true);
    }
  };

  const handleOpenEditor = () => {
    setShowEditor(true);
  };

  const handleSaveFromEditor = (cvData: any) => {
    // Check if the original CV was in JSON format
    const currentCV = application.cvVersions.find(cv => cv.id === selectedCVId);
    const wasJSON = currentCV ? isJSONContent(currentCV.content) : false;

    let cvContent: string;

    if (wasJSON) {
      // Convert CVContent back to JSON format
      const jsonCV = {
        personalInfo: {
          name: cvData.personalInfo.name,
          firstName: cvData.personalInfo.name.split(' ')[0] || '',
          lastName: cvData.personalInfo.name.split(' ').slice(1).join(' ') || '',
          age: cvData.personalInfo.age ? parseInt(cvData.personalInfo.age) : null,
          languages: cvData.personalInfo.languages || null,
          address: cvData.personalInfo.location,
          email: cvData.personalInfo.email,
          phone: cvData.personalInfo.phone,
          portfolio: cvData.personalInfo.portfolio || null,
          photo: cvData.personalInfo.photo || null,
        },
        profile: {
          text: cvData.summary || '',
          availability: 'Disponible immédiatement',
        },
        skills: {
          technical: cvData.skills.slice(0, Math.ceil(cvData.skills.length * 0.6)),
          marketing: cvData.skills.slice(Math.ceil(cvData.skills.length * 0.6)),
          soft: [],
        },
        experiences: cvData.experiences.map((exp: any) => ({
          id: exp.id,
          company: exp.company,
          jobTitle: exp.title,
          period: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`,
          industry: '',
          achievements: exp.description.split('\n').filter((line: string) => line.trim()),
        })),
        projects: (cvData.projects || []).map((proj: any) => ({
          id: proj.id,
          name: proj.name,
          description: proj.description,
        })),
        education: cvData.education.map((edu: any) => ({
          id: edu.id,
          institution: edu.institution,
          years: edu.year,
          degree: edu.degree,
          specialization: edu.field,
        })),
      };
      cvContent = JSON.stringify(jsonCV, null, 2);
    } else {
      // Convert to markdown text format for legacy CVs
      cvContent = formatCVData(cvData);
    }

    onUpdateCV(application.id, selectedCVId, cvContent);
    setShowEditor(false);
  };

  const createNewVersion = () => {
    if (onCreateNewVersion) {
      const newVersionId = onCreateNewVersion(selectedCVId);
      // Switch to new version and wait for it to appear in application.cvVersions
      if (typeof newVersionId === 'string') {
        setSelectedCVId(newVersionId);
        setPendingNewVersionId(newVersionId);
        // The useEffect will open the editor once the version appears in application.cvVersions
      }
    }
  };

  // Cover Letter Handlers
  const handleCoverLetterEdit = () => {
    setShowCoverLetterEditor(true);
  };

  const handleCoverLetterEditSimple = () => {
    if (selectedCoverLetter) {
      setCoverLetterEditContent(selectedCoverLetter.content);
      setIsCoverLetterEditing(true);
    }
  };

  const handleCoverLetterSaveFromEditor = (updatedLetter: { recipientInfo: RecipientInfo; content: string }) => {
    if (onUpdateCoverLetter && selectedCoverLetterId) {
      // Call the parent update handler with the new content
      onUpdateCoverLetter(application.id, selectedCoverLetterId, updatedLetter.content);
      setShowCoverLetterEditor(false);
    }
  };

  const handleCoverLetterSave = () => {
    if (onUpdateCoverLetter && selectedCoverLetterId) {
      onUpdateCoverLetter(application.id, selectedCoverLetterId, coverLetterEditContent);
      setIsCoverLetterEditing(false);
    }
  };

  const handleCoverLetterCancel = () => {
    setIsCoverLetterEditing(false);
    setCoverLetterEditContent('');
  };

  // PDF download handler for cover letters
  const coverLetterRef = useRef<HTMLDivElement>(null);

  const handleDownloadCoverLetterPDF = async (letter: CoverLetter) => {
    // Extract sender info from the main CV
    let senderInfo = { name: '', email: '', phone: '', address: '' };
    const mainCV = application.cvVersions[0];

    if (mainCV && mainCV.content) {
      const content = mainCV.content.trim();

      // Try JSON format first
      if (content.startsWith('{')) {
        try {
          const jsonData = JSON.parse(content);
          if (jsonData.personalInfo) {
            senderInfo = {
              name: jsonData.personalInfo.name || '',
              email: jsonData.personalInfo.email || '',
              phone: jsonData.personalInfo.phone || '',
              address: jsonData.personalInfo.address || ''
            };
          }
        } catch (e) {
          // Fall through to text parsing
        }
      }

      // Text format parsing
      if (!senderInfo.name) {
        const lines = mainCV.content.split('\n').slice(0, 5);
        senderInfo.name = lines[0]?.trim() || '';
        const contactLine = lines.find(l => l.includes('@') || l.includes('|'));
        if (contactLine) {
          const parts = contactLine.split('|').map(p => p.trim());
          senderInfo.email = parts.find(p => p.includes('@')) || '';
          senderInfo.phone = parts.find(p => /\d/.test(p) && !p.includes('@')) || '';
        }
        senderInfo.address = lines[2]?.trim() || '';
      }
    }

    // Parse letter content to extract body (remove header generated by AI)
    // This uses the same robust filtering as the preview mode
    const letterLines = letter.content.split('\n');
    let bodyStartIndex = 0;

    // Robust header filtering: Skip everything until we reach "Objet:"
    for (let i = 0; i < Math.min(15, letterLines.length); i++) {
      const line = letterLines[i].trim();
      const lowerLine = line.toLowerCase();

      // If we find "Objet:", start from here
      if (lowerLine.startsWith('objet')) {
        bodyStartIndex = i;
        break;
      }

      // Skip lines that are part of unwanted header
      if (!line || // Empty lines
          line === senderInfo.name || // Sender name
          line.includes('@') || // Email
          line.includes('|') || // Contact separator
          /^[\d\s\-\+\(\)]+$/.test(line) || // Phone numbers
          /^\d+/.test(line) && /(?:rue|avenue|blvd|boulevard|chemin|impasse|place)/i.test(line) || // Address lines
          /(?:rue|avenue|blvd|boulevard|chemin|impasse|place)\s+/i.test(line) || // Address lines
          /^\d{5}/.test(line) || // Postal codes
          /^\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i.test(line) || // Dates
          /^le\s+\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i.test(line) || // Dates with "Le"
          /^\d{2}\/\d{2}\/\d{4}/.test(line) || // Numeric dates
          lowerLine.includes('téléphone') || lowerLine.includes('tel :') || lowerLine.includes('tel:') || // Phone labels
          lowerLine.includes('email :') || lowerLine.includes('email:') || // Email labels
          lowerLine.includes('portfolio') || lowerLine.includes('www.') || lowerLine.includes('http') || // Portfolio/website
          lowerLine.startsWith('a destination') || lowerLine.startsWith('à destination')) { // Recipient header
        bodyStartIndex = i + 1;
      }
    }

    const bodyContent = letterLines.slice(bodyStartIndex).join('\n');

    // Create a temporary container to render the cover letter
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    tempContainer.style.minHeight = '297mm';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '48px';
    document.body.appendChild(tempContainer);

    // Build HTML for the new layout
    let html = '<div style="color: #1f2937; line-height: 1.6;">';

    // Header with columns
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 32px; font-size: 14px;">';

    // Sender column
    html += '<div style="flex: 1;">';
    html += `<p style="font-weight: 600; color: #111827; margin-bottom: 4px;">${senderInfo.name}</p>`;
    if (senderInfo.email) html += `<p style="color: #374151; margin-bottom: 4px;">${senderInfo.email}</p>`;
    if (senderInfo.phone) html += `<p style="color: #374151; margin-bottom: 4px;">${senderInfo.phone}</p>`;
    if (senderInfo.address) html += `<p style="color: #374151;">${senderInfo.address}</p>`;
    html += '</div>';

    // Recipient column
    html += '<div style="flex: 1;">';
    html += '<p style="font-weight: 600; color: #111827; margin-bottom: 4px;">À destination de:</p>';
    html += `<p style="font-weight: 600; color: #111827; margin-bottom: 4px;">${letter.recipientInfo.companyName}</p>`;
    if (letter.recipientInfo.recipientTitle) {
      html += `<p style="color: #374151; margin-bottom: 4px;">${letter.recipientInfo.recipientTitle}`;
      if (letter.recipientInfo.recipientName) html += ` - ${letter.recipientInfo.recipientName}`;
      html += '</p>';
    } else if (letter.recipientInfo.recipientName) {
      html += `<p style="color: #374151; margin-bottom: 4px;">${letter.recipientInfo.recipientName}</p>`;
    }
    if (letter.recipientInfo.address) {
      html += `<p style="color: #374151; margin-bottom: 4px;">${letter.recipientInfo.address}</p>`;
    }
    if (letter.recipientInfo.postalCode || letter.recipientInfo.city) {
      html += `<p style="color: #374151;">${letter.recipientInfo.postalCode || ''} ${letter.recipientInfo.city || ''}</p>`;
    }
    html += '</div>';
    html += '</div>';

    // Date
    const dateStr = new Date(letter.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    html += `<div style="margin-bottom: 12px; font-size: 14px; color: #374151;">${dateStr}</div>`;

    // Letter body
    bodyContent.split('\n').forEach(line => {
      const cleanedLine = line.replace(/\*\*/g, '').replace(/\*/g, '');

      const isObjectLine = cleanedLine.toLowerCase().startsWith('objet:') ||
        cleanedLine.toLowerCase().startsWith('object:') ||
        cleanedLine.toLowerCase().startsWith('subject:') ||
        cleanedLine.toLowerCase().startsWith('re:');

      if (isObjectLine) {
        html += `<p style="font-weight: bold; margin-bottom: 24px; color: #111827;">${cleanedLine}</p>`;
      } else if (cleanedLine.trim() === '') {
        html += '<br/>';
      } else {
        html += `<p style="font-size: 14px; margin-bottom: 8px; color: #1f2937; line-height: 1.6;">${cleanedLine}</p>`;
      }
    });

    html += '</div>';

    tempContainer.innerHTML = html;

    try {
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

      const fileName = `CoverLetter_${application.company}_${application.role}_v${letter.version}.pdf`.replace(/\s+/g, '_');
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleDownloadCVPdfFor = (cv: CVVersion) => {
    // Ensure selectedCV is the one we want, then generate PDF
    setSelectedCVId(cv.id);
    // Slight delay to allow selectedCV state to update and renderer to be available
    setTimeout(() => {
      handleDownloadPDF();
    }, 120);
  };

  const handleGenerateCoverLetter = async (style: CoverLetterStyle, recipientInfo: RecipientInfo, availabilityDate?: string) => {
    if (onCreateCoverLetter) {
      try {
        const newId = await onCreateCoverLetter(application.id, style, recipientInfo, availabilityDate);
        if (newId && typeof newId === 'string') {
          setSelectedCoverLetterId(newId);
          setActiveTab('cover-letter');
        }
        setShowCoverLetterModal(false);
      } catch (error) {
        console.error('Failed to generate cover letter:', error);
      }
    }
  };

  const formatCVData = (cvData: any): string => {
    let text = '';
    
    // Personal Info
    text += `${cvData.personalInfo.name}\n`;
    text += `${cvData.personalInfo.email} | ${cvData.personalInfo.phone}\n`;
    text += `${cvData.personalInfo.location}\n\n`;
    
    // Summary
    if (cvData.summary) {
      text += `PROFESSIONAL SUMMARY\n`;
      text += `${cvData.summary}\n\n`;
    }
    
    // Experience
    if (cvData.experiences.length > 0) {
      text += `WORK EXPERIENCE\n\n`;
      cvData.experiences.forEach((exp: any) => {
        text += `${exp.title} at ${exp.company}\n`;
        text += `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}\n`;
        text += `${exp.description}\n\n`;
      });
    }
    
    // Education
    if (cvData.education.length > 0) {
      text += `EDUCATION\n\n`;
      cvData.education.forEach((edu: any) => {
        text += `${edu.degree} in ${edu.field}\n`;
        text += `${edu.institution} - ${edu.year}\n\n`;
      });
    }
    
    // Skills
    if (cvData.skills.length > 0) {
      text += `SKILLS\n`;
      text += cvData.skills.join(', ');
    }
    
    return text;
  };

  const handleSave = () => {
    if (selectedCV) {
      onUpdateCV(application.id, selectedCV.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  // Parse CV content into sections (simple text parsing)
  const parseCV = (content: string) => {
    const lines = content.split('\n');
    const sections: { [key: string]: string[] } = {
      header: [],
      summary: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      languages: [],
      certifications: [],
      other: [],
    };

    let currentSection = 'header';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check for section headers (skip the header line itself and markdown markers)
      if (lowerLine.includes('experience') || lowerLine.includes('expérience') || lowerLine.includes('parcours professionnel')) {
        currentSection = 'experience';
        continue;
      } else if (lowerLine.includes('education') || lowerLine.includes('études') || lowerLine.includes('formation')) {
        currentSection = 'education';
        continue;
      } else if (lowerLine.includes('compétence') || lowerLine.includes('skills') || lowerLine.includes('technical') || lowerLine.includes('savoir-faire')) {
        currentSection = 'skills';
        continue;
      } else if (lowerLine.includes('projet') || lowerLine.includes('réalisation')) {
        currentSection = 'projects';
        continue;
      } else if (lowerLine.includes('langue') || lowerLine.includes('language')) {
        currentSection = 'languages';
        continue;
      } else if (lowerLine.includes('certification') || lowerLine.includes('diplôme')) {
        currentSection = 'certifications';
        continue;
      } else if (lowerLine.includes('summary') || lowerLine.includes('profil') || lowerLine.includes('about') || lowerLine.includes('à propos')) {
        currentSection = 'summary';
        continue;
      }

      if (line.trim()) {
        // Clean markdown syntax from lines
        let cleanedLine = line
          .replace(/^#{1,6}\s+/g, '') // Remove markdown headers (###, ##, #)
          .replace(/\*\*/g, ''); // Remove bold markers

        sections[currentSection].push(cleanedLine);
      }
    }

    return sections;
  };

  const cvSections = selectedCV ? parseCV(selectedCV.content) : null;

  // Check if CV content is JSON format
  const isJSONContent = (content: string): boolean => {
    try {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        JSON.parse(trimmed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Parse JSON CV content
  const parseJSONContent = (content: string): CVData | null => {
    try {
      const trimmed = content.trim();
      const parsed = JSON.parse(trimmed);
      // Validate it has the expected structure
      if (parsed.personalInfo && parsed.experiences && parsed.education) {
        return parsed as CVData;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isJSON = selectedCV ? isJSONContent(selectedCV.content) : false;
  const jsonCVData = isJSON && selectedCV ? parseJSONContent(selectedCV.content) : null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-7xl w-full h-[90vh] flex overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar - Tabs for CV and Cover Letter */}
        <div className="w-80 bg-gray-50 border-r flex flex-col">
          {/* Tab Selector - Material Design Style */}
          <div className="px-2 pt-3 pb-0 bg-gray-100 border-b border-gray-200">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('cv')}
                className={`flex-1 px-4 py-2.5 font-medium transition-all relative ${
                  activeTab === 'cv'
                    ? 'bg-white text-primary-700 rounded-t-xl border-t-2 border-primary-600'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50/50 rounded-t-lg'
                }`}
                style={activeTab === 'cv' ? { marginBottom: '-1px' } : {}}
              >
                <span className="flex items-center justify-center gap-2">
                  📄 <span>CV</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('cover-letter')}
                className={`flex-1 px-4 py-2.5 font-medium transition-all relative ${
                  activeTab === 'cover-letter'
                    ? 'bg-white text-primary-700 rounded-t-xl border-t-2 border-primary-600'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50/50 rounded-t-lg'
                }`}
                style={activeTab === 'cover-letter' ? { marginBottom: '-1px' } : {}}
              >
                <span className="flex items-center justify-center gap-2">
                  ✉️ <span>Letter</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('job-offer')}
                className={`flex-1 px-4 py-2.5 font-medium transition-all relative ${
                  activeTab === 'job-offer'
                    ? 'bg-white text-primary-700 rounded-t-xl border-t-2 border-primary-600'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50/50 rounded-t-lg'
                }`}
                style={activeTab === 'job-offer' ? { marginBottom: '-1px' } : {}}
              >
                <span className="flex items-center justify-center gap-2">
                  📋 <span>Job</span>
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content Header */}
          <div className="p-6 bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeTab === 'cv' ? 'CV Versions' : activeTab === 'cover-letter' ? 'Cover Letters' : 'Original Job Posting'}
            </h3>
            <p className="text-sm text-gray-600">
              {activeTab === 'cv'
                ? `${application.cvVersions.length} version${application.cvVersions.length > 1 ? 's' : ''}`
                : activeTab === 'cover-letter'
                ? `${application.coverLetters.length} letter${application.coverLetters.length > 1 ? 's' : ''}`
                : application.jobDescription ? 'Saved with this application' : 'No description saved'
              }
            </p>
            <div className="mt-4 border-b border-gray-200"></div>
          </div>

          {/* CV Tab Content */}
          {activeTab === 'cv' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {application.cvVersions.map((cv, index) => {
              const isMain = index === 0;
              const isSelected = cv.id === selectedCVId;

              return (
                <div
                  key={cv.id}
                  onClick={() => setSelectedCVId(cv.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-50 border border-primary-500 shadow-md'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isMain && <span className="text-xl">⭐</span>}
                      <span className="font-semibold text-gray-900">
                        v{cv.version}
                      </span>
                    </div>
                    {isMain && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                        MAIN
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {new Date(cv.createdAt).toLocaleDateString()} at{' '}
                    {new Date(cv.createdAt).toLocaleTimeString()}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {!isMain ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetMainVersion(cv.id);
                          setSelectedCVId(cv.id);
                        }}
                        className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 font-medium"
                        title="Set as main"
                      >
                        ⭐
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadMenuOpenId(downloadMenuOpenId === cv.id ? null : cv.id);
                          }}
                          className={`text-xs px-3 py-1 rounded-lg font-medium ${
                            isSelected
                              ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Download options"
                          aria-haspopup="menu"
                          aria-expanded={downloadMenuOpenId === cv.id}
                        >
                          ⬇️ Download
                        </button>

                        {downloadMenuOpenId === cv.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadCV(cv, application);
                                setDownloadMenuOpenId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              title="Download CV (TXT)"
                            >
                              📥 TXT
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadCVPdfFor(cv);
                                setDownloadMenuOpenId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              title="Download CV (PDF)"
                            >
                              📥 PDF
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Duplicate button on the same line as downloads */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCreateNewVersion) {
                            const newId = onCreateNewVersion(cv.id as string);
                            if (newId) setSelectedCVId(newId as string);
                          }
                        }}
                        className="text-xs px-3 py-1 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 font-medium border border-sky-200"
                        title="Duplicate version"
                        aria-label="Duplicate version"
                      >
                        +
                      </button>

                      {application.cvVersions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteCV && window.confirm(`Delete version ${cv.version}? This cannot be undone.`)) {
                              onDeleteCV(cv.id);
                              // If deleting the selected CV, switch to main version
                              if (cv.id === selectedCVId) {
                                setSelectedCVId(application.cvVersions[0].id);
                              }
                            }
                          }}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
                          title="Delete CV version"
                        >
                          🗑️
                        </button>
                      )}
                              </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Create New Version Button */}
              <div className="p-4 border-t mt-auto">
                <button
                  onClick={createNewVersion}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-semibold transition-colors shadow-md"
                >
                  ✨ Create New Version
                </button>
              </div>
            </>
          )}

          {/* Cover Letter Tab Content */}
          {activeTab === 'cover-letter' && (
            <>
              {application.coverLetters.length === 0 ? (
                // No cover letters yet
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="text-6xl mb-4">✉️</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Cover Letters Yet</h3>
                    <p className="text-sm text-gray-600 mb-4">Generate your first cover letter for this application</p>
                    <button
                      onClick={() => setShowCoverLetterModal(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                    >
                      ✨ Generate Cover Letter
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {application.coverLetters.map((letter, index) => {
                      const isMain = index === 0;
                      const isSelected = letter.id === selectedCoverLetterId;

                      return (
                        <div
                          key={letter.id}
                          onClick={() => setSelectedCoverLetterId(letter.id)}
                          className={`p-4 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-50 border border-primary-500 shadow-md'
                              : 'bg-white border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isMain && <span className="text-xl">⭐</span>}
                              <span className="font-semibold text-gray-900">
                                v{letter.version}
                              </span>
                              <span className="px-2 py-1 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-xs font-semibold rounded-full flex items-center gap-1">
                                {(() => { const StyleIcon = STYLE_INFO[letter.style].Icon; return <StyleIcon className="w-3 h-3" aria-hidden="true" />; })()}
                                {STYLE_INFO[letter.style].name}
                              </span>
                            </div>
                            {isMain && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                MAIN
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-600 mb-2">
                            {letter.recipientInfo.companyName}
                            {letter.recipientInfo.recipientName && ` • ${letter.recipientInfo.recipientName}`}
                          </div>

                          <div className="text-xs text-gray-500 mb-3">
                            {new Date(letter.createdAt).toLocaleDateString()} at{' '}
                            {new Date(letter.createdAt).toLocaleTimeString()}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {!isMain ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSetMainCoverLetter) {
                                    onSetMainCoverLetter(application.id, letter.id);
                                    setSelectedCoverLetterId(letter.id);
                                  }
                                }}
                                className="text-xs px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 font-medium"
                                title="Set as main"
                              >
                                ⭐
                              </button>
                            ) : (
                              <div></div>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDownloadCoverLetter) {
                                    handleDownloadCoverLetterPDF(letter);
                                  }
                                }}
                                className={`text-xs px-3 py-1 rounded-lg font-medium ${
                                  isSelected
                                    ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                title="Download cover letter (PDF)"
                              >
                                📥 PDF
                              </button>

                              {/* Duplicate button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onCreateNewCoverLetterVersion) {
                                    const newId = onCreateNewCoverLetterVersion(application.id, letter.id);
                                    if (newId) setSelectedCoverLetterId(newId as string);
                                  }
                                }}
                                className="text-xs px-3 py-1 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 font-medium border border-sky-200"
                                title="Duplicate version"
                                aria-label="Duplicate version"
                              >
                                +
                              </button>

                              {application.coverLetters.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDeleteCoverLetter && window.confirm(`Delete cover letter version ${letter.version}? This cannot be undone.`)) {
                                      onDeleteCoverLetter(application.id, letter.id);
                                      // If deleting the selected letter, switch to main version
                                      if (letter.id === selectedCoverLetterId) {
                                        setSelectedCoverLetterId(application.coverLetters[0].id);
                                      }
                                    }
                                  }}
                                  className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium"
                                  title="Delete cover letter version"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Create New Cover Letter Button */}
                  <div className="p-4 border-t mt-auto">
                    <button
                      onClick={() => setShowCoverLetterModal(true)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-semibold transition-colors shadow-md"
                    >
                      ✨ Generate New Cover Letter
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Job Offer Tab Content */}
          {activeTab === 'job-offer' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="p-4 space-y-4">
                {application.jobUrl && (
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open original posting
                  </a>
                )}
                <p className="text-xs text-gray-500">
                  The full job description as saved when creating this application.
                </p>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {(onMarkAsSent || onScheduleInterview || onMarkOffer || onMarkRejected || onDeclineOffer) && (
            <div className="mt-auto p-4 border-t border-gray-200 bg-gray-50/50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Actions</p>
              <div className="flex flex-wrap gap-1.5">
                {onMarkAsSent && application.status === 'draft' && (
                  <button
                    onClick={() => onMarkAsSent(application.id)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-info-50 text-info-700 hover:bg-info-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Send
                  </button>
                )}
                {onScheduleInterview && application.status !== 'draft' && application.status !== 'rejected' && application.status !== 'closed' && (
                  <button
                    onClick={() => onScheduleInterview(application.id)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Interview
                  </button>
                )}
                {onMarkOffer && (application.status === 'interview' || application.status === 'waiting') && (
                  <button
                    onClick={() => onMarkOffer(application.id)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-success-50 text-success-700 hover:bg-success-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    Offer
                  </button>
                )}
                {onMarkRejected && application.status !== 'draft' && application.status !== 'rejected' && application.status !== 'closed' && application.status !== 'offer' && (
                  <button
                    onClick={() => onMarkRejected(application.id)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-error-50 text-error-700 hover:bg-error-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Rejected
                  </button>
                )}
                {onDeclineOffer && application.status === 'offer' && (
                  <button
                    onClick={() => onDeclineOffer(application.id)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-warning-50 text-warning-700 hover:bg-warning-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Decline
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content - CV or Cover Letter Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-white flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {application.company} - {application.role}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'cv'
                  ? selectedCV && `CV Version ${selectedCV.version}`
                  : activeTab === 'cover-letter'
                  ? selectedCoverLetter && `Cover Letter v${selectedCoverLetter.version}`
                  : 'Original Job Posting'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'cv' ? (
                // CV Actions
                !isEditing ? (
                  <>
                    <button
                      onClick={handleOpenEditor}
                      className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    {onDeleteApplication && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this entire application? This will remove all CVs and cover letters. This cannot be undone.')) {
                            onDeleteApplication();
                          }
                        }}
                        className="px-6 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-medium transition-colors border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                    >
                      💾 Save Changes
                    </button>
                  </>
                )
              ) : activeTab === 'cover-letter' ? (
                // Cover Letter Actions
                !isCoverLetterEditing ? (
                  <>
                    <button
                      onClick={handleCoverLetterEdit}
                      className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    {onDeleteApplication && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this entire application? This will remove all CVs and cover letters. This cannot be undone.')) {
                            onDeleteApplication();
                          }
                        }}
                        className="px-6 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-medium transition-colors border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCoverLetterCancel}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCoverLetterSave}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                    >
                      💾 Save Changes
                    </button>
                  </>
                )
              ) : null}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === 'cv' ? (
            // CV Content
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              {isEditing ? (
                // Edit Mode - Simple Textarea
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[600px] p-4 border-2 border-gray-200 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ) : (
                // Preview Mode - Formatted CV
                selectedCV && (
                  isJSON && jsonCVData ? (
                    // Render JSON-formatted CV with CVRenderer
                    <div ref={cvRendererRef}>
                      <CVRenderer data={jsonCVData} />
                    </div>
                  ) : cvSections ? (
                    // Render markdown/text CV with legacy format
                  <div className="bg-white shadow-2xl overflow-hidden" style={{ maxWidth: '210mm', margin: '0 auto' }}>
                    {/* CV Header - Style français sobre */}
                    <div className="border-b-4 border-primary-600 p-10" style={{ backgroundColor: 'var(--brand-primary)' }}>
                      {cvSections.header.map((line, i) => {
                        if (i === 0) {
                          // Name (first line) - Style épuré
                          return (
                            <h1 key={i} className="text-4xl font-bold text-white mb-3 uppercase tracking-wide">
                              {line}
                            </h1>
                          );
                        }
                        return (
                          <p key={i} className="text-white/90 text-sm leading-relaxed">
                            {line}
                          </p>
                        );
                      })}
                    </div>

                    <div className="p-10 space-y-6">
                      {/* Profil Section */}
                      {cvSections.summary.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Professional Profile
                          </h2>
                          <div className="text-gray-700 leading-relaxed text-sm pl-5">
                            {cvSections.summary.map((line, i) => (
                              <p key={i} className="mb-2">{line}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expérience Section */}
                      {cvSections.experience.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Work Experience
                          </h2>
                          <div className="space-y-4 pl-5">
                            {cvSections.experience.map((line, i) => {
                              // Detect date patterns (e.g., "Septembre 2017 - Juillet 2023", "Jan 2020 - Present")
                              const datePattern = /\|?\s*\*?(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\s*[\d\-\s]+(présent|present|aujourd'hui|\d{4})\*?/i;
                              const isDate = datePattern.test(line);

                              return (
                                <div key={i} className="text-gray-700 text-sm">
                                  {line.startsWith('-') || line.startsWith('•') || line.startsWith('*') ? (
                                    <div className="flex gap-2 ml-4">
                                      <span className="text-gray-400 mt-0.5">•</span>
                                      <span className="flex-1 leading-relaxed">{line.replace(/^[-•*]\s*/, '')}</span>
                                    </div>
                                  ) : isDate ? (
                                    // Date line - lighter, on its own line
                                    <p className="text-gray-500 text-xs mb-2 italic">{line.replace(/\|/g, '').replace(/\*/g, '').trim()}</p>
                                  ) : (
                                    // Title or content
                                    <p className="font-semibold text-gray-900 leading-relaxed mb-1">{line}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Education Section */}
                      {cvSections.education.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Education
                          </h2>
                          <div className="space-y-2 text-gray-700 text-sm pl-5">
                            {cvSections.education.map((line, i) => (
                              <p key={i} className="leading-relaxed">{line}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Skills Section */}
                      {cvSections.skills.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Skills
                          </h2>
                          <div className="pl-5 flex flex-wrap gap-2">
                            {cvSections.skills.map((line, i) => {
                              // Check if line is a category header (e.g., "## Technical Skills")
                              if (line.startsWith('##') || line.startsWith('**')) {
                                return null; // Skip category headers
                              }
                              // Split by commas, bullets, or pipes
                              const skills = line.split(/[,•|]/).map(s => s.trim()).filter(Boolean);
                              // Always use pills for consistent formatting
                              return skills.map((skill, j) => (
                                <span
                                  key={`${i}-${j}`}
                                  className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                                >
                                  {skill}
                                </span>
                              ));
                            })}
                          </div>
                        </div>
                      )}

                      {/* Projets Section */}
                      {cvSections.projects.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Key Projects
                          </h2>
                          <div className="space-y-3 text-gray-700 text-sm pl-5">
                            {cvSections.projects.map((line, i) => {
                              if (line.startsWith('**') || line.includes('**')) {
                                return <p key={i} className="font-bold text-gray-800 mt-2">{line.replace(/\*\*/g, '')}</p>;
                              }
                              if (line.startsWith('-') || line.startsWith('•')) {
                                return (
                                  <div key={i} className="flex gap-2 ml-4">
                                    <span className="text-gray-400 mt-0.5">•</span>
                                    <span className="flex-1">{line.replace(/^[-•]\s*/, '')}</span>
                                  </div>
                                );
                              }
                              return <p key={i} className="leading-relaxed">{line}</p>;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Languages Section */}
                      {cvSections.languages.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Languages
                          </h2>
                          <div className="space-y-1 text-gray-700 text-sm pl-5">
                            {cvSections.languages.map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certifications Section */}
                      {cvSections.certifications.length > 0 && (
                        <div className="mb-6">
                          <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2 border-l-4 border-primary-600 pl-3">
                            Certifications
                          </h2>
                          <div className="space-y-1 text-gray-700 text-sm pl-5">
                            {cvSections.certifications.map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Content */}
                      {cvSections.other.length > 0 && (
                        <div className="text-gray-700 space-y-2">
                          {cvSections.other.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  ) : null
                )
              )}
            </div>
          </div>
          ) : activeTab === 'cover-letter' ? (
            // Cover Letter Content
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                {application.coverLetters.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-6xl mb-4">✉️</p>
                    <p className="text-xl font-semibold mb-2">No cover letters yet</p>
                    <p className="text-sm">Click "Generate New Letter" in the sidebar to create your first cover letter</p>
                  </div>
                ) : isCoverLetterEditing ? (
                  // Edit Mode - Simple Textarea
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">Edit Cover Letter</h3>
                    <textarea
                      value={coverLetterEditContent}
                      onChange={(e) => setCoverLetterEditContent(e.target.value)}
                      className="w-full h-[600px] p-4 border-2 border-gray-200 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ) : (
                  // Preview Mode - Formatted Cover Letter
                  selectedCoverLetter && (() => {
                    // Extract sender info from the main CV
                    let senderInfo = { name: '', email: '', phone: '', address: '' };
                    const mainCV = application.cvVersions[0];

                    if (mainCV && mainCV.content) {
                      const content = mainCV.content.trim();

                      // Try JSON format first
                      if (content.startsWith('{')) {
                        try {
                          const jsonData = JSON.parse(content);
                          if (jsonData.personalInfo) {
                            senderInfo = {
                              name: jsonData.personalInfo.name || '',
                              email: jsonData.personalInfo.email || '',
                              phone: jsonData.personalInfo.phone || '',
                              address: jsonData.personalInfo.address || ''
                            };
                          }
                        } catch (e) {
                          // Fall through to text parsing
                        }
                      }

                      // Text format parsing
                      if (!senderInfo.name) {
                        const lines = mainCV.content.split('\n').slice(0, 5);
                        senderInfo.name = lines[0]?.trim() || '';
                        const contactLine = lines.find(l => l.includes('@') || l.includes('|'));
                        if (contactLine) {
                          const parts = contactLine.split('|').map(p => p.trim());
                          senderInfo.email = parts.find(p => p.includes('@')) || '';
                          senderInfo.phone = parts.find(p => /\d/.test(p) && !p.includes('@')) || '';
                        }
                        senderInfo.address = lines[2]?.trim() || '';
                      }
                    }

                    // Parse letter content to extract body (remove header generated by AI)
                    const letterLines = selectedCoverLetter.content.split('\n');
                    let bodyStartIndex = 0;

                    // Robust header filtering: Skip everything until we reach "Objet:"
                    // This handles cases where AI adds unwanted header info despite instructions
                    for (let i = 0; i < Math.min(15, letterLines.length); i++) {
                      const line = letterLines[i].trim();
                      const lowerLine = line.toLowerCase();

                      // If we find "Objet:", start from here
                      if (lowerLine.startsWith('objet')) {
                        bodyStartIndex = i;
                        break;
                      }

                      // Skip lines that are part of unwanted header
                      if (!line || // Empty lines
                          line === senderInfo.name || // Sender name
                          line.includes('@') || // Email
                          line.includes('|') || // Contact separator
                          /^[\d\s\-\+\(\)]+$/.test(line) || // Phone numbers (only digits, spaces, dashes, parens, plus)
                          /^\d+/.test(line) && /(?:rue|avenue|blvd|boulevard|chemin|impasse|place)/i.test(line) || // Address lines starting with number
                          /(?:rue|avenue|blvd|boulevard|chemin|impasse|place)\s+/i.test(line) || // Address lines with street type
                          /^\d{5}/.test(line) || // Postal codes
                          /^\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i.test(line) || // Dates
                          /^le\s+\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i.test(line) || // Dates with "Le"
                          /^\d{2}\/\d{2}\/\d{4}/.test(line) || // Numeric dates
                          lowerLine.includes('téléphone') || lowerLine.includes('tel :') || lowerLine.includes('tel:') || // Phone labels
                          lowerLine.includes('email :') || lowerLine.includes('email:') || // Email labels
                          lowerLine.includes('portfolio') || lowerLine.includes('www.') || lowerLine.includes('http') || // Portfolio/website
                          lowerLine.startsWith('a destination') || lowerLine.startsWith('à destination')) { // Recipient header
                        bodyStartIndex = i + 1;
                      }
                    }

                    const bodyContent = letterLines.slice(bodyStartIndex).join('\n');

                    return (
                      <div className="bg-white shadow-2xl overflow-hidden" style={{ maxWidth: '210mm', minHeight: '297mm', margin: '0 auto' }}>
                        <div className="p-12">
                          {/* Header with sender and recipient in columns */}
                          <div className="flex justify-between mb-8 text-sm">
                            {/* Sender info - Left column */}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{senderInfo.name}</p>
                              {senderInfo.email && <p className="text-gray-700">{senderInfo.email}</p>}
                              {senderInfo.phone && <p className="text-gray-700">{senderInfo.phone}</p>}
                              {senderInfo.address && <p className="text-gray-700">{senderInfo.address}</p>}
                            </div>

                            {/* Recipient info - Right column */}
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-gray-900 mb-1">À destination de:</p>
                              <p className="font-semibold text-gray-900">{selectedCoverLetter.recipientInfo.companyName}</p>
                              {selectedCoverLetter.recipientInfo.recipientTitle && (
                                <p className="text-gray-700">
                                  {selectedCoverLetter.recipientInfo.recipientTitle}
                                  {selectedCoverLetter.recipientInfo.recipientName && ` - ${selectedCoverLetter.recipientInfo.recipientName}`}
                                </p>
                              )}
                              {!selectedCoverLetter.recipientInfo.recipientTitle && selectedCoverLetter.recipientInfo.recipientName && (
                                <p className="text-gray-700">{selectedCoverLetter.recipientInfo.recipientName}</p>
                              )}
                              {selectedCoverLetter.recipientInfo.address && (
                                <p className="text-gray-700">{selectedCoverLetter.recipientInfo.address}</p>
                              )}
                              {(selectedCoverLetter.recipientInfo.postalCode || selectedCoverLetter.recipientInfo.city) && (
                                <p className="text-gray-700">
                                  {selectedCoverLetter.recipientInfo.postalCode} {selectedCoverLetter.recipientInfo.city}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Date */}
                          <div className="mb-3 text-sm text-gray-700">
                            {new Date(selectedCoverLetter.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>

                          {/* Letter body */}
                          <div className="text-gray-800 leading-relaxed">
                            {bodyContent.split('\n').map((line, index) => {
                              const cleanedLine = line.replace(/\*\*/g, '').replace(/\*/g, '');

                              // Detect "Objet:" line
                              const isObjectLine = cleanedLine.toLowerCase().startsWith('objet:') ||
                                cleanedLine.toLowerCase().startsWith('object:') ||
                                cleanedLine.toLowerCase().startsWith('subject:') ||
                                cleanedLine.toLowerCase().startsWith('re:');

                              if (isObjectLine) {
                                return <p key={index} className="font-bold text-gray-900 mb-6">{cleanedLine}</p>;
                              } else if (cleanedLine.trim() === '') {
                                return <br key={index} />;
                              } else {
                                return <p key={index} className="text-sm mb-2">{cleanedLine}</p>;
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            // Job Offer Content
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div className="max-w-3xl mx-auto">
                {application.jobDescription ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8">
                    {application.jobUrl && (
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 mb-6 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open original posting
                      </a>
                    )}
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {application.jobDescription}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-6xl mb-4">📋</p>
                    <p className="text-xl font-semibold mb-2">No job description saved</p>
                    <p className="text-sm">No job description was saved when creating this application.</p>
                    {application.jobUrl && (
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-sm text-accent-600 hover:text-accent-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open original posting
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CVEditor Modal */}
        {showEditor && (
          <CVEditor
            application={application}
            selectedCVId={selectedCVId}
            onSave={handleSaveFromEditor}
            onCancel={() => setShowEditor(false)}
            onDeleteApplication={onDeleteApplication}
            userProfile={profile}
          />
        )}

        {/* Cover Letter Generation Modal */}
        {showCoverLetterModal && (
          <CoverLetterModal
            application={application}
            onClose={() => setShowCoverLetterModal(false)}
            onGenerate={handleGenerateCoverLetter}
            isGenerating={false}
          />
        )}

        {/* Cover Letter Editor Modal */}
        {showCoverLetterEditor && selectedCoverLetter && (
          <CoverLetterEditor
            coverLetter={selectedCoverLetter}
            onSave={handleCoverLetterSaveFromEditor}
            onCancel={() => setShowCoverLetterEditor(false)}
          />
        )}
      </div>
    </div>
  );
}
