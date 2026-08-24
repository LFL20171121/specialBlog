import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { profiles, sessions } from '../db/schema';
import { env } from '../env';
import type { SessionUser } from '../types';

export const sessionCookieName = 'blog_session';

/** 生成 256 位随机会话令牌(存入 Cookie 的明文)  */
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 数据库只保存令牌哈希, 泄露数据库无法直接伪造 Cookie */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
    })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.userId, profiles.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Cookie 安全属性: HttpOnly + SameSite=Lax；生产环境强制 Secure */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
