import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { profiles } from './schema';
import { env } from '../env';

/**
 * 幂等的管理员种子: 仅当该邮箱不存在时创建。
 * 管理员角色只能通过服务端/数据库授予, 注册接口永远无法产生 admin。
 */
export async function ensureAdminSeed(): Promise<void> {
  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, env.ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[seed] 管理员已存在: ${env.ADMIN_EMAIL}`);
    return;
  }

  await db.insert(profiles).values({
    email: env.ADMIN_EMAIL,
    passwordHash: await hash(env.ADMIN_PASSWORD),
    nickname: env.ADMIN_NICKNAME,
    role: 'admin',
  });
  console.log(`[seed] 已创建初始管理员: ${env.ADMIN_EMAIL}(密码来自 ADMIN_PASSWORD 环境变量) `);
}

// 直接执行 `npm run db:seed` 时运行
if (process.argv[1]?.endsWith('seed.ts')) {
  ensureAdminSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] 失败: ', err);
      process.exit(1);
    });
}
