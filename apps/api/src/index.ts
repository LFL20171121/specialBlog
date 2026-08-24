import { serve } from '@hono/node-server';
import { createApp } from './app';
import { env } from './env';
import { ensureAdminSeed } from './db/seed';
import { startSyncWorker } from './workers/syncWorker';

/** 判断是否为数据库连接类错误(网络不可达 / 服务未启动) , 用于给出可操作提示 */
function isDbConnectionError(err: unknown): boolean {
  if (err instanceof AggregateError) return true; // ECONNREFUSED 等
  const code = (err as { code?: string })?.code;
  return code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === '28P01';
}

/** 从 AggregateError 等连接错误中提取可读信息 */
function describeError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors.map((e) => (e as Error).message).join('; ');
  }
  return err instanceof Error ? `${err.message}` : String(err);
}

// 首次启动自动创建初始管理员(幂等) ；数据库不可达时给出明确指引而非原始堆栈
try {
  await ensureAdminSeed();
} catch (err) {
  if (isDbConnectionError(err)) {
    console.error(
      '[api] 无法连接 PostgreSQL, 请检查: \n' +
        '  1. 数据库服务是否已启动(默认 localhost:5432) \n' +
        '  2. .env 中的 DATABASE_URL 是否正确\n' +
        '  3. 是否已执行建表: npm run db:push -w apps/api\n' +
        `原始错误: ${describeError(err)}`,
    );
    process.exit(1);
  }
  throw err;
}

const app = createApp();
startSyncWorker();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] 服务已启动: http://localhost:${info.port}`);
});

function shutdown(): void {
  console.log('[api] 正在关闭…');
  server.close(() => process.exit(0));
  // 兜底: 连接未及时断开时强制退出
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
