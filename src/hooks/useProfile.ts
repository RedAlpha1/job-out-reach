import { useCallback, useState } from "react";
import type { LLMSettings, Profile } from "../types";
import { loadSettings, saveSettings } from "../lib/providers";

const PROFILE_KEY = "outreach_profile";

export const EMPTY_PROFILE: Profile = {
  fullName: "",
  role: "",
  yearsExperience: "",
  skills: "",
  resumeUrl: "",
  linkedinUrl: "",
  bio: "",
};

function readProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return null;
  }
}

/** A profile is "complete enough" once it has a name and a role. */
export function isProfileComplete(p: Profile | null): p is Profile {
  return !!p && p.fullName.trim().length > 0 && p.role.trim().length > 0;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => readProfile());

  const saveProfile = useCallback((next: Profile) => {
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage unavailable (private mode); keep it in memory */
    }
  }, []);

  return { profile, saveProfile };
}

export function useLLMSettings() {
  const [settings, setSettings] = useState<LLMSettings | null>(() => loadSettings());

  const saveLLMSettings = useCallback((next: LLMSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, saveLLMSettings };
}
