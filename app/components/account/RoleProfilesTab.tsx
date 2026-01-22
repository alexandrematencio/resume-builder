'use client';

import { useState } from 'react';
import { Pencil, Trash2, Star } from 'lucide-react';
import { useProfile } from '@/app/contexts/ProfileContext';
import type { RoleProfile } from '@/app/types';

interface RoleFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  customSummary: string;
  selectedExperienceIds: string[];
  selectedSkillIds: string[];
  selectedEducationIds: string[];
}

const emptyRole: RoleFormData = {
  name: '',
  description: '',
  icon: '🎯',
  color: '#6366f1',
  customSummary: '',
  selectedExperienceIds: [],
  selectedSkillIds: [],
  selectedEducationIds: [],
};

const iconOptions = ['🎯', '💼', '💻', '🎨', '📊', '🔧', '📱', '🌐', '🚀', '⚡', '🎭', '📈'];
const colorOptions = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export default function RoleProfilesTab() {
  const {
    profile,
    roleProfiles,
    createRoleProfile,
    updateRoleProfile,
    removeRoleProfile,
    setDefaultRole,
  } = useProfile();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(emptyRole);
  const [isAdding, setIsAdding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const experiences = profile?.workExperience || [];
  const skills = profile?.skills || [];
  const educations = profile?.education || [];

  const handleAdd = () => {
    setFormData(emptyRole);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (role: RoleProfile) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      icon: role.icon,
      color: role.color,
      customSummary: role.customSummary || '',
      selectedExperienceIds: role.selectedExperienceIds,
      selectedSkillIds: role.selectedSkillIds,
      selectedEducationIds: role.selectedEducationIds,
    });
    setEditingId(role.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(emptyRole);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      return;
    }

    setSaveStatus('saving');

    const roleData: Partial<RoleProfile> = {
      id: editingId || undefined,
      name: formData.name,
      description: formData.description || undefined,
      icon: formData.icon,
      color: formData.color,
      customSummary: formData.customSummary || undefined,
      selectedExperienceIds: formData.selectedExperienceIds,
      experienceOrder: formData.selectedExperienceIds,
      selectedSkillIds: formData.selectedSkillIds,
      skillPriority: formData.selectedSkillIds,
      selectedEducationIds: formData.selectedEducationIds,
      selectedCertificationIds: [],
      additionalSkills: [],
      customAchievements: [],
    };

    const success = editingId
      ? await updateRoleProfile({ ...roleData, id: editingId })
      : await createRoleProfile(roleData);

    if (success) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      handleCancel();
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    setSaveStatus('saving');
    const success = await removeRoleProfile(id);
    if (success) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSaveStatus('saving');
    const success = await setDefaultRole(id);
    if (success) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const toggleExperience = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedExperienceIds: prev.selectedExperienceIds.includes(id)
        ? prev.selectedExperienceIds.filter((i) => i !== id)
        : [...prev.selectedExperienceIds, id],
    }));
  };

  const toggleSkill = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSkillIds: prev.selectedSkillIds.includes(id)
        ? prev.selectedSkillIds.filter((i) => i !== id)
        : [...prev.selectedSkillIds, id],
    }));
  };

  const toggleEducation = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedEducationIds: prev.selectedEducationIds.includes(id)
        ? prev.selectedEducationIds.filter((i) => i !== id)
        : [...prev.selectedEducationIds, id],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Role Profiles</h2>
          <p className="text-primary-600 dark:text-primary-400 text-sm">
            Create customized profiles for different types of positions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus === 'saving' && (
            <span className="text-warning-600 dark:text-warning-400 text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-warning-500"></div>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-success-600 dark:text-success-400 text-sm">Saved</span>
          )}
          {!isAdding && (
            <button
              onClick={handleAdd}
              className="btn-primary text-sm"
            >
              + New Profile
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-primary-50 dark:bg-primary-700/30 rounded-xl p-6 mb-6 border border-primary-200 dark:border-primary-600">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-4">
            {editingId ? 'Edit Profile' : 'New Role Profile'}
          </h3>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Profile Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-primary"
                placeholder="Ex: UX Designer, Full Stack Developer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-primary"
                placeholder="Brief description of this profile"
              />
            </div>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                      formData.icon === icon
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/20'
                        : 'border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-700/50 hover:border-primary-400 dark:hover:border-primary-500'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color
                        ? 'border-primary-900 dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Custom Summary */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Custom Summary (optional)
            </label>
            <textarea
              value={formData.customSummary}
              onChange={(e) => setFormData({ ...formData, customSummary: e.target.value })}
              rows={3}
              className="textarea-primary resize-none"
              placeholder="Leave empty to use your general summary, or write a specific summary for this type of position..."
            />
          </div>

          {/* Experience Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Experiences to Include
            </label>
            {experiences.length === 0 ? (
              <p className="text-primary-500 dark:text-primary-500 text-sm">No experience in your profile</p>
            ) : (
              <div className="space-y-2">
                {experiences.map((exp) => (
                  <label
                    key={exp.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-primary-700/30 rounded-lg cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700/50 transition-colors border border-primary-200 dark:border-primary-600"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedExperienceIds.includes(exp.id)}
                      onChange={() => toggleExperience(exp.id)}
                      className="w-4 h-4 rounded border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-accent-600 focus:ring-accent-500"
                    />
                    <div>
                      <p className="text-primary-900 dark:text-primary-50 font-medium">{exp.title}</p>
                      <p className="text-primary-600 dark:text-primary-400 text-sm">{exp.company}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Skills Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Skills to Highlight
            </label>
            {skills.length === 0 ? (
              <p className="text-primary-500 dark:text-primary-500 text-sm">No skills in your profile</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.selectedSkillIds.includes(skill.id)
                        ? 'bg-accent-600 text-white'
                        : 'bg-primary-100 dark:bg-primary-700/50 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-100'
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Education Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Education to Include
            </label>
            {educations.length === 0 ? (
              <p className="text-primary-500 dark:text-primary-500 text-sm">No education in your profile</p>
            ) : (
              <div className="space-y-2">
                {educations.map((edu) => (
                  <label
                    key={edu.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-primary-700/30 rounded-lg cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-700/50 transition-colors border border-primary-200 dark:border-primary-600"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedEducationIds.includes(edu.id)}
                      onChange={() => toggleEducation(edu.id)}
                      className="w-4 h-4 rounded border-primary-300 dark:border-primary-600 bg-white dark:bg-primary-800 text-accent-600 focus:ring-accent-500"
                    />
                    <div>
                      <p className="text-primary-900 dark:text-primary-50 font-medium">{edu.degree}</p>
                      <p className="text-primary-600 dark:text-primary-400 text-sm">{edu.institution}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
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
              disabled={!formData.name}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update' : 'Create Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Role Profiles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roleProfiles.length === 0 && !isAdding ? (
          <div className="col-span-2 text-center py-12 text-primary-500 dark:text-primary-400">
            <p>No role profiles created</p>
            <p className="text-sm mt-1">
              Role profiles allow you to customize your CV for different types of positions
            </p>
          </div>
        ) : (
          roleProfiles.map((role) => (
            <div
              key={role.id}
              className="bg-primary-50 dark:bg-primary-700/20 rounded-xl p-4 border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              style={{ borderLeftColor: role.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-primary-900 dark:text-primary-50">{role.name}</h3>
                      {role.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-primary-600 dark:text-primary-400 text-sm">{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!role.isDefault && (
                    <button
                      onClick={() => handleSetDefault(role.id)}
                      className="p-2 text-primary-500 dark:text-primary-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                    aria-label="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                    aria-label="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-primary-500 dark:text-primary-500">
                {role.selectedExperienceIds.length} experiences •{' '}
                {role.selectedSkillIds.length} skills •{' '}
                {role.selectedEducationIds.length} education
              </div>

              {role.usageCount > 0 && (
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-2">
                  Used {role.usageCount} times
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
