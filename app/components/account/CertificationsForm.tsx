'use client';

import { useState } from 'react';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useProfile } from '@/app/contexts/ProfileContext';
import type { Certification } from '@/app/types';

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

interface CertificationFormData {
  name: string;
  issuer: string;
  date: string;
  expiryDate: string;
  credentialId: string;
}

const emptyCertification: CertificationFormData = {
  name: '',
  issuer: '',
  date: '',
  expiryDate: '',
  credentialId: '',
};

export default function CertificationsForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { profile, updateProfile } = useProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CertificationFormData>(emptyCertification);
  const [isAdding, setIsAdding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const certifications = profile?.certifications || [];

  const handleAdd = () => {
    setFormData(emptyCertification);
    setEditingId(null);
    setIsAdding(true);
  };

  const handleEdit = (cert: Certification) => {
    setFormData({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
      expiryDate: cert.expiryDate || '',
      credentialId: cert.credentialId || '',
    });
    setEditingId(cert.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setFormData(emptyCertification);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.issuer || !formData.date) {
      return;
    }

    onSaveStart();

    const newCertification: Certification = {
      id: editingId || crypto.randomUUID(),
      name: formData.name,
      issuer: formData.issuer,
      date: formData.date,
      expiryDate: formData.expiryDate || undefined,
      credentialId: formData.credentialId || undefined,
    };

    let updatedCertifications: Certification[];
    if (editingId) {
      updatedCertifications = certifications.map((c) =>
        c.id === editingId ? newCertification : c
      );
    } else {
      updatedCertifications = [newCertification, ...certifications];
    }

    const success = await updateProfile({ certifications: updatedCertifications });
    if (success) {
      onSaveSuccess();
      handleCancel();
    } else {
      onSaveError();
    }
  };

  const handleDelete = async (id: string) => {
    onSaveStart();
    const updatedCertifications = certifications.filter((c) => c.id !== id);
    const success = await updateProfile({ certifications: updatedCertifications });
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  const handleClearAll = async () => {
    onSaveStart();
    const success = await updateProfile({ certifications: [] });
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
          <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Certifications</h2>
          <p className="text-primary-600 dark:text-primary-400 text-sm">
            Add your professional certifications.
          </p>
        </div>
        {!isAdding && (
          <div className="flex gap-2">
            {certifications.length > 0 && (
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
            {editingId ? 'Edit Certification' : 'New Certification'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Certification Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-primary"
                placeholder="AWS Solutions Architect, PMP, Google Analytics..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Issuer <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                className="input-primary"
                placeholder="Amazon Web Services, PMI, Google..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Date Obtained <span className="text-error-500">*</span>
              </label>
              <input
                type="month"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Expiry Date
              </label>
              <input
                type="month"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="input-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Credential ID
              </label>
              <input
                type="text"
                value={formData.credentialId}
                onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                className="input-primary"
                placeholder="ABC123XYZ"
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
              disabled={!formData.name || !formData.issuer || !formData.date}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Certifications List */}
      <div className="space-y-4">
        {certifications.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-primary-500 dark:text-primary-400">
            <p>No certifications added yet</p>
            <p className="text-sm mt-1">Click "Add" to get started</p>
          </div>
        ) : (
          certifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-primary-50 dark:bg-primary-700/20 rounded-xl p-4 border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-primary-900 dark:text-primary-50">{cert.name}</h3>
                  <p className="text-primary-600 dark:text-primary-400 text-sm">{cert.issuer}</p>
                  <p className="text-primary-500 dark:text-primary-500 text-sm">
                    Obtained: {cert.date}
                    {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                  </p>
                  {cert.credentialId && (
                    <p className="text-primary-500 dark:text-primary-500 text-xs mt-1">
                      ID: {cert.credentialId}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(cert)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                    aria-label="Edit certification"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cert.id)}
                    className="p-2 text-primary-500 dark:text-primary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
                    aria-label="Delete certification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50">Clear All Certifications</h3>
            </div>
            <p className="text-primary-600 dark:text-primary-400 text-sm mb-6">
              This will permanently delete all {certifications.length} certification{certifications.length === 1 ? '' : 's'}. This action cannot be undone.
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
