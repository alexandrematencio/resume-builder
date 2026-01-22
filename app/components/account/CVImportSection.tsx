'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, ClipboardList, X, Zap } from 'lucide-react';
import type { Education, WorkExperience, Skill } from '@/app/types';
import AIProcessingModal from '@/app/components/AIProcessingModal';

type SectionType = 'education' | 'experience' | 'skills';

interface Uncertainty {
  entryIndex: number;
  field: string;
  reason: string;
}

interface CVImportSectionProps {
  section: SectionType;
  onImportComplete: (
    data: Education[] | WorkExperience[] | Skill[],
    uncertainties: Uncertainty[]
  ) => void;
  existingCount: number;
}

type ImportMode = 'idle' | 'pdf' | 'text';
type ImportStatus = 'idle' | 'extracting' | 'parsing' | 'error';

const sectionLabels: Record<SectionType, string> = {
  education: 'education',
  experience: 'work experience',
  skills: 'skills',
};

const sectionPlaceholders: Record<SectionType, string> = {
  education: `Paste your education section here...

Example:
Master of Science in Computer Science
Stanford University, 2018-2020
GPA: 3.9/4.0

Bachelor of Engineering in Software Engineering
MIT, 2014-2018
Dean's List, Summa Cum Laude`,
  experience: `Paste your work experience here...

Example:
Senior Software Engineer
Google, Mountain View, CA
June 2020 - Present
- Led development of microservices architecture
- Improved system performance by 40%
- Mentored team of 5 junior developers

Software Engineer
Microsoft, Seattle, WA
July 2018 - May 2020
- Built React components for Office 365
- Implemented CI/CD pipelines`,
  skills: `Paste your skills here...

Example:
Technical Skills: Python, JavaScript, TypeScript, React, Node.js, AWS, Docker, Kubernetes
Soft Skills: Leadership, Communication, Problem-solving, Team collaboration
Tools: Git, Jira, Figma, VS Code, Postman
Languages: English (Native), French (Professional), Spanish (Conversational)`,
};

export default function CVImportSection({
  section,
  onImportComplete,
  existingCount,
}: CVImportSectionProps) {
  const [mode, setMode] = useState<ImportMode>('idle');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');

  const parseContent = async (content: string) => {
    setStatus('parsing');
    setError(null);

    try {
      const response = await fetch('/api/parse-cv-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, content }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to parse content');
      }

      if (result.data.length === 0) {
        throw new Error(`No ${sectionLabels[section]} entries found in the text`);
      }

      onImportComplete(result.data, result.uncertainties);
      setMode('idle');
      setTextContent('');
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse content');
      setStatus('error');
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Send file to server for PDF parsing
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract-pdf-text', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract text from PDF');
    }

    const result = await response.json();
    return result.text;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check file size (8MB max)
    if (file.size > 8 * 1024 * 1024) {
      setError('File too large. Maximum size is 8MB.');
      setStatus('error');
      return;
    }

    setMode('pdf');
    setStatus('extracting');
    setError(null);

    try {
      const text = await extractTextFromPDF(file);
      if (!text || text.trim().length === 0) {
        throw new Error('Could not extract text from PDF. Try pasting the text directly.');
      }
      await parseContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
      setStatus('error');
    }
  }, [section]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: status === 'extracting' || status === 'parsing',
  });

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setError('Please enter some text to parse');
      return;
    }

    if (textContent.length > 50000) {
      setError('Text too long. Maximum is 50,000 characters.');
      return;
    }

    await parseContent(textContent);
  };

  const handleCancel = () => {
    setMode('idle');
    setStatus('idle');
    setError(null);
    setTextContent('');
  };

  const isProcessing = status === 'extracting' || status === 'parsing';

  // Idle state - show import options
  if (mode === 'idle') {
    return (
      <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-700/30 rounded-xl border border-primary-200 dark:border-primary-600">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Import from CV</span>
        </div>

        <div className="flex gap-3">
          {/* PDF Import */}
          <div
            {...getRootProps()}
            className={`flex-1 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragActive
                ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10'
                : 'border-primary-300 dark:border-primary-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-100 dark:hover:bg-primary-700/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <FileText className="w-8 h-8 text-primary-500 dark:text-primary-400 mb-2" />
              <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">Import PDF</span>
              <span className="text-xs text-primary-500 dark:text-primary-500 mt-1">Drag & drop or click (max 8MB)</span>
            </div>
          </div>

          {/* Text/Paste Import */}
          <button
            onClick={() => setMode('text')}
            className="flex-1 p-4 border-2 border-dashed border-primary-300 dark:border-primary-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-100 dark:hover:bg-primary-700/30 transition-colors"
          >
            <div className="flex flex-col items-center text-center">
              <ClipboardList className="w-8 h-8 text-primary-500 dark:text-primary-400 mb-2" />
              <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">Paste Text</span>
              <span className="text-xs text-primary-500 dark:text-primary-500 mt-1">Copy from your CV</span>
            </div>
          </button>
        </div>

        {existingCount > 0 && (
          <p className="text-xs text-primary-500 dark:text-primary-500 mt-3">
            You have {existingCount} existing {existingCount === 1 ? 'entry' : 'entries'}. Imported data can be added or replace existing.
          </p>
        )}
      </div>
    );
  }

  // Text input mode
  if (mode === 'text') {
    return (
      <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-700/30 rounded-xl border border-primary-200 dark:border-primary-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              Paste your {sectionLabels[section]}
            </span>
          </div>
          <button
            onClick={handleCancel}
            className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            disabled={status === 'parsing'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder={sectionPlaceholders[section]}
          className="textarea-primary h-48 resize-none text-sm"
          disabled={status === 'parsing'}
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-primary-500 dark:text-primary-500">
            {textContent.length.toLocaleString()} / 50,000 characters
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="btn-ghost text-sm"
              disabled={status === 'parsing'}
            >
              Cancel
            </button>
            <button
              onClick={handleTextSubmit}
              disabled={status === 'parsing' || !textContent.trim()}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {status === 'parsing' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                  Parsing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Parse with AI
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 rounded-lg">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        )}

        {/* AI Processing Modal */}
        <AIProcessingModal
          isOpen={isProcessing}
          message="AI is parsing your content..."
        />
      </div>
    );
  }

  // PDF processing mode
  if (mode === 'pdf') {
    return (
      <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-700/30 rounded-xl border border-primary-200 dark:border-primary-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Processing PDF</span>
          </div>
          {status === 'error' && (
            <button
              onClick={handleCancel}
              className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {status === 'error' ? (
          <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 rounded-lg">
            <p className="text-sm text-error-600 dark:text-error-400 mb-3">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setMode('text')}
                className="px-3 py-1.5 text-sm bg-primary-200 dark:bg-primary-600 text-primary-800 dark:text-primary-100 rounded-lg hover:bg-primary-300 dark:hover:bg-primary-500 transition-colors"
              >
                Try pasting text instead
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-500 mb-4" />
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {status === 'extracting' ? 'Extracting text from PDF...' : 'Parsing with AI...'}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">This may take a moment</p>
          </div>
        )}

        {/* AI Processing Modal */}
        <AIProcessingModal
          isOpen={isProcessing}
          message={status === 'extracting' ? 'Extracting text from PDF...' : 'AI is parsing your content...'}
        />
      </div>
    );
  }

  return null;
}
