'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sliders } from 'lucide-react';
import { useJobIntelligence } from '@/app/contexts/JobIntelligenceContext';
import { COMMON_PERKS, PERK_LABELS, type RemotePreference } from '@/app/types';
import AutocompleteInput, { AutocompleteOption } from '@/app/components/AutocompleteInput';
import { COUNTRIES, CITIES } from '@/lib/location-data';

const jobPreferencesSchema = z.object({
  minSalary: z.number().nullable(),
  salaryCurrency: z.string(),
  minHourlyRate: z.number().nullable(),
  minDailyRate: z.number().nullable(),
  minHoursPerWeek: z.number().min(1).max(80),
  maxHoursPerWeek: z.number().min(1).max(80),
  remotePreference: z.enum(['full_remote', 'hybrid', 'on_site', 'any']),
  weightSalary: z.number().min(0).max(100),
  weightSkills: z.number().min(0).max(100),
  weightPerks: z.number().min(0).max(100),
  minSkillsMatchPercent: z.number().min(0).max(100),
});

type JobPreferencesData = z.infer<typeof jobPreferencesSchema>;

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

export default function JobPreferencesForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { preferences, updatePreferences } = useJobIntelligence();

  // Local state for arrays (not handled by react-hook-form)
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [allowedCities, setAllowedCities] = useState<string[]>([]);
  const [preferredPerks, setPreferredPerks] = useState<string[]>([]);

  // Memoized options for country and city selectors
  const countryOptions: AutocompleteOption[] = useMemo(() =>
    COUNTRIES.map(country => ({
      value: country.name,
      label: country.name,
    })),
    []
  );

  const cityOptions: AutocompleteOption[] = useMemo(() =>
    CITIES.map(city => ({
      value: city.name,
      label: city.name,
      sublabel: city.country,
    })),
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<JobPreferencesData>({
    resolver: zodResolver(jobPreferencesSchema),
    defaultValues: {
      minSalary: null,
      salaryCurrency: 'EUR',
      minHourlyRate: null,
      minDailyRate: null,
      minHoursPerWeek: 35,
      maxHoursPerWeek: 45,
      remotePreference: 'any',
      weightSalary: 30,
      weightSkills: 50,
      weightPerks: 20,
      minSkillsMatchPercent: 65,
    },
  });

  const weightSalary = watch('weightSalary');
  const weightSkills = watch('weightSkills');
  const weightPerks = watch('weightPerks');
  const totalWeight = weightSalary + weightSkills + weightPerks;

  // Sync form with preferences data
  useEffect(() => {
    if (preferences) {
      reset({
        minSalary: preferences.minSalary,
        salaryCurrency: preferences.salaryCurrency || 'EUR',
        minHourlyRate: preferences.minHourlyRate,
        minDailyRate: preferences.minDailyRate,
        minHoursPerWeek: preferences.minHoursPerWeek,
        maxHoursPerWeek: preferences.maxHoursPerWeek,
        remotePreference: preferences.remotePreference,
        weightSalary: preferences.weightSalary,
        weightSkills: preferences.weightSkills,
        weightPerks: preferences.weightPerks,
        minSkillsMatchPercent: preferences.minSkillsMatchPercent,
      });
      setAllowedCountries(preferences.allowedCountries || []);
      setAllowedCities(preferences.allowedCities || []);
      setPreferredPerks(preferences.preferredPerks || []);
    }
  }, [preferences, reset]);

  const onSubmit = async (data: JobPreferencesData) => {
    onSaveStart();
    const success = await updatePreferences({
      ...data,
      allowedCountries,
      allowedCities,
      preferredPerks,
    });
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  const togglePerk = (perk: string) => {
    if (preferredPerks.includes(perk)) {
      setPreferredPerks(preferredPerks.filter((p) => p !== perk));
    } else {
      setPreferredPerks([...preferredPerks, perk]);
    }
  };

  const hasChanges = isDirty ||
    JSON.stringify(allowedCountries) !== JSON.stringify(preferences?.allowedCountries || []) ||
    JSON.stringify(allowedCities) !== JSON.stringify(preferences?.allowedCities || []) ||
    JSON.stringify(preferredPerks) !== JSON.stringify(preferences?.preferredPerks || []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Job Preferences</h2>
        <p className="text-primary-600 dark:text-primary-400 text-sm">
          Configure your job search criteria. Jobs that don&apos;t meet these requirements will be filtered out.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Location Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Location</h3>

          {/* Countries */}
          <div>
            <AutocompleteInput
              multi
              label="Allowed Countries"
              options={countryOptions}
              value={allowedCountries}
              onChange={setAllowedCountries}
              placeholder="Type to search countries (e.g., France, Germany...)"
            />
            {allowedCountries.length === 0 && (
              <p className="text-sm text-primary-500 dark:text-primary-400 mt-2">
                No restrictions (all countries allowed)
              </p>
            )}
          </div>

          {/* Cities */}
          <div>
            <AutocompleteInput
              multi
              label="Allowed Cities"
              options={cityOptions}
              value={allowedCities}
              onChange={setAllowedCities}
              placeholder="Type to search cities (e.g., Paris, Berlin...)"
            />
            {allowedCities.length === 0 && (
              <p className="text-sm text-primary-500 dark:text-primary-400 mt-2">
                No restrictions (all cities allowed)
              </p>
            )}
          </div>
        </div>

        {/* Salary Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Compensation</h3>

          {/* Currency Selection (shared) */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Preferred Currency
            </label>
            <select {...register('salaryCurrency')} className="select-primary">
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </div>

          {/* Annual Salary */}
          <div className="p-4 border border-primary-200 dark:border-primary-700 rounded-lg bg-primary-50/50 dark:bg-primary-800/50">
            <h4 className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-3">
              Full-time / CDI / CDD
            </h4>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Minimum Annual Salary
              </label>
              <input
                type="number"
                {...register('minSalary', { valueAsNumber: true })}
                className="input-primary"
                placeholder="45000"
              />
              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                Jobs with annual salary below this will be blocked
              </p>
            </div>
          </div>

          {/* Freelance Rates */}
          <div className="p-4 border border-accent-200 dark:border-accent-700 rounded-lg bg-accent-50/30 dark:bg-accent-900/20">
            <h4 className="text-sm font-medium text-accent-800 dark:text-accent-200 mb-3">
              Freelance / Contractor
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                  Minimum Hourly Rate
                </label>
                <input
                  type="number"
                  {...register('minHourlyRate', { valueAsNumber: true })}
                  className="input-primary"
                  placeholder="50"
                />
                <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                  For jobs with hourly rates (e.g., 50€/h)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                  Minimum Daily Rate (TJM)
                </label>
                <input
                  type="number"
                  {...register('minDailyRate', { valueAsNumber: true })}
                  className="input-primary"
                  placeholder="400"
                />
                <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                  For jobs with daily rates (e.g., 400€/day)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Work Conditions */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Work Conditions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Hours per Week Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  {...register('minHoursPerWeek', { valueAsNumber: true })}
                  className="input-primary w-20"
                  min={1}
                  max={80}
                />
                <span className="text-primary-600 dark:text-primary-400">to</span>
                <input
                  type="number"
                  {...register('maxHoursPerWeek', { valueAsNumber: true })}
                  className="input-primary w-20"
                  min={1}
                  max={80}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                Remote Preference
              </label>
              <select {...register('remotePreference')} className="select-primary">
                <option value="any">Any (No preference)</option>
                <option value="full_remote">Full Remote Only</option>
                <option value="hybrid">Hybrid Only</option>
                <option value="on_site">On-site Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Preferred Perks</h3>
          <p className="text-sm text-primary-600 dark:text-primary-400">
            Select the benefits you value most. These will be used for scoring.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {COMMON_PERKS.map((perk) => (
              <button
                key={perk}
                type="button"
                onClick={() => togglePerk(perk)}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  preferredPerks.includes(perk)
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-200 border border-accent-300 dark:border-accent-700'
                    : 'bg-primary-50 dark:bg-primary-800 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                {PERK_LABELS[perk] || perk}
              </button>
            ))}
          </div>
        </div>

        {/* Scoring Weights */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-medium text-primary-800 dark:text-primary-200">Scoring Weights</h3>
          </div>
          <p className="text-sm text-primary-600 dark:text-primary-400">
            Adjust how much each factor contributes to the overall match score.
            {totalWeight !== 100 && (
              <span className="text-warning-600 dark:text-warning-400 ml-2">
                (Total: {totalWeight}% - should be 100%)
              </span>
            )}
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Salary Weight
                </label>
                <span className="text-sm text-primary-600 dark:text-primary-400">{weightSalary}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                {...register('weightSalary', { valueAsNumber: true })}
                className="w-full h-2 bg-primary-200 dark:bg-primary-700 rounded-lg appearance-none cursor-pointer accent-accent-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Skills Match Weight
                </label>
                <span className="text-sm text-primary-600 dark:text-primary-400">{weightSkills}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                {...register('weightSkills', { valueAsNumber: true })}
                className="w-full h-2 bg-primary-200 dark:bg-primary-700 rounded-lg appearance-none cursor-pointer accent-accent-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Perks Weight
                </label>
                <span className="text-sm text-primary-600 dark:text-primary-400">{weightPerks}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                {...register('weightPerks', { valueAsNumber: true })}
                className="w-full h-2 bg-primary-200 dark:bg-primary-700 rounded-lg appearance-none cursor-pointer accent-accent-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Minimum Skills Match Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                {...register('minSkillsMatchPercent', { valueAsNumber: true })}
                className="input-primary w-24"
                min={0}
                max={100}
              />
              <span className="text-primary-600 dark:text-primary-400">%</span>
            </div>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
              Jobs below this skills match percentage will be flagged
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-primary-200 dark:border-primary-700">
          <button
            type="submit"
            disabled={!hasChanges}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
