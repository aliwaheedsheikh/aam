/**
 * S-1: Auth storage hardened — the JWT access token is NO LONGER stored in localStorage.
 *
 * The token now lives in an HttpOnly cookie set by the backend login endpoint.
 * HttpOnly cookies are invisible to JavaScript and cannot be exfiltrated by XSS.
 *
 * Only the non-sensitive user profile object (no credentials, no token) is kept
 * in localStorage so the UI can render the user's name/role across page refreshes.
 */
import { AuthUser } from "./authTypes";

const USER_STORAGE_KEY = "venueops-auth-user";

export const authStorage = {
  loadUser(): AuthUser | null {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  },

  saveUser(user: AuthUser) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  clear() {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  },
};

/**
 * S-1: Token is now managed by the browser via HttpOnly cookie — do not read it in JS.
 * This function is kept as a no-op stub so callers that previously attached
 * `Authorization: Bearer <token>` headers will gracefully send an empty string.
 * Those callers will continue to work because the browser will also send the cookie
 * automatically on every request to the same origin.
 */
export const getAuthToken = (): string => "";
