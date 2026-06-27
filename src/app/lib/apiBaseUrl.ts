import { getClientInstanceId } from "./clientInstance";

const PREFERRED_API_BASE_URL_STORAGE_KEY = "venueops-preferred-api-base-url";

const normalizeApiBaseUrl = (value?: string | null) => value?.trim().replace(/\/+$/, "") || null;

const configuredApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL?.trim());

const formatHostname = (hostname: string) => {
  if (hostname.includes(":") && !hostname.startsWith("[")) {
    return `[${hostname}]`;
  }

  return hostname;
};

const getRuntimeApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:3001/api";
  }

  const protocol = window.location.protocol || "http:";
  const hostname = formatHostname(window.location.hostname || "localhost");
  return `${protocol}//${hostname}:3001/api`;
};

const resolveConfiguredApiBaseUrl = () => {
  if (!configuredApiBaseUrl) {
    return null;
  }

  if (configuredApiBaseUrl.startsWith("http://") || configuredApiBaseUrl.startsWith("https://")) {
    return configuredApiBaseUrl;
  }

  if (typeof window === "undefined") {
    return configuredApiBaseUrl;
  }

  if (configuredApiBaseUrl.startsWith("/")) {
    return normalizeApiBaseUrl(`${window.location.origin}${configuredApiBaseUrl}`);
  }

  return normalizeApiBaseUrl(`${window.location.origin}/${configuredApiBaseUrl}`);
};

const getStoredPreferredApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeApiBaseUrl(window.localStorage.getItem(PREFERRED_API_BASE_URL_STORAGE_KEY));
  } catch {
    return null;
  }
};

const rememberPreferredApiBaseUrl = (value: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PREFERRED_API_BASE_URL_STORAGE_KEY, value);
  } catch {
    // Ignore storage errors and keep using the in-memory fallback order.
  }
};

const getFallbackApiBaseUrls = () => {
  if (typeof window === "undefined") {
    return ["http://localhost:3001/api", "http://127.0.0.1:3001/api"];
  }

  const originProxyApi = normalizeApiBaseUrl(`${window.location.origin}/api`);
  return [originProxyApi, "http://localhost:3001/api", "http://127.0.0.1:3001/api"].filter(
    (value): value is string => Boolean(value),
  );
};

export const getApiBaseUrlCandidates = () => {
  const candidates = [
    resolveConfiguredApiBaseUrl(),
    getStoredPreferredApiBaseUrl(),
    getRuntimeApiBaseUrl(),
    ...getFallbackApiBaseUrls(),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
};

const buildApiPath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const shouldRetryWithNextBaseUrl = (response: Response, attemptedBaseUrl: string, candidateCount: number) => {
  if (candidateCount <= 1) {
    return false;
  }

  if ([502, 503, 504].includes(response.status)) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const sameOriginApiBaseUrl = normalizeApiBaseUrl(`${window.location.origin}/api`);
  return response.status === 404 && attemptedBaseUrl === sameOriginApiBaseUrl;
};

export const fetchApi = async (path: string, init?: RequestInit) => {
  const apiPath = buildApiPath(path);
  const candidates = getApiBaseUrlCandidates();
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const headers = new Headers(init?.headers ?? undefined);
      headers.set("X-VenueOps-Client-Id", getClientInstanceId());

      const response = await fetch(`${candidate}${apiPath}`, {
        cache: "no-store",
        ...init,
        headers,
      });

      if (shouldRetryWithNextBaseUrl(response, candidate, candidates.length)) {
        lastError = new Error(`API endpoint unavailable at ${candidate}${apiPath} (${response.status})`);
        continue;
      }

      rememberPreferredApiBaseUrl(candidate);
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Failed to fetch");
};

export const API_BASE_URL = getApiBaseUrlCandidates()[0] || getRuntimeApiBaseUrl();
