'use client';

import { useState } from 'react';
import { Pencil, X, AlertTriangle } from 'lucide-react';
import { useProfile } from '@/app/contexts/ProfileContext';
import type { Language, LanguageProficiency, LanguageAcquisition, LanguageCertification } from '@/app/types';

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

interface LanguageFormData {
  language: string;
  proficiency: LanguageProficiency;
  acquisition: LanguageAcquisition;
  yearsOfPractice: string;
  hasCertification: boolean;
  certificationName: string;
  certificationLevel: string;
  certificationScore: string;
  certificationDate: string;
  notes: string;
}

const emptyLanguage: LanguageFormData = {
  language: '',
  proficiency: 'conversational',
  acquisition: 'education',
  yearsOfPractice: '',
  hasCertification: false,
  certificationName: '',
  certificationLevel: '',
  certificationScore: '',
  certificationDate: '',
  notes: '',
};

const proficiencyLabels: Record<LanguageProficiency, string> = {
  basic: 'Basic',
  conversational: 'Conversational',
  professional: 'Professional',
  native: 'Native',
  bilingual: 'Bilingual',
};

const acquisitionLabels: Record<LanguageAcquisition, string> = {
  native: 'Native speaker (from birth)',
  education: 'Formal education',
  immersion: 'Immersion (lived abroad)',
  self_taught: 'Self-taught',
  practice: 'Daily practice over years',
};

const proficiencyColors: Record<LanguageProficiency, string> = {
  basic: 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400',
  conversational: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
  professional: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
  native: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  bilingual: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
};

const commonLanguages = [
  'English',
  'French',
  'Spanish',
  'German',
  'Italian',
  'Portuguese',
  'Chinese (Mandarin)',
  'Japanese',
  'Arabic',
  'Russian',
  'Dutch',
  'Polish',
  'Korean',
  'Hindi',
  'Turkish',
];

const commonCertifications: Record<string, string[]> = {
  'English': ['TOEFL', 'IELTS', 'Cambridge (FCE/CAE/CPE)', 'TOEIC'],
  'French': ['DELF', 'DALF', 'TCF', 'TEF'],
  'German': ['Goethe-Zertifikat', 'TestDaF', 'DSH'],
  'Spanish': ['DELE', 'SIELE'],
  'Japanese': ['JLPT'],
  'Chinese (Mandarin)': ['HSK'],
  'Italian': ['CELI', 'CILS'],
};

