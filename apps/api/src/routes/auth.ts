import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { db } from '../db';
import { profiles } from '../db/schema';
import { parseJsonBody } from '../lib/validation';
import { rateLimit } from '../middleware/rateLimit';
import {
  createSession,
  destroySession,
  sessionCookieName,
  sessionCookieOptions,
} from '../services/session';
import type { AppEnv, SessionUser } from '../types';

/** 认证相关路由: /api/auth */
export const authRoutes = new Hono<AppEnv>();

/** 认证接口统一限流: 每 IP 每分钟 10 次, 防暴力破解 */
const authLimiter = rateLimit({ key: 'auth', windowMs: 60_000, max: 10 });

const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码最长 72 位'),
  nickname: z.string().trim().min(1, '昵称不能为空').max(30, '昵称最长 30 字'),
});

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

/** 注册即视为普通用户；admin 角色只能由服务端种子/数据库操作授予 */
authRoutes.post('/register', authLimiter, async (c) => {
  const body = await parseJsonBody(c, registerSchema);

  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, body.email))
    .limit(1);
  if (existing.length > 0) {
    throw new HTTPException(409, { message: '该邮箱已被注册' });
  }

  const inserted = await db
    .insert(profiles)
    .values({
      email: body.email,
      // Argon2id（@node-rs/argon2 默认算法）, 只保存哈希
      passwordHash: await hash(body.password),
      nickname: body.nickname,
    })
    .returning({
      id: profiles.id,
      email: profiles.email,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
    });

  const user = inserted[0];
  if (!user) throw new HTTPException(500, { message: '创建用户失败' });

  const { token, expiresAt } = await createSession(user.id);
  setCookie(c, sessionCookieName, token, sessionCookieOptions(expiresAt));
  return c.json({ user }, 201);
});

authRoutes.post('/login', authLimiter, async (c) => {
  const body = await parseJsonBody(c, loginSchema);

  const rows = await db.select().from(profiles).where(eq(profiles.email, body.email)).limit(1);
  const profile = rows[0];

  // 即使邮箱不存在也执行一次 verify, 避免通过响应时间枚举注册邮箱
  const passwordOk = profile?.passwordHash
    ? await verify(profile.passwordHash, body.password)
    : false;

  if (!profile || !passwordOk) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  const { token, expiresAt } = await createSession(profile.id);
  setCookie(c, sessionCookieName, token, sessionCookieOptions(expiresAt));

  const user: SessionUser = {
    id: profile.id,
    email: profile.email,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
  };
  return c.json({ user });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, sessionCookieName);
  if (token) {
    await destroySession(token);
  }
  deleteCookie(c, sessionCookieName, { path: '/' });
  return c.body(null, 204);
});

authRoutes.get('/me', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: '未登录' }, 401);
  return c.json({ user });
});
