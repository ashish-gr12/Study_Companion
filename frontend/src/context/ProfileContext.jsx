import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getProfile, updateProfile } from "../lib/api";

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (patch) => {
    const p = await updateProfile(patch);
    setProfile(p);
    return p;
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, save }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
