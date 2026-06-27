const CLIENT_INSTANCE_STORAGE_KEY = "venueops-client-instance-id";

const generateClientInstanceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getClientInstanceId = () => {
  if (typeof window === "undefined") {
    return "server-render";
  }

  try {
    const stored = window.sessionStorage.getItem(CLIENT_INSTANCE_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const nextId = generateClientInstanceId();
    window.sessionStorage.setItem(CLIENT_INSTANCE_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return generateClientInstanceId();
  }
};
