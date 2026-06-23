import { authStorage, getAuthToken } from "./authStorage";
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
  async login(username: string, password: string) {
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
    authStorage.save(session);
    return session;
  },

  async me() {
    const token = getAuthToken();
    if (!token) {
      throw new AuthApiError("No active session");
    }

    const response = await fetchApi("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new AuthApiError(await parseError(response), response.status);
    }

    const user = (await response.json()) as AuthUser;
    const current = authStorage.load();
    if (current) {
      authStorage.save({
        ...current,
        user,
      });
    }
    return user;
  },
};
