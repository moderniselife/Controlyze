import bcrypt from "bcryptjs";
import { loadRawConfig } from "@/lib/config";
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

export function isAuthEnabled(): boolean {
  try {
    const config = loadRawConfig();
    console.log("Auth: isAuthEnabled check, auth.enabled =", config.auth?.enabled);
    return config.auth?.enabled === true;
  } catch (e) {
    console.error("Auth: isAuthEnabled error:", e);
    return false;
  }
}

export function getUsers(): User[] {
  try {
    const config = loadRawConfig();
    console.log("Auth: getUsers check, provider =", config.auth?.provider);
    console.log("Auth: local users count =", config.auth?.local?.users?.length || 0);
    if (!config.auth?.enabled || config.auth.provider !== "local") {
      return [];
    }
    return config.auth.local?.users || [];
  } catch (e) {
    console.error("Auth: getUsers error:", e);
    return [];
  }
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const users = getUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    console.log("Auth: User not found:", username);
    console.log("Auth: Available users:", users.map(u => u.username));
    return false;
  }

  try {
    const result = await bcrypt.compare(password, user.passwordHash);
    console.log("Auth: Password validation result:", result);
    return result;
  } catch (error) {
    console.error("Auth: bcrypt error:", error);
    return false;
  }
}

export async function createSession(username: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

  sessions.set(sessionId, { username, expiresAt });
  console.log(`[Auth] Session created: ${sessionId.substring(0, 8)}... for user ${username}, total sessions: ${sessions.size}`);

  return sessionId;
}

export async function validateSession(sessionId: string): Promise<string | null> {
  console.log(`[Auth] Validating session: ${sessionId.substring(0, 8)}..., total sessions in memory: ${sessions.size}`);
  const session = sessions.get(sessionId);

  if (!session) {
    console.log(`[Auth] Session not found in memory`);
    return null;
  }

  if (Date.now() > session.expiresAt) {
    console.log(`[Auth] Session expired`);
    sessions.delete(sessionId);
    return null;
  }

  console.log(`[Auth] Session valid for user: ${session.username}`);
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
  const authEnabled = isAuthEnabled();
  if (!authEnabled) {
    return true; // No auth required
  }

  const user = await getCurrentUser();
  return user !== null;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
