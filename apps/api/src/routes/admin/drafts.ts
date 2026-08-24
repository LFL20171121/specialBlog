import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '../../db';
import { postDrafts, syncJobs } from '../../db/schema';
import { parseJsonBody } from '../../lib/validation';
import type { AppEnv } from '../../types';

/** 草稿管理: /api/admin/drafts（requireAdmin 由聚合路由统一挂载） */
export const adminDraftRoutes = new Hono<AppEnv>();

const draftInputSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(120, '标题最长 120 字'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和中划线'),
  description: z.string().trim().max(300, '摘要最长 300 字').default(''),
  body: z.string().max(500_000, '正文过长').default(''),
  tags: z.array(z.string().trim().min(1).max(20)).max(10, '最多 10 个标签').default([]),
  cover: z.string().trim().max(500).nullish(),
  featured: z.boolean().default(false),
});

async function getDraftOr404(id: string) {
  const rows = await db.select().from(postDrafts).where(eq(postDrafts.id, id)).limit(1);
  const draft = rows[0];
  if (!draft) throw new HTTPException(404, { message: '草稿不存在' });
  return draft;
}

adminDraftRoutes.get('/', async (c) => {
  const drafts = await db.select().from(postDrafts).orderBy(desc(postDrafts.updatedAt));
  return c.json({ drafts });
});

adminDraftRoutes.post('/', async (c) => {
  const body = await parseJsonBody(c, draftInputSchema);
  const user = c.get('user');

  const inserted = await db
    .insert(postDrafts)
    .values({
      // contentId 是关联评论/点赞的稳定标识, 创建后不变；slug 只负责 URL
      contentId: randomUUID(),
      slug: body.slug,
      title: body.title,
      description: body.description,
      body: body.body,
      tags: body.tags,
      cover: body.cover || null,
      featured: body.featured,
      status: 'draft',
      createdBy: user?.id ?? null,
    })
    .returning();

  const draft = inserted[0];
  if (!draft) throw new HTTPException(500, { message: '创建草稿失败' });
  return c.json({ draft }, 201);
});

adminDraftRoutes.get('/:id', async (c) => {
  return c.json({ draft: await getDraftOr404(c.req.param('id')) });
});

adminDraftRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await getDraftOr404(id);
  const body = await parseJsonBody(c, draftInputSchema);

  const updated = await db
    .update(postDrafts)
    .set({
      slug: body.slug,
      title: body.title,
      description: body.description,
      body: body.body,
      tags: body.tags,
      cover: body.cover || null,
      featured: body.featured,
      // 每次保存自增版本号, 发布任务以 (draftId, revision) 幂等去重
      revision: existing.revision + 1,
      updatedAt: new Date(),
    })
    .where(eq(postDrafts.id, id))
    .returning();

  const draft = updated[0];
  if (!draft) throw new HTTPException(500, { message: '保存草稿失败' });
  return c.json({ draft });
});

/**
 * 删除草稿: 仅删除数据库记录。
 * 已发布文章的仓库文件删除同步属于后续增强（第一期非目标）, 此处不自动触发。
 */
adminDraftRoutes.delete('/:id', async (c) => {
  await getDraftOr404(c.req.param('id'));
  await db.delete(postDrafts).where(eq(postDrafts.id, c.req.param('id')));
  return c.body(null, 204);
});

/**
 * 发布: 先落数据库状态, 再创建同步任务, 由后台 worker 异步调 GitHub。
 * 幂等: 同一 (draftId, revision) 已有 pending/processing/succeeded 任务时
 * 直接返回现有任务, 不产生重复内容提交。
 */
adminDraftRoutes.post('/:id/publish', async (c) => {
  const id = c.req.param('id');
  const draft = await getDraftOr404(id);

  const existingJobs = await db
    .select()
    .from(syncJobs)
    .where(
      and(
        eq(syncJobs.draftId, id),
        eq(syncJobs.revision, draft.revision),
        inArray(syncJobs.status, ['pending', 'processing', 'succeeded']),
      ),
    )
    .limit(1);

  const existingJob = existingJobs[0];
  if (existingJob) {
    return c.json({ draft, job: existingJob });
  }

  const [updatedDraft] = await db
    .update(postDrafts)
    .set({ status: 'pending_sync', updatedAt: new Date() })
    .where(eq(postDrafts.id, id))
    .returning();

  const [job] = await db
    .insert(syncJobs)
    .values({ draftId: id, revision: draft.revision, status: 'pending', nextRetryAt: new Date() })
    .returning();

  if (!updatedDraft || !job) throw new HTTPException(500, { message: '创建发布任务失败' });
  return c.json({ draft: updatedDraft, job }, 202);
});
