import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, profileAPI } from "../services/api.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);  // user location + vehicle
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const p = await profileAPI.get();
      setProfile(p || null);
      return p;
    } catch { return null; }
  };

  useEffect(() => {
    const token = localStorage.getItem("parkease_token");
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(async u => { setUser(u); await loadProfile(); })
      .catch(() => localStorage.removeItem("parkease_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem("parkease_token", data.token);
    setUser(data.user);
    await loadProfile();
    return data.user;
  };

  const register = async (name, email, password, phone) => {
    const data = await authAPI.register({ name, email, password, phone });
    localStorage.setItem("parkease_token", data.token);
    setUser(data.user);
    setProfile(null); // new user — no profile yet
    return data.user;
  };

  const saveProfile = async (profileData) => {
    await profileAPI.save(profileData);
    setProfile(profileData);
  };

  const logout = () => {
    localStorage.removeItem("parkease_token");
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, saveProfile, loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
