'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile } from '@/app/contexts/ProfileContext';
import AutocompleteInput from '@/app/components/AutocompleteInput';
import { COUNTRIES, CITIES } from '@/lib/location-data';

const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  professionalSummary: z.string().optional(),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

interface Props {
  onSaveStart: () => void;
  onSaveSuccess: () => void;
  onSaveError: () => void;
}

export default function PersonalInfoForm({ onSaveStart, onSaveSuccess, onSaveError }: Props) {
  const { profile, updateProfile } = useProfile();

  const countryOptions = useMemo(() =>
    COUNTRIES.map(c => ({ value: c.name, label: c.name })),
    []
  );

  const cityOptions = useMemo(() =>
    CITIES.map(c => ({ value: c.name, label: c.name, sublabel: c.country })),
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      city: '',
      country: '',
      professionalSummary: '',
    },
  });

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
        city: profile.city || '',
        country: profile.country || '',
        professionalSummary: profile.professionalSummary || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: PersonalInfoData) => {
    onSaveStart();
    const success = await updateProfile(data);
    if (success) {
      onSaveSuccess();
    } else {
      onSaveError();
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary-900 dark:text-primary-50 mb-2">Essential Information</h2>
        <p className="text-primary-600 dark:text-primary-400 text-sm">
          This information is required to generate professional CVs.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Full name <span className="text-error-500">*</span>
            </label>
            <input
              {...register('fullName')}
              type="text"
              className="input-primary"
              placeholder="John Smith"
            />
            {errors.fullName && (
              <p className="text-error-500 text-sm mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Email <span className="text-error-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className="input-primary"
              placeholder="john.smith@email.com"
            />
            {errors.email && (
              <p className="text-error-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Phone
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="input-primary"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
              Date of birth
            </label>
            <input
              {...register('dateOfBirth')}
              type="date"
              className="input-primary"
            />
          </div>

          <div>
            <AutocompleteInput
              label="City"
              options={cityOptions}
              value={watch('city') || ''}
              onChange={(val) => setValue('city', val, { shouldDirty: true })}
              placeholder="New York"
            />
          </div>

          <div>
            <AutocompleteInput
              label="Country"
              options={countryOptions}
              value={watch('country') || ''}
              onChange={(val) => setValue('country', val, { shouldDirty: true })}
              placeholder="United States"
            />
          </div>
        </div>

        {/* Professional Summary */}
        <div>
          <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
            Professional summary
          </label>
          <textarea
            {...register('professionalSummary')}
            rows={5}
            className="textarea-primary resize-none"
            placeholder="Describe your professional background in 3-5 sentences. Mention your areas of expertise, key achievements, and what you're looking for..."
          />
          <p className="text-primary-500 dark:text-primary-400 text-xs mt-1">
            This summary will be used as a basis for generating customized CVs.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
