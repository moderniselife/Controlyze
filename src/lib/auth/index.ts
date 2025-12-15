import bcrypt from "bcryptjs";
import { loadConfig } from "@/lib/config";
import { cookies } from "next/headers";

const SESSION_COOKIE = "controlyze_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface User {
  username: string;
  passwordHash: string;
}

interface Session {
  username: string;
  expiresAt: number;
}

// Simple in-memory session store (for single-instance deployments)
// In production with multiple instances, use Redis or DB
const sessions = new Map<string, Session>();

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAuthEnabled(): Promise<boolean> {
  try {
    const config = await loadConfig();
    return config.auth?.enabled === true;
  } catch {
    return false;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const config = await loadConfig();
    if (!config.auth?.enabled || config.auth.provider !== "local") {
      return [];
    }
    return (config.auth as any).local?.users || [];
  } catch {
    return [];
  }
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const users = await getUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return false;
  }

  try {
    return await bcrypt.compare(password, user.passwordHash);
  } catch {
    return false;
  }
}

export async function createSession(username: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

  sessions.set(sessionId, { username, expiresAt });

  return sessionId;
}

export async function validateSession(sessionId: string): Promise<string | null> {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session.username;
}

export async function destroySession(sessionId: string): Promise<void> {
  sessions.delete(sessionId);
}

export async function getSessionFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  return sessionCookie?.value || null;
}

export async function getCurrentUser(): Promise<string | null> {
  const sessionId = await getSessionFromCookies();
  if (!sessionId) {
    return null;
  }
  return validateSession(sessionId);
}

export async function isAuthenticated(): Promise<boolean> {
  const authEnabled = await isAuthEnabled();
  if (!authEnabled) {
    return true; // No auth required
  }

  const user = await getCurrentUser();
  return user !== null;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
