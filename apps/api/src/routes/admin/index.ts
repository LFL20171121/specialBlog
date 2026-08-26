import { Hono } from 'hono';
import { requireAdmin } from '@/middleware/auth';
import type { AppEnv } from '@/types';
import { adminDraftRoutes } from './drafts';
import { adminCommentRoutes } from './comments';
import { adminSyncRoutes } from './sync';

/**
 * 管理后台聚合路由: /api/admin
 * 统一在此挂载 requireAdmin, 所有子路由自动受管理员保护。
 */
export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', requireAdmin);
adminRoutes.route('/drafts', adminDraftRoutes);
adminRoutes.route('/comments', adminCommentRoutes);
adminRoutes.route('/sync-jobs', adminSyncRoutes);
