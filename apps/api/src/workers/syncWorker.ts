import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db';
import { syncJobs } from '../db/schema';
import { env } from '../env';
import { processSyncJob } from '../services/sync';

/** 每轮最多处理的任务数, 避免单轮长时间阻塞 */
const BATCH_SIZE = 5;

/**
 * 后台同步 worker: 定时拉取到期的 pending 任务并处理。
 * 单进程内嵌实现（与 API 同进程）；如果未来任务量大, 
 * 可将其独立为进程, 逻辑无需改动。
 */
export function startSyncWorker(): () => void {
  const tick = async (): Promise<void> => {
    try {
      const dueJobs = await db
        .select({ id: syncJobs.id })
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.status, 'pending'),
            or(isNull(syncJobs.nextRetryAt), lte(syncJobs.nextRetryAt, new Date())),
          ),
        )
        .limit(BATCH_SIZE);

      for (const job of dueJobs) {
        await processSyncJob(job.id);
      }
    } catch (err) {
      // worker 崩溃不影响 API 服务, 下一轮继续
      console.error('[sync-worker] 轮询出错: ', err);
    }
  };

  const timer = setInterval(() => void tick(), env.SYNC_WORKER_INTERVAL_MS);
  console.log(`[sync-worker] 已启动, 轮询间隔 ${env.SYNC_WORKER_INTERVAL_MS}ms`);
  return () => clearInterval(timer);
}
