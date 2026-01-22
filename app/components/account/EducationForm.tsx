'use client';

import { useState } from 'react';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useProfile } from '@/app/contexts/ProfileContext';
import type { Education } from '@/app/types';
import CVImportSection from './CVImportSection';
import ImportPreviewModal from './ImportPreviewModal';

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

interface EducationFormData {
  degree: string;
  institution: string;
  field: string;
  startYear: string;
  endYear: string;
  current: boolean;
  gpa: string;
  honors: string;
}

interface Uncertainty {
  entryIndex: number;
  field: string;
  reason: string;
}

const emptyEducation: EducationFormData = {
  degree: '',
  institution: '',
  field: '',
  startYear: '',
  endYear: '',
  current: false,
  gpa: '',
  honors: '',
};

export default function EducationForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { profile, updateProfile } = useProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EducationFormData>(emptyEducation);
  const [isAdding, setIsAdding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Import state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [importedData, setImportedData] = useState<Education[]>([]);
  const [importUncertainties, setImportUncertainties] = useState<Uncertainty[]>([]);

  const educations = profile?.education || [];

  const handleAdd = () => {
    setFormData(emptyEducation);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (edu: Education) => {
    setFormData({
      degree: edu.degree,
      institution: edu.institution,
      field: edu.field,
      startYear: edu.startYear.toString(),
      endYear: edu.endYear?.toString() || '',
      current: edu.current || false,
      gpa: edu.gpa || '',
      honors: edu.honors || '',
    });
    setEditingId(edu.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(emptyEducation);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.degree || !formData.institution || !formData.field || !formData.startYear) {
      return;
    }

    onSaveStart();

    const newEducation: Education = {
      id: editingId || crypto.randomUUID(),
      degree: formData.degree,
      institution: formData.institution,
      field: formData.field,
      startYear: parseInt(formData.startYear),
      endYear: formData.current ? undefined : formData.endYear ? parseInt(formData.endYear) : undefined,
      current: formData.current,
      gpa: formData.gpa || undefined,
      honors: formData.honors || undefined,
    };

    let updatedEducations: Education[];
    if (editingId) {
      updatedEducations = educations.map((e) =>
        e.id === editingId ? newEducation : e
      );
    } else {
      updatedEducations = [newEducation, ...educations];
    }

    const success = await updateProfile({ education: updatedEducations });
    if (success) {
      onSaveSuccess();
      handleCancel();
    } else {
      onSaveError();
    }
  };

  const handleDelete = async (id: string) => {
    onSaveStart();
    const updatedEducations = educations.filter((e) => e.id !== id);
    const success = await updateProfile({ education: updatedEducations });
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  const handleClearAll = async () => {
    onSaveStart();
    const success = await updateProfile({ education: [] });
    if (success) {
      onSaveSuccess();
      setShowClearConfirm(false);
    } else {
      onSaveError();
    }
  };

  // Import handlers
  const handleImportComplete = (data: Education[], uncertainties: Uncertainty[]) => {
    setImportedData(data);
    setImportUncertainties(uncertainties);
    setShowPreviewModal(true);
  };

  const handleImportConfirm = async (data: Education[], mode: 'add' | 'replace') => {
    onSaveStart();

    let updatedEducations: Education[];
    if (mode === 'replace') {
      updatedEducations = data;
    } else {
      updatedEducations = [...data, ...educations];
    }

    const success = await updateProfile({ education: updatedEducations });
    if (success) {
      onSaveSuccess();
      setShowPreviewModal(false);
      setImportedData([]);
      setImportUncertainties([]);
    } else {
      onSaveError();
    }
  };

  const handleImportCancel = () => {
    setShowPreviewModal(false);
    setImportedData([]);
    setImportUncertainties([]);
  };

  const handleImportRetry = () => {
    setShowPreviewModal(false);
    setImportedData([]);
    setImportUncertainties([]);
  };

  const degreeOptions = [
    'High School Diploma',
    'Associate Degree',
    'Bachelor of Arts',
    'Bachelor of Science',
    'Bachelor of Engineering',
    'Master of Arts',
    'Master of Science',
    'Master of Business Administration',
    'Doctor of Philosophy',
    'Professional Certificate',
    'Other',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Education</h2>
          <p className="text-primary-600 dark:text-primary-400 text-sm">
            Add your degrees and educational background.
          </p>
        </div>
        {!isAdding && (
          <div className="flex gap-2">
            {educations.length > 0 && (
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

      {/* Import Section */}
      {!isAdding && (
        <CVImportSection
          section="education"
          onImportComplete={(data, uncertainties) => handleImportComplete(data as Education[], uncertainties)}
          existingCount={educations.length}
        />
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-primary-50 dark:bg-primary-700/30 rounded-xl p-6 mb-6 border border-primary-200 dark:border-primary-600">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            {editingId ? 'Edit Education' : 'New Education'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Degree <span className="text-error-500">*</span>
              </label>
              <select
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="select-primary"
              >
                <option value="">Select...</option>
                {degreeOptions.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Institution <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="input-primary"
                placeholder="Stanford University"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Field of Study <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                className="input-primary"
                placeholder="Computer Science, Business, Marketing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Start Year <span className="text-error-500">*</span>
              </label>
              <input
                type="number"
                value={formData.startYear}
                onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                className="input-primary"
                placeholder="2020"
                min="1950"
                max="2030"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                End Year
              </label>
              <input
                type="number"
                value={formData.endYear}
                onChange={(e) => setFormData({ ...formData, endYear: e.target.value })}
                disabled={formData.current}
                className="input-primary disabled:opacity-50"
                placeholder="2024"
                min="1950"
                max="2030"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.current}
                  onChange={(e) => setFormData({ ...formData, current: e.target.checked })}
                  className="w-4 h-4 rounded border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-accent-600 focus:ring-accent-500"
                />
                <span className="text-sm text-primary-700 dark:text-primary-300">Currently studying</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                GPA / Honors
              </label>
              <input
                type="text"
                value={formData.gpa}
                onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                className="input-primary"
                placeholder="3.8/4.0, Cum Laude..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Awards / Distinctions
              </label>
              <input
                type="text"
                value={formData.honors}
                onChange={(e) => setFormData({ ...formData, honors: e.target.value })}
                className="input-primary"
                placeholder="Valedictorian, Dean's List..."
              />
            </div>
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
              disabled={!formData.degree || !formData.institution || !formData.field || !formData.startYear}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Education List */}
      <div className="space-y-4">
        {educations.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-primary-500 dark:text-primary-400">
            <p>No education added yet</p>
            <p className="text-sm mt-1">Click "Add" or import from your CV to get started</p>
          </div>
        ) : (
          educations.map((edu) => (
            <div
              key={edu.id}
              className="bg-primary-50 dark:bg-primary-700/20 rounded-xl p-4 border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-primary-900 dark:text-primary-50">{edu.degree}</h3>
                  <p className="text-primary-600 dark:text-primary-400 text-sm">{edu.institution}</p>
                  <p className="text-primary-500 dark:text-primary-500 text-sm">{edu.field}</p>
                  <p className="text-primary-500 dark:text-primary-500 text-sm">
                    {edu.startYear} - {edu.current ? 'Present' : edu.endYear}
                    {edu.gpa && ` | ${edu.gpa}`}
                  </p>
                  {edu.honors && (
                    <p className="text-accent-600 dark:text-accent-400 text-sm mt-1">{edu.honors}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(edu)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                    aria-label="Edit education"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(edu.id)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                    aria-label="Delete education"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={showPreviewModal}
        section="education"
        parsedData={importedData}
        uncertainties={importUncertainties}
        existingCount={educations.length}
        onConfirm={(data, mode) => handleImportConfirm(data as Education[], mode)}
        onCancel={handleImportCancel}
        onRetry={handleImportRetry}
      />

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-primary-800 rounded-2xl border border-primary-200 dark:border-primary-700 p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-error-100 dark:bg-error-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-error-600 dark:text-error-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50">Clear All Education</h3>
            </div>
            <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
              This will permanently delete all {educations.length} education {educations.length === 1 ? 'entry' : 'entries'}. This action cannot be undone.
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
