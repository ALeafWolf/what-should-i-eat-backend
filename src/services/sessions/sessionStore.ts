import type { SessionData } from "../../shared/types/index.js";
import {
  SESSION_TTL_MS,
  SESSION_SWEEP_INTERVAL_MS,
} from "../../shared/constants/index.js";

const store = new Map<string, SessionData>();

// Evict expired sessions periodically; .unref() so it doesn't keep the process alive
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of store) {
    if (now - session.lastAccessedAt > SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}, SESSION_SWEEP_INTERVAL_MS).unref();

export function getSession(id: string): SessionData | undefined {
  const session = store.get(id);
  if (!session) return undefined;

  if (Date.now() - session.lastAccessedAt > SESSION_TTL_MS) {
    store.delete(id);
    return undefined;
  }

  session.lastAccessedAt = Date.now();
  return session;
}

export function setSession(data: SessionData): void {
  store.set(data.id, { ...data, lastAccessedAt: Date.now() });
}

export function deleteSession(id: string): void {
  store.delete(id);
}

export function createSession(id: string): SessionData {
  const now = Date.now();
  return {
    id,
    conversationHistory: [],
    createdAt: now,
    lastAccessedAt: now,
  };
}
