import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { sessionMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { postRoutes } from './routes/posts';
import { adminRoutes } from './routes/admin';
import type { AppEnv } from './types';

/** 组装 Hono 应用（与启动逻辑分离, 便于测试环境复用） */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>().basePath('/api');

  app.use('*', logger());
  // 所有路由共享会话解析, /api/admin 内部再叠加管理员校验
  app.use('*', sessionMiddleware);

  app.route('/auth', authRoutes);
  app.route('/posts', postRoutes);
  app.route('/admin', adminRoutes);

  app.get('/health', (c) => c.json({ ok: true }));

  app.notFound((c) => c.json({ error: '接口不存在' }, 404));

  // 统一错误出口: 不向前端泄露堆栈、密钥与内部实现细节
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message || '请求处理失败' }, err.status);
    }
    console.error('[api] 未捕获异常: ', err);
    return c.json({ error: '服务器内部错误' }, 500);
  });

  return app;
}
