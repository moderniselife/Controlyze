import bcrypt from "bcryptjs";
import { loadRawConfig } from "@/lib/config";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";

const SESSION_COOKIE = "controlyze_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface User {
  username: string;
  passwordHash: string;
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isAuthEnabled(): boolean {
  try {
    const config = loadRawConfig();
    return config.auth?.enabled === true;
  } catch (e) {
    console.error("Auth: isAuthEnabled error:", e);
    return true;
  }
}

export function getUsers(): User[] {
  try {
    const config = loadRawConfig();
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
    return false;
  }

  try {
    return bcrypt.compare(password, user.passwordHash);
  } catch (error) {
    console.error("Auth: bcrypt error:", error);
    return false;
  }
}

export async function createSession(username: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const createdAt = new Date();

  await db.insert(sessions).values({
    id: sessionId,
    username,
    expiresAt,
    createdAt,
  });
  
  return sessionId;
}

export async function validateSession(sessionId: string): Promise<string | null> {
  const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  const session = result[0];

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return session.username;
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// Clean up expired sessions periodically
export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
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
