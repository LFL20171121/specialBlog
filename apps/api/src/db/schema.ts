import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ==================== 枚举 ==================== */

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

/** 草稿生命周期: 草稿 → 待同步 → 已发布；同步失败进入 sync_failed, 可重试 */
export const draftStatusEnum = pgEnum('draft_status', [
  'draft',
  'pending_sync',
  'published',
  'sync_failed',
]);

/** 评论审核状态: 默认 pending, 审核通过后对外可见 */
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'hidden']);

/** 同步任务状态: pending 可自动重试；failed 为超过最大重试次数、等待手动重试 */
export const syncJobStatusEnum = pgEnum('sync_job_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
]);

/* ==================== 表 ==================== */

/**
 * 用户(profiles) : 邮箱密码注册, GitHub/Google OAuth 可后续扩展(provider 字段预留思路) 。
 * 密码使用 Argon2id 哈希, 禁止保存明文。
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  nickname: text('nickname').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 会话(sessions) : HttpOnly Cookie 中的随机令牌 → 哈希后落库。
 * 便于服务端主动吊销会话(登出、封禁) 。
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

/**
 * 草稿(post_drafts) : 后台编辑与发布状态的唯一事实来源。
 * contentId 是文章的稳定标识(关联评论/点赞) , slug 只负责 URL, 可变更。
 */
export const postDrafts = pgTable(
  'post_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: text('content_id').notNull().unique(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** Markdown 正文 */
    body: text('body').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    cover: text('cover'),
    featured: boolean('featured').notNull().default(false),
    status: draftStatusEnum('status').notNull().default('draft'),
    /** 仓库内文件路径与最近一次成功同步的 commit, 用于追溯 */
    gitPath: text('git_path'),
    lastCommitSha: text('last_commit_sha'),
    /** 每次保存自增；同步任务以 (draftId, revision) 幂等 */
    revision: integer('revision').notNull().default(1),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('post_drafts_status_idx').on(table.status)],
);

/** 评论(comments) : 按 contentId 关联文章, 默认 pending, 审核通过后公开 */
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: text('content_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: commentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('comments_content_id_idx').on(table.contentId, table.status)],
);

/** 点赞(likes) : (user_id, content_id) 唯一约束保证一人一篇只能一赞 */
export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    contentId: text('content_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('likes_user_content_unique').on(table.userId, table.contentId),
    index('likes_content_id_idx').on(table.contentId),
  ],
);

/**
 * 同步任务(sync_jobs) : 发布 → 创建任务 → worker 调 GitHub API。
 * 失败按指数退避自动重试, 超过最大次数转 failed 等待手动重试。
 */
export const syncJobs = pgTable(
  'sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => postDrafts.id, { onDelete: 'cascade' }),
    /** 发布时的草稿版本, 同一 revision 只允许一个未完成任务(幂等)  */
    revision: integer('revision').notNull(),
    status: syncJobStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    commitSha: text('commit_sha'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sync_jobs_status_idx').on(table.status, table.nextRetryAt)],
);

/* ==================== 类型导出 ==================== */

export type Profile = typeof profiles.$inferSelect;
export type PostDraft = typeof postDrafts.$inferSelect;
export type NewPostDraft = typeof postDrafts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type SyncJob = typeof syncJobs.$inferSelect;
