import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { comments, postDrafts, profiles } from '@/db/schema';
import { parseJsonBody } from '@/lib/validation';
import type { AppEnv } from '@/types';

/** 评论审核: /api/admin/comments(requireAdmin 由聚合路由统一挂载)  */
export const adminCommentRoutes = new Hono<AppEnv>();

const commentStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'hidden'], { message: '非法的审核状态' }),
});

adminCommentRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const query = db
    .select({
      id: comments.id,
      contentId: comments.contentId,
      body: comments.body,
      status: comments.status,
      createdAt: comments.createdAt,
      author: { nickname: profiles.nickname, email: profiles.email },
      postTitle: postDrafts.title,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.userId, profiles.id))
    // 评论以 contentId 关联, 草稿可能已删除, 故左连接取标题
    .leftJoin(postDrafts, eq(comments.contentId, postDrafts.contentId))
    .orderBy(desc(comments.createdAt))
    .limit(200);

  const rows = status
    ? await query.where(eq(comments.status, status as 'pending' | 'approved' | 'hidden'))
    : await query;

  return c.json({ comments: rows });
});

/** 审核评论: 通过 / 隐藏 / 重新置为待审核 */
adminCommentRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await parseJsonBody(c, commentStatusSchema);

  const updated = await db
    .update(comments)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();

  const comment = updated[0];
  if (!comment) throw new HTTPException(404, { message: '评论不存在' });
  return c.json({ comment });
});

adminCommentRoutes.delete('/:id', async (c) => {
  const deleted = await db.delete(comments).where(eq(comments.id, c.req.param('id'))).returning();
  if (deleted.length === 0) throw new HTTPException(404, { message: '评论不存在' });
  return c.body(null, 204);
});