export default function LanguagesForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { profile, updateProfile } = useProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LanguageFormData>(emptyLanguage);
  const [isAdding, setIsAdding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const languages = profile?.languages || [];

  const handleAdd = () => {
    setFormData(emptyLanguage);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (lang: Language) => {
    setFormData({
      language: lang.language,
      proficiency: lang.proficiency,
      acquisition: lang.acquisition,
      yearsOfPractice: lang.yearsOfPractice?.toString() || '',
      hasCertification: !!lang.certification,
      certificationName: lang.certification?.name || '',
      certificationLevel: lang.certification?.level || '',
      certificationScore: lang.certification?.score || '',
      certificationDate: lang.certification?.date || '',
      notes: lang.notes || '',
    });
    setEditingId(lang.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(emptyLanguage);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.language) {
      return;
    }

    onSaveStart();

    let certification: LanguageCertification | undefined;
    if (formData.hasCertification && formData.certificationName) {
      certification = {
        name: formData.certificationName,
        level: formData.certificationLevel || undefined,
        score: formData.certificationScore || undefined,
        date: formData.certificationDate || undefined,
      };
    }

    const newLanguage: Language = {
      id: editingId || crypto.randomUUID(),
      language: formData.language,
      proficiency: formData.proficiency,
      acquisition: formData.acquisition,
      yearsOfPractice: formData.yearsOfPractice ? parseInt(formData.yearsOfPractice) : undefined,
      certification,
      notes: formData.notes || undefined,
    };

    let updatedLanguages: Language[];
    if (editingId) {
      updatedLanguages = languages.map((l) =>
        l.id === editingId ? newLanguage : l
      );
    } else {
      updatedLanguages = [...languages, newLanguage];
    }

    const success = await updateProfile({ languages: updatedLanguages });
    if (success) {
      onSaveSuccess();
      handleCancel();
    } else {
      onSaveError();
    }
  };

  const handleDelete = async (id: string) => {
    onSaveStart();
    const updatedLanguages = languages.filter((l) => l.id !== id);
    const success = await updateProfile({ languages: updatedLanguages });
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  const handleClearAll = async () => {
    onSaveStart();
    const success = await updateProfile({ languages: [] });
    if (success) {
      onSaveSuccess();
      setShowClearConfirm(false);
    } else {
      onSaveError();
    }
  };

  const suggestedCertifications = commonCertifications[formData.language] || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Languages</h2>
          <p className="text-primary-600 dark:text-primary-400 text-sm">
            Add languages you speak, including certifications or years of practice.
          </p>
        </div>
        {!isAdding && (
          <div className="flex gap-2">
            {languages.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="btn-ghost text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 text-sm"
              >
                Clear All
              </button>
            )}
            <button
              onClick={handleAdd}
              className="btn-primary text-sm"
            >
              + Add
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-primary-50 dark:bg-primary-700/30 rounded-xl p-6 mb-6 border border-primary-200 dark:border-primary-600">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            {editingId ? 'Edit Language' : 'New Language'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Language <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="input-primary"
                placeholder="Type or select..."
                list="languages-list"
              />
              <datalist id="languages-list">
                {commonLanguages.map((lang) => (
                  <option key={lang} value={lang} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Proficiency Level <span className="text-error-500">*</span>
              </label>
              <select
                value={formData.proficiency}
                onChange={(e) => setFormData({ ...formData, proficiency: e.target.value as LanguageProficiency })}
                className="select-primary"
              >
                {Object.entries(proficiencyLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                How did you learn it? <span className="text-error-500">*</span>
              </label>
              <select
                value={formData.acquisition}
                onChange={(e) => setFormData({ ...formData, acquisition: e.target.value as LanguageAcquisition })}
                className="select-primary"
              >
                {Object.entries(acquisitionLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Years of Practice
              </label>
              <input
                type="number"
                value={formData.yearsOfPractice}
                onChange={(e) => setFormData({ ...formData, yearsOfPractice: e.target.value })}
                className="input-primary"
                placeholder="e.g., 5, 10, 23"
                min="0"
                max="100"
              />
              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                Daily or regular practice (useful for non-native, non-certified fluency)
              </p>
            </div>
          </div>

          {/* Certification Section */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={formData.hasCertification}
                onChange={(e) => setFormData({ ...formData, hasCertification: e.target.checked })}
                className="w-4 h-4 rounded border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-accent-600 focus:ring-accent-500"
              />
              <span className="text-sm text-primary-700 dark:text-primary-300">I have a language certification</span>
            </label>

            {formData.hasCertification && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary-100 dark:bg-primary-800/50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                    Certification Name
                  </label>
                  <input
                    type="text"
                    value={formData.certificationName}
                    onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })}
                    className="input-primary"
                    placeholder="e.g., TOEFL, DELF, JLPT"
                    list="certifications-list"
                  />
                  <datalist id="certifications-list">
                    {suggestedCertifications.map((cert) => (
                      <option key={cert} value={cert} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                    Level
                  </label>
                  <input
                    type="text"
                    value={formData.certificationLevel}
                    onChange={(e) => setFormData({ ...formData, certificationLevel: e.target.value })}
                    className="input-primary"
                    placeholder="e.g., B2, C1, N2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                    Score (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.certificationScore}
                    onChange={(e) => setFormData({ ...formData, certificationScore: e.target.value })}
                    className="input-primary"
                    placeholder="e.g., 110/120, 7.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                    Date Obtained
                  </label>
                  <input
                    type="month"
                    value={formData.certificationDate}
                    onChange={(e) => setFormData({ ...formData, certificationDate: e.target.value })}
                    className="input-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Additional Notes
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-primary"
              placeholder="e.g., 23 years of daily practice, used professionally for 10 years"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.language}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Languages List */}
      <div className="space-y-3">
        {languages.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-primary-500 dark:text-primary-400">
            <p>No languages added yet</p>
            <p className="text-sm mt-1">Click "Add" to get started</p>
          </div>
        ) : (
          languages.map((lang) => (
            <div
              key={lang.id}
              className="group flex items-start justify-between px-4 py-3 bg-primary-50 dark:bg-primary-700/20 rounded-xl border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-medium text-primary-900 dark:text-primary-50">{lang.language}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${proficiencyColors[lang.proficiency]}`}>
                    {proficiencyLabels[lang.proficiency]}
                  </span>
                  <span className="text-xs text-primary-500 dark:text-primary-500">
                    {acquisitionLabels[lang.acquisition]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {lang.yearsOfPractice && (
                    <span className="text-xs bg-primary-200 dark:bg-primary-600/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded">
                      {lang.yearsOfPractice} years of practice
                    </span>
                  )}
                  {lang.certification && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                      {lang.certification.name}
                      {lang.certification.level && ` (${lang.certification.level})`}
                      {lang.certification.score && ` - ${lang.certification.score}`}
                    </span>
                  )}
                </div>

                {lang.notes && (
                  <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">{lang.notes}</p>
                )}
              </div>

              <div className="hidden group-hover:flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleEdit(lang)}
                  className="p-1 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                  aria-label="Edit language"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(lang.id)}
                  className="p-1 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                  aria-label="Delete language"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-primary-800 rounded-2xl border border-primary-200 dark:border-primary-700 p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-error-100 dark:bg-error-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-error-600 dark:text-error-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50">Clear All Languages</h3>
            </div>
            <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
              This will permanently delete all {languages.length} {languages.length === 1 ? 'language' : 'languages'}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="btn-danger"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
