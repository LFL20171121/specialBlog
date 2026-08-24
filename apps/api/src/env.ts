import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * 简易 .env 加载器（零依赖）。
 * 依次尝试 apps/api/.env 与仓库根目录 .env, 已存在的进程变量不覆盖。
 * 生产环境建议直接注入进程环境变量, 而不是依赖 .env 文件。
 */
function loadDotEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      const key = match?.[1];
      const value = match?.[2];
      if (key && value !== undefined && process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
}

loadDotEnv();

/**
 * 环境变量集中校验与默认值。
 * 密钥类变量只存在于服务端进程, 禁止下发到前端。
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /** API 监听端口 */
  PORT: z.coerce.number().int().positive().default(8787),

  /** PostgreSQL 连接串 */
  DATABASE_URL: z
    .string()
    .default('postgres://postgres:postgres@localhost:5432/personal_blog'),

  /** 会话有效期（小时） */
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),

  /** 初始管理员（首次启动自动创建, 幂等） */
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('admin123456'),
  ADMIN_NICKNAME: z.string().default('站长'),

  /** 同步 worker 轮询间隔（毫秒） */
  SYNC_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),

  /** GitHub 内容同步配置, 未配置时发布任务进入失败重试流程（便于演示） */
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH: z.string().default('main'),

  /** 仓库内 Markdown 存放目录 */
  CONTENT_DIR: z.string().default('content/posts'),
});

export const env = envSchema.parse(process.env);

/** GitHub 是否已配置完整（三者齐备才可真正同步） */
export const isGithubConfigured = (): boolean =>
  Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO);
