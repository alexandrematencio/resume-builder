'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { UserProfile, RoleProfile } from '@/app/types';
import {
  loadUserProfile,
  saveUserProfile,
  createEmptyProfile,
  loadRoleProfiles,
  saveRoleProfile,
  deleteRoleProfile,
  setDefaultRoleProfile,
  isProfileComplete,
  getMissingProfileFields,
} from '@/lib/profile-db';
import { logError } from '@/lib/error-utils';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  // User Profile
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;

  // Role Profiles
  roleProfiles: RoleProfile[];
  roleProfilesLoading: boolean;
  createRoleProfile: (roleProfile: Partial<RoleProfile>) => Promise<boolean>;
  updateRoleProfile: (roleProfile: Partial<RoleProfile>) => Promise<boolean>;
  removeRoleProfile: (roleProfileId: string) => Promise<boolean>;
  setDefaultRole: (roleProfileId: string) => Promise<boolean>;
  refreshRoleProfiles: () => Promise<void>;

  // Helpers
  isComplete: boolean;
  missingFields: string[];
  getDefaultRoleProfile: () => RoleProfile | undefined;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // User Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Role Profiles state
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [roleProfilesLoading, setRoleProfilesLoading] = useState(true);

  // Load user profile
  const refreshProfile = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) {
      setProfileLoading(true);
      return;
    }

    if (!user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      let loadedProfile = await loadUserProfile();

      // Create empty profile ONLY if no error thrown
      if (!loadedProfile) {
        loadedProfile = await createEmptyProfile();
      }

      setProfile(loadedProfile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
      setProfileError(errorMessage);
      // Don't set profile to null if error - keep old state
    } finally {
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  // Load role profiles
  const refreshRoleProfiles = useCallback(async () => {
    // Wait for auth to finish loading
    if (authLoading) {
      // Signal that we're waiting for auth
      setRoleProfilesLoading(true);
      return;
    }

    if (!user) {
      setRoleProfiles([]);
      setRoleProfilesLoading(false);
      return;
    }

    setRoleProfilesLoading(true);

    try {
      const loadedRoles = await loadRoleProfiles();
      setRoleProfiles(loadedRoles);
    } catch (error) {
      logError('Error loading role profiles', error);
      // Don't clear role profiles on error - keep old state
    } finally {
      setRoleProfilesLoading(false);
    }
  }, [user, authLoading]);

  // Load data when user changes and auth is ready
  useEffect(() => {
    if (!authLoading && user) {
      refreshProfile();
      refreshRoleProfiles();
    } else if (!authLoading && !user) {
      // Clear state when logged out
      setProfile(null);
      setProfileLoading(false);
      setRoleProfiles([]);
      setRoleProfilesLoading(false);
    }
  }, [user, authLoading, refreshProfile, refreshRoleProfiles]);

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;

    const updatedProfile = { ...profile, ...updates };
    const success = await saveUserProfile(updatedProfile);

    if (success) {
      await refreshProfile();
    }

    return success;
  };

  // Create role profile
  const createRoleProfile = async (roleProfile: Partial<RoleProfile>): Promise<boolean> => {
    const success = await saveRoleProfile(roleProfile);

    if (success) {
      await refreshRoleProfiles();
    }

    return success;
  };

  // Update role profile
  const updateRoleProfile = async (roleProfile: Partial<RoleProfile>): Promise<boolean> => {
    const success = await saveRoleProfile(roleProfile);

    if (success) {
      await refreshRoleProfiles();
    }

    return success;
  };

  // Remove role profile
  const removeRoleProfile = async (roleProfileId: string): Promise<boolean> => {
    const success = await deleteRoleProfile(roleProfileId);

    if (success) {
      await refreshRoleProfiles();
    }

    return success;
  };

  // Set default role
  const setDefaultRole = async (roleProfileId: string): Promise<boolean> => {
    const success = await setDefaultRoleProfile(roleProfileId);

    if (success) {
      await refreshRoleProfiles();
    }

    return success;
  };

  // Get default role profile
  const getDefaultRoleProfile = (): RoleProfile | undefined => {
    return roleProfiles.find((rp) => rp.isDefault);
  };

  // Computed values
  const isComplete = isProfileComplete(profile);
  const missingFields = getMissingProfileFields(profile);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        profileLoading,
        profileError,
        updateProfile,
        refreshProfile,
        roleProfiles,
        roleProfilesLoading,
        createRoleProfile,
        updateRoleProfile,
        removeRoleProfile,
        setDefaultRole,
        refreshRoleProfiles,
        isComplete,
        missingFields,
        getDefaultRoleProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
