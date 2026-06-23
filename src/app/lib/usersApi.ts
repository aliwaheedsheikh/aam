import { API_BASE_URL } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";

const authorizedHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

const parseApiError = async (response: Response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string") {
      return payload.message;
    }
    if (Array.isArray(payload?.message)) {
      return payload.message.join(", ");
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return response.statusText || `Request failed (${response.status})`;
};

export type UserPermissionInput = {
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  canManage: boolean;
};

export type ManagedUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: string;
  isActive: boolean;
  permissions: UserPermissionInput[];
};

export const usersApi = {
  async fetchUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load users (${response.status})`);
    }

    return (await response.json()) as ManagedUser[];
  },

  async fetchPermissionCatalog() {
    const response = await fetch(`${API_BASE_URL}/users/permission-catalog`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load permission catalog (${response.status})`);
    }

    return (await response.json()) as Array<{ key: string; label: string }>;
  },

  async createUser(payload: {
    fullName: string;
    username: string;
    email?: string;
    password: string;
    role: string;
    isActive: boolean;
    permissions: UserPermissionInput[];
  }) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: authorizedHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return (await response.json()) as ManagedUser;
  },

  async updateUser(
    id: string,
    payload: Partial<{
      fullName: string;
      username: string;
      email?: string;
      password: string;
      role: string;
      isActive: boolean;
      permissions: UserPermissionInput[];
    }>,
  ) {
    const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authorizedHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return (await response.json()) as ManagedUser;
  },
};
