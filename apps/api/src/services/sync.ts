import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db';
import { postDrafts, syncJobs, type SyncJob } from '../db/schema';
import { draftGitPath, upsertMarkdown } from './github';

/** 自动重试上限, 超过后任务转 failed, 等待管理员手动重试 */
export const MAX_SYNC_ATTEMPTS = 5;

const BASE_BACKOFF_MS = 10_000;
const MAX_BACKOFF_MS = 10 * 60_000;

/** 指数退避: 10s → 20s → 40s → 80s（上限 10 分钟） */
function backoffMs(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
}

/**
 * 处理单个同步任务: 原子抢占 → 调用 GitHub API → 更新任务与草稿状态。
 * 任一步骤失败都不删除或覆盖数据库草稿, 只记录错误并安排重试。
 */
export async function processSyncJob(jobId: string): Promise<void> {
  // 原子抢占: 仅当任务不在 processing 时占用, 避免并发重复处理
  const claimed = await db
    .update(syncJobs)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(and(eq(syncJobs.id, jobId), ne(syncJobs.status, 'processing')))
    .returning();
  const job: SyncJob | undefined = claimed[0];
  if (!job) return;

  try {
    const drafts = await db
      .select()
      .from(postDrafts)
      .where(eq(postDrafts.id, job.draftId))
      .limit(1);
    const draft = drafts[0];
    if (!draft) throw new Error(`草稿不存在: ${job.draftId}`);

    const { commitSha, path } = await upsertMarkdown(draft);

    await db
      .update(syncJobs)
      .set({
        status: 'succeeded',
        commitSha,
        lastError: null,
        nextRetryAt: null,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    await db
      .update(postDrafts)
      .set({
        status: 'published',
        lastCommitSha: commitSha,
        gitPath: path ?? draftGitPath(draft),
        updatedAt: new Date(),
      })
      .where(eq(postDrafts.id, draft.id));

    console.log(`[sync] 同步成功: ${draft.slug} @ ${commitSha.slice(0, 7)}`);
  } catch (err) {
    const attempts = job.attempts + 1;
    const willRetry = attempts < MAX_SYNC_ATTEMPTS;
    const message = err instanceof Error ? err.message : String(err);

    await db
      .update(syncJobs)
      .set({
        status: willRetry ? 'pending' : 'failed',
        attempts,
        lastError: message.slice(0, 2000),
        nextRetryAt: willRetry ? new Date(Date.now() + backoffMs(attempts)) : null,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, job.id));

    // 草稿内容保留不动, 仅标记同步失败, 后台提供手动重试入口
    await db
      .update(postDrafts)
      .set({ status: 'sync_failed', updatedAt: new Date() })
      .where(eq(postDrafts.id, job.draftId));

    console.warn(
      `[sync] 同步失败（第 ${attempts} 次）: ${message}` +
        (willRetry ? '' : '；已达最大重试次数, 等待手动重试'),
    );
  }
}
