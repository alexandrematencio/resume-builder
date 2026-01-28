'use client';

import { useState } from 'react';
import { Download, Shield, AlertTriangle } from 'lucide-react';
import { useJobIntelligence } from '@/app/contexts/JobIntelligenceContext';
import DeleteAccountModal from './DeleteAccountModal';

export default function AccountSettingsTab() {
  const { preferences, updatePreferences } = useJobIntelligence();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleConsentToggle = async () => {
    try {
      await updatePreferences({ aiConsent: !preferences?.aiConsent });
    } catch (error) {
      console.error('Failed to update AI consent:', error);
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    // Trigger download by navigating to the export API endpoint
    window.location.href = '/api/export-user-data';
    // Reset state after a delay (download will have started)
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Privacy Settings Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Privacy Settings</h2>

        {/* AI Consent Toggle */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-medium text-white">AI-Powered Job Analysis</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Allow AI to analyze job postings, match your skills, and generate personalized insights.
                This helps you make informed decisions about which jobs to apply for.
              </p>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConsentToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    preferences?.aiConsent ? 'bg-green-600' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle AI consent"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences?.aiConsent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${preferences?.aiConsent ? 'text-green-400' : 'text-slate-400'}`}>
                  {preferences?.aiConsent ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {!preferences?.aiConsent && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-200">
                    Disabling AI analysis will prevent job matching features. You can re-enable it anytime.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <h3 className="font-medium text-white">Export Your Data</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Download all your data in JSON format. This includes your profile, applications, CVs,
                cover letters, job matches, and preferences. GDPR-compliant data portability.
              </p>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Preparing Export...' : 'Export My Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Danger Zone</h2>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-medium text-red-400">Delete Account</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
                All your applications, CVs, cover letters, and preferences will be permanently removed.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
