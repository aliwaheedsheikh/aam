import { AuthSession } from "./authTypes";

const AUTH_STORAGE_KEY = "venueops-auth-session";

export const authStorage = {
  load(): AuthSession | null {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthSession;
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },

  save(session: AuthSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  },

  clear() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  },
};

export const getAuthToken = () => authStorage.load()?.accessToken ?? "";
