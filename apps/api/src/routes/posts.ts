import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { comments, likes, profiles } from '../db/schema';
import { parseJsonBody } from '../lib/validation';
import { requireUser } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import type { AppEnv } from '../types';

/**
 * 文章互动路由: /api/posts
 * 以稳定的 contentId 关联点赞与评论(slug 变更不影响数据) 。
 */
export const postRoutes = new Hono<AppEnv>();

const likeLimiter = rateLimit({ key: 'like', windowMs: 60_000, max: 30 });
const commentLimiter = rateLimit({ key: 'comment', windowMs: 60_000, max: 5 });

const commentCreateSchema = z.object({
  body: z.string().trim().min(1, '评论内容不能为空').max(2000, '评论最长 2000 字'),
});

/** 查询点赞数与当前用户点赞状态(未登录 liked 恒为 false)  */
async function likeState(contentId: string, userId?: string) {
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.contentId, contentId));
  const count = countRows[0]?.count ?? 0;

  let liked = false;
  if (userId) {
    const rows = await db
      .select({ userId: likes.userId })
      .from(likes)
      .where(and(eq(likes.contentId, contentId), eq(likes.userId, userId)))
      .limit(1);
    liked = rows.length > 0;
  }
  return { count, liked };
}

postRoutes.get('/:contentId/like', async (c) => {
  const contentId = c.req.param('contentId');
  const user = c.get('user');
  return c.json(await likeState(contentId, user?.id));
});

/** 点赞: 数据库唯一约束 + onConflictDoNothing 保证幂等, 重复请求不报错 */
postRoutes.put('/:contentId/like', requireUser, likeLimiter, async (c) => {
  const contentId = c.req.param('contentId');
  const user = c.get('user')!;

  await db.insert(likes).values({ userId: user.id, contentId }).onConflictDoNothing();
  return c.json(await likeState(contentId, user.id));
});

/** 取消点赞: 幂等, 未点赞时删除 0 行也返回当前状态 */
postRoutes.delete('/:contentId/like', requireUser, likeLimiter, async (c) => {
  const contentId = c.req.param('contentId');
  const user = c.get('user')!;

  await db
    .delete(likes)
    .where(and(eq(likes.contentId, contentId), eq(likes.userId, user.id)));
  return c.json(await likeState(contentId, user.id));
});

/** 公开读取评论: 只返回审核通过的记录 */
postRoutes.get('/:contentId/comments', async (c) => {
  const contentId = c.req.param('contentId');
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      author: {
        nickname: profiles.nickname,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.userId, profiles.id))
    .where(and(eq(comments.contentId, contentId), eq(comments.status, 'approved')))
    .orderBy(desc(comments.createdAt))
    .limit(200);

  return c.json({ comments: rows });
});

/** 发表评论: 登录 + 限流, 默认进入 pending 等待审核 */
postRoutes.post('/:contentId/comments', requireUser, commentLimiter, async (c) => {
  const contentId = c.req.param('contentId');
  const user = c.get('user')!;
  const body = await parseJsonBody(c, commentCreateSchema);

  const inserted = await db
    .insert(comments)
    .values({ contentId, userId: user.id, body: body.body })
    .returning();

  const comment = inserted[0];
  if (!comment) return c.json({ error: '评论发表失败' }, 500);
  return c.json({ comment }, 201);
});
