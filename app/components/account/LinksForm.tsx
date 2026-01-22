'use client';

import { useState } from 'react';
import { Pencil, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useProfile } from '@/app/contexts/ProfileContext';
import type { PortfolioLink } from '@/app/types';

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

interface LinkFormData {
  type: PortfolioLink['type'];
  url: string;
  label: string;
}

const emptyLink: LinkFormData = {
  type: 'linkedin',
  url: '',
  label: '',
};

const linkTypeLabels: Record<PortfolioLink['type'], string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portfolio',
  twitter: 'Twitter / X',
  dribbble: 'Dribbble',
  behance: 'Behance',
  other: 'Other',
};

const linkTypeIcons: Record<PortfolioLink['type'], string> = {
  linkedin: '💼',
  github: '💻',
  portfolio: '🌐',
  twitter: '🐦',
  dribbble: '🎨',
  behance: '🎭',
  other: '🔗',
};

const linkTypePlaceholders: Record<PortfolioLink['type'], string> = {
  linkedin: 'https://linkedin.com/in/your-profile',
  github: 'https://github.com/your-username',
  portfolio: 'https://your-website.com',
  twitter: 'https://twitter.com/your-username',
  dribbble: 'https://dribbble.com/your-username',
  behance: 'https://behance.net/your-username',
  other: 'https://...',
};

export default function LinksForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { profile, updateProfile } = useProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LinkFormData>(emptyLink);
  const [isAdding, setIsAdding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const links = profile?.portfolioLinks || [];

  const handleAdd = () => {
    setFormData(emptyLink);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (link: PortfolioLink) => {
    setFormData({
      type: link.type,
      url: link.url,
      label: link.label || '',
    });
    setEditingId(link.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(emptyLink);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.url) {
      return;
    }

    onSaveStart();

    const newLink: PortfolioLink = {
      id: editingId || crypto.randomUUID(),
      type: formData.type,
      url: formData.url,
      label: formData.label || undefined,
    };

    let updatedLinks: PortfolioLink[];
    if (editingId) {
      updatedLinks = links.map((l) =>
        l.id === editingId ? newLink : l
      );
    } else {
      updatedLinks = [...links, newLink];
    }

    const success = await updateProfile({ portfolioLinks: updatedLinks });
    if (success) {
      onSaveSuccess();
      handleCancel();
    } else {
      onSaveError();
    }
  };

  const handleDelete = async (id: string) => {
    onSaveStart();
    const updatedLinks = links.filter((l) => l.id !== id);
    const success = await updateProfile({ portfolioLinks: updatedLinks });
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  const handleClearAll = async () => {
    onSaveStart();
    const success = await updateProfile({ portfolioLinks: [] });
    if (success) {
      onSaveSuccess();
      setShowClearConfirm(false);
    } else {
      onSaveError();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Links & Portfolio</h2>
          <p className="text-primary-600 dark:text-primary-400 text-sm">
            Add your professional profiles and portfolio links.
          </p>
        </div>
        {!isAdding && (
          <div className="flex gap-2">
            {links.length > 0 && (
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
            {editingId ? 'Edit Link' : 'New Link'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Type <span className="text-error-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as PortfolioLink['type'] })}
                className="select-primary"
              >
                {Object.entries(linkTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {linkTypeIcons[key as PortfolioLink['type']]} {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                URL <span className="text-error-500">*</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input-primary"
                placeholder={linkTypePlaceholders[formData.type]}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Custom Label (optional)
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input-primary"
                placeholder="Ex: My design portfolio, Open source projects..."
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
              disabled={!formData.url}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="space-y-3">
        {links.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-primary-500 dark:text-primary-400">
            <p>No links added yet</p>
            <p className="text-sm mt-1">Click &quot;Add&quot; to get started</p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center justify-between px-4 py-3 bg-primary-50 dark:bg-primary-700/20 rounded-xl border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{linkTypeIcons[link.type]}</span>
                <div>
                  <p className="font-medium text-primary-900 dark:text-primary-50">
                    {link.label || linkTypeLabels[link.type]}
                  </p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors truncate block max-w-xs md:max-w-md"
                  >
                    {link.url}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                  aria-label="Open link in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleEdit(link)}
                  className="p-2 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                  aria-label="Edit link"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-2 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                  aria-label="Delete link"
                >
                  <Trash2 className="w-4 h-4" />
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
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50">Clear All Links</h3>
            </div>
            <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
              This will permanently delete all {links.length} link{links.length === 1 ? '' : 's'}. This action cannot be undone.
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
