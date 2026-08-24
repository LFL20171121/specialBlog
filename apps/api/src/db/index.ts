import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '../env';

/**
 * postgres-js 驱动 + Drizzle。
 * 通过 schema 对象导出以获得关系查询与类型推断。
 */
const client = postgres(env.DATABASE_URL, {
  // 同步 worker 与 API 共用连接池, 保守设置上限
  max: 10,
});

export const db = drizzle(client, { schema });
export { schema };
