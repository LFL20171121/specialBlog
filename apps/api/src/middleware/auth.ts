import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { getSessionUser, sessionCookieName } from '@/services/session';
import type { AppEnv, SessionUser } from '@/types';

/**
 * 会话中间件: 解析 HttpOnly Cookie 中的会话令牌, 
 * 将当前用户(未登录为 null) 注入上下文, 供后续路由读取。
 */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, sessionCookieName);
  c.set('user', token ? await getSessionUser(token) : null);
  await next();
});

/** 登录保护: 未登录直接返回 401 */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) {
    return c.json({ error: '请先登录' }, 401);
  }
  await next();
});

/** 管理员保护: 路由层第一道校验(服务层与数据库约束为其兜底)  */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user: SessionUser | null = c.get('user');
  if (!user) {
    return c.json({ error: '请先登录' }, 401);
  }
  if (user.role !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  await next();
});
