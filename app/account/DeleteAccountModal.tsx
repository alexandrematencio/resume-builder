'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  onClose: () => void;
}

export default function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [exportAcknowledged, setExportAcknowledged] = useState(false);
  const [understandAcknowledged, setUnderstandAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmValid = confirmText === 'DELETE';
  const canDelete = isConfirmValid && exportAcknowledged && understandAcknowledged;

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Redirect to landing page with success message
      router.push('/landing?deleted=true');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden border border-red-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Delete Account
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm font-medium text-red-400 mb-2">
              ⚠️ This action is permanent and cannot be undone.
            </p>
            <p className="text-sm text-slate-300">
              The following data will be permanently deleted:
            </p>
          </div>

          {/* Consequences List */}
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Your profile and all personal information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>All job applications and CVs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>All cover letters</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>All job matches and analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>All preferences and settings</span>
            </li>
          </ul>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label htmlFor="confirm-delete" className="block text-sm font-medium text-slate-300">
              Type <span className="font-bold text-red-400">DELETE</span> to confirm:
            </label>
            <input
              id="confirm-delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Type DELETE"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={exportAcknowledged}
                onChange={(e) => setExportAcknowledged(e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-slate-300">
                I have exported my data (if needed)
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={understandAcknowledged}
                onChange={(e) => setUnderstandAcknowledged(e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-slate-300">
                I understand this action cannot be undone
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
