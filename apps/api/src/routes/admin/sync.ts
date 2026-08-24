import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { postDrafts, syncJobs } from '../../db/schema';

/** 同步任务查询与手动重试: /api/admin/sync-jobs */
export const adminSyncRoutes = new Hono();

adminSyncRoutes.get('/', async (c) => {
  const jobs = await db
    .select({
      id: syncJobs.id,
      draftId: syncJobs.draftId,
      revision: syncJobs.revision,
      status: syncJobs.status,
      attempts: syncJobs.attempts,
      lastError: syncJobs.lastError,
      nextRetryAt: syncJobs.nextRetryAt,
      commitSha: syncJobs.commitSha,
      createdAt: syncJobs.createdAt,
      updatedAt: syncJobs.updatedAt,
      slug: postDrafts.slug,
      title: postDrafts.title,
    })
    .from(syncJobs)
    .leftJoin(postDrafts, eq(syncJobs.draftId, postDrafts.id))
    .orderBy(desc(syncJobs.updatedAt))
    .limit(100);

  return c.json({ jobs });
});

/** 手动重试: 重置失败任务(failed/超过次数) 为 pending, 立即由 worker 处理 */
adminSyncRoutes.post('/:id/retry', async (c) => {
  const id = c.req.param('id');

  const rows = await db.select().from(syncJobs).where(eq(syncJobs.id, id)).limit(1);
  const job = rows[0];
  if (!job) throw new HTTPException(404, { message: '同步任务不存在' });
  if (job.status === 'processing') {
    throw new HTTPException(409, { message: '任务正在处理中, 请勿重复操作' });
  }
  if (job.status === 'succeeded') {
    throw new HTTPException(409, { message: '任务已成功, 无需重试' });
  }

  const updated = await db
    .update(syncJobs)
    .set({ status: 'pending', attempts: 0, nextRetryAt: new Date(), updatedAt: new Date() })
    .where(eq(syncJobs.id, id))
    .returning();

  const retryJob = updated[0];
  if (!retryJob) throw new HTTPException(500, { message: '重试失败' });
  return c.json({ job: retryJob });
});
