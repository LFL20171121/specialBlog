import type { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  /** 窗口时长(毫秒)  */
  windowMs: number;
  /** 窗口内最大请求数 */
  max: number;
  /** 限流键前缀, 用于区分不同接口组 */
  key?: string;
}

/**
 * 简单内存滑动窗口限流(单实例部署够用；多实例部署需换 Redis 等共享存储) 。
 * 用于登录、注册、评论、点赞等写接口, 防止暴力破解与刷屏。
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const buckets = new Map<string, number[]>();

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.env?.['REMOTE_ADDR'] || 'local';
    const key = `${options.key ?? 'global'}:${ip}`;
    const now = Date.now();

    // 清理窗口外的旧记录
    const hits = (buckets.get(key) ?? []).filter((t) => now - t < options.windowMs);

    if (hits.length >= options.max) {
      return c.json({ error: '请求过于频繁, 请稍后再试' }, 429);
    }

    hits.push(now);
    buckets.set(key, hits);
    await next();
  };
}
