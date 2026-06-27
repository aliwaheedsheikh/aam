import { getApiBaseUrlCandidates } from "./apiBaseUrl";
import { getAuthToken } from "./authStorage";
import { getClientInstanceId } from "./clientInstance";

type LiveSyncStatus = "disconnected" | "connecting" | "connected";

type ConnectionReadyEvent = {
  type: "connection.ready";
};

type ConnectionAuthenticatedEvent = {
  type: "connection.authenticated";
};

export type LiveSyncResourceChangeEvent = {
  type: "resource.changed";
  resource: "master-data" | "workflow-state" | "bookings" | "service-bookings";
  action: "upsert" | "delete" | "bulk-sync";
  key?: string;
  recordId?: string;
  timestamp: string;
};

type LiveSyncMessage = ConnectionReadyEvent | ConnectionAuthenticatedEvent | LiveSyncResourceChangeEvent;

type LiveSyncListener = (event: LiveSyncResourceChangeEvent) => void;
type LiveSyncStatusListener = (status: LiveSyncStatus) => void;

const SOCKET_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];

const normalizeSocketUrl = (value: string) => value.replace(/\/+$/, "");

const getRuntimeSocketUrl = () => {
  if (typeof window === "undefined") {
    return "ws://localhost:3001/ws";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:3001/ws`;
};

const getSocketUrlCandidates = () => {
  const runtimeCandidate = getRuntimeSocketUrl();
  const apiCandidates = getApiBaseUrlCandidates()
    .map((candidate) => {
      try {
        const parsed = new URL(candidate);
        if (parsed.port !== "3001") {
          return null;
        }

        parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
        parsed.pathname = "/ws";
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
      } catch {
        return null;
      }
    })
    .filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set([runtimeCandidate, ...apiCandidates].map(normalizeSocketUrl)));
};

class LiveSyncSocketManager {
  private readonly listeners = new Set<LiveSyncListener>();
  private readonly statusListeners = new Set<LiveSyncStatusListener>();
  private reconnectTimer: number | null = null;
  private socket: WebSocket | null = null;
  private status: LiveSyncStatus = "disconnected";
  private reconnectAttempt = 0;
  private candidateIndex = 0;
  private manualClose = false;

  subscribe(listener: LiveSyncListener, statusListener?: LiveSyncStatusListener) {
    this.listeners.add(listener);
    this.ensureConnected();

    if (statusListener) {
      this.statusListeners.add(statusListener);
      statusListener(this.status);
    }

    return () => {
      this.listeners.delete(listener);
      if (statusListener) {
        this.statusListeners.delete(statusListener);
      }

      if (this.listeners.size === 0 && this.statusListeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private ensureConnected() {
    if (this.socket || this.reconnectTimer !== null) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      this.setStatus("disconnected");
      return;
    }

    const candidates = getSocketUrlCandidates();
    const nextUrl = candidates[this.candidateIndex % candidates.length];
    this.manualClose = false;
    this.setStatus("connecting");

    try {
      const socket = new WebSocket(nextUrl);
      this.socket = socket;

      socket.addEventListener("open", () => {
        this.reconnectAttempt = 0;
        this.send({
          type: "auth",
          token: getAuthToken(),
          clientId: getClientInstanceId(),
        });
      });

      socket.addEventListener("message", (event) => {
        this.handleMessage(event);
      });

      socket.addEventListener("close", () => {
        this.socket = null;
        this.setStatus("disconnected");
        if (!this.manualClose) {
          this.scheduleReconnect();
        }
      });

      socket.addEventListener("error", () => {
        socket.close();
      });
    } catch {
      this.socket = null;
      this.setStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent<string>) {
    let message: LiveSyncMessage | null = null;

    try {
      message = JSON.parse(event.data) as LiveSyncMessage;
    } catch {
      return;
    }

    if (!message) {
      return;
    }

    if (message.type === "connection.authenticated") {
      this.setStatus("connected");
      return;
    }

    if (message.type !== "resource.changed") {
      return;
    }

    this.listeners.forEach((listener) => {
      listener(message as LiveSyncResourceChangeEvent);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || this.listeners.size === 0) {
      return;
    }

    const candidates = getSocketUrlCandidates();
    this.candidateIndex = (this.candidateIndex + 1) % candidates.length;
    const delay =
      SOCKET_RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, SOCKET_RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private disconnect() {
    this.manualClose = true;

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setStatus("disconnected");
  }

  private send(message: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private setStatus(status: LiveSyncStatus) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}

const liveSyncSocketManager = new LiveSyncSocketManager();

export const subscribeToLiveSync = (
  listener: LiveSyncListener,
  statusListener?: LiveSyncStatusListener,
) => liveSyncSocketManager.subscribe(listener, statusListener);
