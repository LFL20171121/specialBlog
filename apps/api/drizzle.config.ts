import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** 与 src/env.ts 保持一致的零依赖 .env 加载, 供 drizzle-kit 使用 */
function loadDotEnv(): void {
  for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
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

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  // 生成的迁移文件目录（应提交到版本库）
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/personal_blog',
  },
  verbose: true,
  strict: true,
});
