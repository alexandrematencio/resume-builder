'use client';

import { X, Shield, ExternalLink } from 'lucide-react';

interface AIConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AIConsentModal({ isOpen, onAccept, onDecline }: AIConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-primary-800 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary-200 dark:border-primary-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            </div>
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
              AI Analysis Consent
            </h2>
          </div>
          <button
            onClick={onDecline}
            className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-primary-700 dark:text-primary-300 text-sm leading-relaxed">
            To provide personalized job matching and insights, we analyze your profile
            against job descriptions using Claude AI (by Anthropic).
          </p>

          <p className="text-primary-700 dark:text-primary-300 text-sm leading-relaxed">
            This means your professional profile and the job description will be
            processed by an external AI service.
          </p>

          <div className="p-4 bg-primary-50 dark:bg-primary-900 rounded-lg space-y-2">
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
              Your data:
            </p>
            <ul className="text-sm text-primary-600 dark:text-primary-400 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-accent-600 dark:text-accent-400 mt-0.5">•</span>
                <span>Is used only for this analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-600 dark:text-accent-400 mt-0.5">•</span>
                <span>Is not stored by the AI service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-600 dark:text-accent-400 mt-0.5">•</span>
                <span>Remains under your control</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-primary-500 dark:text-primary-500">
            You can withdraw consent at any time in your Account settings.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/50">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
