'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import type { Education, WorkExperience, Skill, SkillCategory, SkillProficiency } from '@/app/types';

type SectionType = 'education' | 'experience' | 'skills';
type ImportMode = 'add' | 'replace';

interface Uncertainty {
  entryIndex: number;
  field: string;
  reason: string;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  section: SectionType;
  parsedData: Education[] | WorkExperience[] | Skill[];
  uncertainties: Uncertainty[];
  existingCount: number;
  onConfirm: (data: Education[] | WorkExperience[] | Skill[], mode: ImportMode) => void;
  onCancel: () => void;
  onRetry: () => void;
}

const sectionLabels: Record<SectionType, string> = {
  education: 'Education',
  experience: 'Work Experience',
  skills: 'Skills',
};

export default function ImportPreviewModal({
  isOpen,
  section,
  parsedData,
  uncertainties: initialUncertainties,
  existingCount,
  onConfirm,
  onCancel,
  onRetry,
}: ImportPreviewModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<(Education | WorkExperience | Skill)[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('add');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  // Track resolved uncertainties (fields that have been edited)
  const [resolvedFields, setResolvedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEditedData([...parsedData]);
    setEditingIndex(null);
    setImportMode('add');
    setReplaceConfirmed(false);
    setResolvedFields(new Set());
  }, [parsedData]);

  if (!isOpen) return null;

  // Filter out resolved uncertainties
  const uncertainties = initialUncertainties.filter(
    (u) => !resolvedFields.has(`${u.entryIndex}-${u.field}`)
  );

  const getUncertaintiesForEntry = (index: number) => {
    return uncertainties.filter((u) => u.entryIndex === index);
  };

  const hasUncertainty = (index: number, field: string) => {
    return uncertainties.some((u) => u.entryIndex === index && u.field === field);
  };

  // Mark a field as resolved when edited
  const markFieldResolved = (index: number, field: string) => {
    setResolvedFields((prev) => new Set(prev).add(`${index}-${field}`));
  };

  const updateEntry = <T extends Education | WorkExperience | Skill>(
    index: number,
    updates: Partial<T>
  ) => {
    const newData = [...editedData];
    newData[index] = { ...newData[index], ...updates } as T;
    setEditedData(newData);

    // Mark edited fields as resolved to remove warnings
    Object.keys(updates).forEach((field) => {
      markFieldResolved(index, field);
    });
  };

  const removeEntry = (index: number) => {
    setEditedData(editedData.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleConfirm = () => {
    if (importMode === 'replace' && existingCount > 0 && !replaceConfirmed) {
      return;
    }
    onConfirm(editedData as Education[] | WorkExperience[] | Skill[], importMode);
  };

  const renderEducationEntry = (entry: Education, index: number) => {
    const isEditing = editingIndex === index;
    const entryUncertainties = getUncertaintiesForEntry(index);

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Degree *</label>
              <input
                type="text"
                value={entry.degree}
                onChange={(e) => updateEntry<Education>(index, { degree: e.target.value })}
                className="input-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Field of Study *</label>
              <input
                type="text"
                value={entry.field}
                onChange={(e) => updateEntry<Education>(index, { field: e.target.value })}
                className={`input-primary text-sm ${
                  hasUncertainty(index, 'field') ? 'border-warning-500' : ''
                }`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Institution *</label>
            <input
              type="text"
              value={entry.institution}
              onChange={(e) => updateEntry<Education>(index, { institution: e.target.value })}
              className="input-primary text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Start Year *</label>
              <input
                type="number"
                value={entry.startYear}
                onChange={(e) => updateEntry<Education>(index, { startYear: parseInt(e.target.value) })}
                className={`input-primary text-sm ${
                  hasUncertainty(index, 'startYear') ? 'border-warning-500' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">End Year</label>
              <input
                type="number"
                value={entry.endYear || ''}
                onChange={(e) => updateEntry<Education>(index, { endYear: e.target.value ? parseInt(e.target.value) : undefined })}
                disabled={entry.current}
                className="input-primary text-sm disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={entry.current || false}
                  onChange={(e) => updateEntry<Education>(index, { current: e.target.checked, endYear: e.target.checked ? undefined : entry.endYear })}
                  className="rounded border-primary-300 dark:border-primary-600"
                />
                <span className="text-sm text-primary-700 dark:text-primary-300">Current</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">GPA</label>
              <input
                type="text"
                value={entry.gpa || ''}
                onChange={(e) => updateEntry<Education>(index, { gpa: e.target.value || undefined })}
                className={`input-primary text-sm ${
                  hasUncertainty(index, 'gpa') ? 'border-warning-500' : ''
                }`}
                placeholder="e.g., 3.8/4.0"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Honors</label>
              <input
                type="text"
                value={entry.honors || ''}
                onChange={(e) => updateEntry<Education>(index, { honors: e.target.value || undefined })}
                className="input-primary text-sm"
                placeholder="e.g., Magna Cum Laude"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setEditingIndex(null)}
              className="btn-primary text-sm"
            >
              Done Editing
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-primary-900 dark:text-primary-100">{entry.degree} in {entry.field}</h4>
            <p className="text-sm text-primary-600 dark:text-primary-400">{entry.institution}</p>
            <p className="text-sm text-primary-500 dark:text-primary-500">
              {entry.startYear} - {entry.current ? 'Present' : entry.endYear}
              {entry.gpa && ` | GPA: ${entry.gpa}`}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setEditingIndex(index)}
              className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeEntry(index)}
              className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {entryUncertainties.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {entryUncertainties.map((u, i) => (
              <span key={i} className="text-xs bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded">
                {u.field}: {u.reason}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExperienceEntry = (entry: WorkExperience, index: number) => {
    const isEditing = editingIndex === index;
    const entryUncertainties = getUncertaintiesForEntry(index);

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Job Title *</label>
              <input
                type="text"
                value={entry.title}
                onChange={(e) => updateEntry<WorkExperience>(index, { title: e.target.value })}
                className="input-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Company *</label>
              <input
                type="text"
                value={entry.company}
                onChange={(e) => updateEntry<WorkExperience>(index, { company: e.target.value })}
                className="input-primary text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Location</label>
            <input
              type="text"
              value={entry.location || ''}
              onChange={(e) => updateEntry<WorkExperience>(index, { location: e.target.value || undefined })}
              className={`input-primary text-sm ${
                hasUncertainty(index, 'location') ? 'border-warning-500' : ''
              }`}
              placeholder="e.g., San Francisco, CA"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Start Date * (dd-mm-yyyy)</label>
              <input
                type="text"
                value={entry.startDate}
                onChange={(e) => updateEntry<WorkExperience>(index, { startDate: e.target.value })}
                placeholder="01-09-2020"
                className={`input-primary text-sm ${
                  hasUncertainty(index, 'startDate') ? 'border-warning-500' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">End Date (dd-mm-yyyy)</label>
              <input
                type="text"
                value={entry.endDate || ''}
                onChange={(e) => updateEntry<WorkExperience>(index, { endDate: e.target.value || undefined })}
                disabled={entry.current}
                placeholder="01-07-2023"
                className="input-primary text-sm disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={entry.current}
                  onChange={(e) => updateEntry<WorkExperience>(index, { current: e.target.checked, endDate: e.target.checked ? undefined : entry.endDate })}
                  className="rounded border-primary-300 dark:border-primary-600"
                />
                <span className="text-sm text-primary-700 dark:text-primary-300">Current</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Achievements</label>
            {entry.achievements.map((achievement, aIndex) => (
              <div key={aIndex} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={achievement}
                  onChange={(e) => {
                    const newAchievements = [...entry.achievements];
                    newAchievements[aIndex] = e.target.value;
                    updateEntry<WorkExperience>(index, { achievements: newAchievements });
                  }}
                  className="input-primary text-sm flex-1"
                />
                <button
                  onClick={() => {
                    const newAchievements = entry.achievements.filter((_, i) => i !== aIndex);
                    updateEntry<WorkExperience>(index, { achievements: newAchievements });
                  }}
                  className="p-2 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateEntry<WorkExperience>(index, { achievements: [...entry.achievements, ''] })}
              className="text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
            >
              + Add achievement
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setEditingIndex(null)}
              className="btn-primary text-sm"
            >
              Done Editing
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-primary-900 dark:text-primary-100">{entry.title}</h4>
            <p className="text-sm text-primary-600 dark:text-primary-400">
              {entry.company}
              {entry.location && `, ${entry.location}`}
            </p>
            <p className="text-sm text-primary-500 dark:text-primary-500">
              {entry.startDate} - {entry.current ? 'Present' : entry.endDate}
            </p>
            {entry.achievements.length > 0 && (
              <ul className="mt-2 text-sm text-primary-600 dark:text-primary-400 list-disc list-inside">
                {entry.achievements.slice(0, 2).map((a, i) => (
                  <li key={i} className="truncate">{a}</li>
                ))}
                {entry.achievements.length > 2 && (
                  <li className="text-primary-500 dark:text-primary-500">+{entry.achievements.length - 2} more</li>
                )}
              </ul>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setEditingIndex(index)}
              className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeEntry(index)}
              className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {entryUncertainties.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {entryUncertainties.map((u, i) => (
              <span key={i} className="text-xs bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded">
                {u.field}: {u.reason}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSkillEntry = (entry: Skill, index: number) => {
    const isEditing = editingIndex === index;
    const entryUncertainties = getUncertaintiesForEntry(index);

    const categories: SkillCategory[] = ['technical', 'soft', 'language', 'tool'];
    const proficiencies: (SkillProficiency | '')[] = ['', 'beginner', 'intermediate', 'advanced', 'expert'];

    if (isEditing) {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Skill Name *</label>
            <input
              type="text"
              value={entry.name}
              onChange={(e) => updateEntry<Skill>(index, { name: e.target.value })}
              className="input-primary text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Category</label>
              <select
                value={entry.category}
                onChange={(e) => updateEntry<Skill>(index, { category: e.target.value as SkillCategory })}
                className={`select-primary text-sm ${
                  hasUncertainty(index, 'category') ? 'border-warning-500' : ''
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-500 dark:text-primary-400 mb-1">Proficiency</label>
              <select
                value={entry.proficiency || ''}
                onChange={(e) => updateEntry<Skill>(index, { proficiency: e.target.value ? e.target.value as SkillProficiency : undefined })}
                className={`select-primary text-sm ${
                  hasUncertainty(index, 'proficiency') ? 'border-warning-500' : ''
                }`}
              >
                {proficiencies.map((prof) => (
                  <option key={prof || 'none'} value={prof}>
                    {prof ? prof.charAt(0).toUpperCase() + prof.slice(1) : 'Not specified'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setEditingIndex(null)}
              className="btn-primary text-sm"
            >
              Done Editing
            </button>
          </div>
        </div>
      );
    }

    const categoryColors: Record<SkillCategory, string> = {
      technical: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      soft: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
      language: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      tool: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
    };

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-primary-900 dark:text-primary-100">{entry.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[entry.category]}`}>
            {entry.category}
          </span>
          {entry.proficiency && (
            <span className="text-xs text-primary-500 dark:text-primary-500">{entry.proficiency}</span>
          )}
          {entryUncertainties.length > 0 && (
            <span className="text-xs bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded" title={entryUncertainties.map(u => u.reason).join(', ')}>
              Uncertain
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setEditingIndex(index)}
            className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => removeEntry(index)}
            className="p-1.5 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-primary-100 dark:hover:bg-primary-700 rounded"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderEntry = (entry: Education | WorkExperience | Skill, index: number) => {
    switch (section) {
      case 'education':
        return renderEducationEntry(entry as Education, index);
      case 'experience':
        return renderExperienceEntry(entry as WorkExperience, index);
      case 'skills':
        return renderSkillEntry(entry as Skill, index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-primary-800 rounded-2xl border border-primary-200 dark:border-primary-700 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-700">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
            Preview Imported {sectionLabels[section]}
          </h2>
          <button
            onClick={onCancel}
            className="text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-primary-600 dark:text-primary-400 mb-4">
            AI extracted {editedData.length} {editedData.length === 1 ? 'entry' : 'entries'}.
            Review and edit before applying.
            {uncertainties.length > 0 && (
              <span className="text-warning-600 dark:text-warning-400 ml-1">
                ({uncertainties.length} field{uncertainties.length === 1 ? '' : 's'} need{uncertainties.length === 1 ? 's' : ''} review)
              </span>
            )}
          </p>

          {editedData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-primary-600 dark:text-primary-400">No entries to import</p>
              <button
                onClick={onRetry}
                className="mt-4 px-4 py-2 text-sm bg-primary-200 dark:bg-primary-700 text-primary-800 dark:text-primary-100 rounded-lg hover:bg-primary-300 dark:hover:bg-primary-600"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {editedData.map((entry, index) => (
                <div
                  key={entry.id || index}
                  className={`p-4 rounded-lg border ${
                    getUncertaintiesForEntry(index).length > 0
                      ? 'bg-warning-50 dark:bg-warning-500/5 border-warning-300 dark:border-warning-500/30'
                      : 'bg-primary-50 dark:bg-primary-700/50 border-primary-200 dark:border-primary-600/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-primary-500 dark:text-primary-500 font-medium">{index + 1}.</span>
                    <div className="flex-1">{renderEntry(entry, index)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Import Mode Selection */}
        {editedData.length > 0 && (
          <div className="p-4 border-t border-primary-200 dark:border-primary-700">
            <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">How do you want to apply these entries?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="add"
                  checked={importMode === 'add'}
                  onChange={() => setImportMode('add')}
                  className="text-accent-600"
                />
                <span className="text-sm text-primary-700 dark:text-primary-300">
                  Add to existing data
                  {existingCount > 0 && (
                    <span className="text-primary-500 dark:text-primary-500 ml-1">
                      (keeps your {existingCount} current {existingCount === 1 ? 'entry' : 'entries'})
                    </span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => {
                    setImportMode('replace');
                    setReplaceConfirmed(false);
                  }}
                  className="text-accent-600"
                />
                <span className="text-sm text-primary-700 dark:text-primary-300">
                  Replace existing data
                  {existingCount > 0 && (
                    <span className="text-error-600 dark:text-error-400 ml-1">
                      (removes {existingCount} current {existingCount === 1 ? 'entry' : 'entries'})
                    </span>
                  )}
                </span>
              </label>

              {importMode === 'replace' && existingCount > 0 && (
                <div className="ml-6 mt-2 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 rounded-lg">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceConfirmed}
                      onChange={(e) => setReplaceConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-error-600 dark:text-error-400">
                      I understand this will permanently remove my {existingCount} existing {existingCount === 1 ? 'entry' : 'entries'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-primary-200 dark:border-primary-700">
          <button
            onClick={onRetry}
            className="btn-ghost text-sm"
          >
            Retry
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={editedData.length === 0 || (importMode === 'replace' && existingCount > 0 && !replaceConfirmed)}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply {editedData.length} {editedData.length === 1 ? 'Entry' : 'Entries'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
