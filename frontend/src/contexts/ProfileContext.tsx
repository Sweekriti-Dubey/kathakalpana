import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';

export interface SetupAccountData {
  parent_name: string;
  parent_pin: string;
  kid_name: string;
  kid_age_range: '3-5' | '6-8' | '9-12';
  screen_time_limit: number;   // daily max minutes — edge fn converts to per-day JSONB
  daily_story_goal: number;    // edge fn converts to weekly_stories_goal * 7
  pet_name: string;
}

export interface CreateKidData {
  name: string;
  avatar_emoji?: string;
  age_range: '3-5' | '6-8' | '9-12';
  birth_year?: number;
  reading_level?: 'beginner' | 'intermediate' | 'advanced';
  screen_time_limit?: number;
  daily_story_goal?: number;
  pet_name?: string;
}

interface ProfileContextType {
  currentProfile: Profile | null;
  availableProfiles: Profile[];
  isLoading: boolean;
  showSelector: boolean;
  needsOnboarding: boolean;
  switchProfile: (profileId: string) => void;
  refreshProfiles: () => Promise<void>;
  openSelector: () => void;
  closeSelector: () => void;
  setupAccount: (data: SetupAccountData) => Promise<{ success: boolean; error?: string }>;
  createKidProfile: (data: CreateKidData) => Promise<{ success: boolean; error?: string }>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
  session: Session | null;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children, session }) => {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSelector, setShowSelector] = useState<boolean>(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  const baseUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined)
    ?.trim()
    ?.replace(/\/$/, '') ?? '';

  const refreshProfiles = useCallback(async (): Promise<void> => {
    if (!session?.access_token || !baseUrl) return;

    try {
      const { data } = await axios.get<Profile[]>(
        `${baseUrl}/get-profiles`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setAvailableProfiles(data);

      const hasKidProfiles = data.some(p => p.profile_type === 'kid');
      
      if (!hasKidProfiles) {
        setNeedsOnboarding(true);
        setShowSelector(false);
        return;
      }

      setNeedsOnboarding(false);

      const savedId = localStorage.getItem('currentProfileId');
      const savedProfile = savedId ? data.find(p => p.profile_id === savedId) : null;

      if (savedProfile) {
        setCurrentProfile(savedProfile);
      } else if (data.length === 1) {

        setCurrentProfile(data[0]);
        localStorage.setItem('currentProfileId', data[0].profile_id);
      } else if (data.length >= 2) {

        setShowSelector(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch profiles:', error);
      if (error?.response?.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
  }, [session?.access_token, baseUrl]);

  const switchProfile = useCallback((profileId: string): void => {
    const profile = availableProfiles.find(p => p.profile_id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      localStorage.setItem('currentProfileId', profileId);
      setShowSelector(false);
    }
  }, [availableProfiles]);

  const openSelector = useCallback((): void => setShowSelector(true), []);
  const closeSelector = useCallback((): void => setShowSelector(false), []);

  const setupAccount = useCallback(async (data: SetupAccountData): Promise<{ success: boolean; error?: string }> => {
    if (!session?.access_token || !baseUrl) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      await axios.post(
        `${baseUrl}/setup-account`,
        data,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      await refreshProfiles();
      setNeedsOnboarding(false);
      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Setup failed';
      console.error('setupAccount error:', message);
      return { success: false, error: message };
    }
  }, [session?.access_token, baseUrl, refreshProfiles]);

  const createKidProfile = useCallback(async (data: CreateKidData): Promise<{ success: boolean; error?: string }> => {
    if (!session?.access_token || !baseUrl) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      await axios.post(
        `${baseUrl}/create-profile`,
        data,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      await refreshProfiles();
      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to create profile';
      console.error('createKidProfile error:', message);
      return { success: false, error: message };
    }
  }, [session?.access_token, baseUrl, refreshProfiles]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setIsLoading(true);
      await refreshProfiles();
      setIsLoading(false);
    };

    if (session) {
      load();
    } else {

      setCurrentProfile(null);
      setAvailableProfiles([]);
      setIsLoading(false);
      setShowSelector(false);
      setNeedsOnboarding(false);
      localStorage.removeItem('currentProfileId');
    }
  }, [session, refreshProfiles]);

  return (
    <ProfileContext.Provider value={{
      currentProfile,
      availableProfiles,
      isLoading,
      showSelector,
      needsOnboarding,
      switchProfile,
      refreshProfiles,
      openSelector,
      closeSelector,
      setupAccount,
      createKidProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};
