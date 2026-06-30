import { authStorage } from "./authStorage";
import { AuthSession, AuthUser } from "./authTypes";
import { fetchApi } from "./apiBaseUrl";

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

const parseError = async (response: Response) => {
  try {
    const payload = await response.json();
    return payload.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const authApi = {
  async login(username: string, password: string): Promise<AuthSession> {
    const response = await fetchApi("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new AuthApiError(await parseError(response), response.status);
    }

    const session = (await response.json()) as AuthSession;
    // S-1: Only persist the non-sensitive user profile — the token lives in an
    // HttpOnly cookie set by the backend and is never read by JavaScript.
    authStorage.saveUser(session.user);
    return session;
  },

  async me(): Promise<AuthUser> {
    // S-1: No need to manually attach a Bearer token — the HttpOnly cookie is
    // sent automatically by the browser via credentials: "include" in fetchApi.
    const response = await fetchApi("/auth/me");

    if (!response.ok) {
      throw new AuthApiError(await parseError(response), response.status);
    }

    const user = (await response.json()) as AuthUser;
    authStorage.saveUser(user);
    return user;
  },
};
