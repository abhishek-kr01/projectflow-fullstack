import { API_BASE_URL, api } from "@/lib/api";

export type AuthenticatedStreamScope = "project" | "notifications";
export interface AuthenticatedSseOptions {
  scope: AuthenticatedStreamScope;
  projectId?: string;
  path: string;
  eventNames: readonly string[];
  onEvent: (eventName: string, data: unknown) => void;
  onStatus: (connected: boolean) => void;
  onAccessRevoked?: () => void;
}

/**
 * EventSource cannot set a custom Authorization header. This helper mints a short-lived,
 * narrowly-scoped stream token through the normal authenticated API, then reconnects with a
 * fresh token whenever a stream fails or the access token rotates.
 */
export function openAuthenticatedSse(options: AuthenticatedSseOptions): () => void {
  let disposed = false;
  let generation = 0;
  let source: EventSource | null = null;
  let retryTimer: number | null = null;
  let retryDelay = 1000;

  const clearRetry = () => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (disposed || retryTimer !== null) return;
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, 15_000);
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  };

  const connect = async () => {
    if (disposed) return;
    clearRetry();
    const attempt = ++generation;
    source?.close();
    source = null;
    options.onStatus(false);

    try {
      const { token } = await api.realtime.createStreamToken({ scope: options.scope, ...(options.projectId ? { projectId: options.projectId } : {}) });
      if (disposed || attempt !== generation) return;

      const separator = options.path.includes("?") ? "&" : "?";
      const url = `${API_BASE_URL}${options.path}${separator}token=${encodeURIComponent(token)}`;
      const currentSource = new EventSource(url, { withCredentials: true });
      source = currentSource;

      const connected = () => {
        if (disposed || source !== currentSource) return;
        retryDelay = 1000;
        options.onStatus(true);
      };
      currentSource.onopen = connected;
      currentSource.addEventListener("connected", connected);

      for (const eventName of options.eventNames) {
        currentSource.addEventListener(eventName, (event) => {
          if (disposed || source !== currentSource) return;
          try {
            const parsed = JSON.parse((event as MessageEvent<string>).data) as unknown;
            options.onEvent(eventName, parsed);
          } catch {
            // Ignore malformed events; a single event should not stop the stream.
          }
        });
      }

      currentSource.addEventListener("access:revoked", () => {
        if (source !== currentSource) return;
        source?.close();
        source = null;
        options.onStatus(false);
        options.onAccessRevoked?.();
      });

      currentSource.onerror = () => {
        if (disposed || source !== currentSource) return;
        currentSource.close();
        source = null;
        options.onStatus(false);
        scheduleReconnect();
      };
    } catch {
      if (disposed || attempt !== generation) return;
      options.onStatus(false);
      scheduleReconnect();
    }
  };

  const tokenRefreshed = () => { void connect(); };
  window.addEventListener("projectflow:token-refreshed", tokenRefreshed);
  void connect();

  return () => {
    disposed = true;
    generation += 1;
    clearRetry();
    source?.close();
    source = null;
    window.removeEventListener("projectflow:token-refreshed", tokenRefreshed);
    options.onStatus(false);
  };
}
