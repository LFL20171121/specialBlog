/** API 层共享类型 */

/** 已登录用户的安全视图（不含密码哈希等敏感字段） */
export type SessionUser = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
};

/** Hono 应用环境: 所有中间件/路由共享的上下文变量 */
export type AppEnv = {
  Variables: {
    /** sessionMiddleware 注入；未登录为 null */
    user: SessionUser | null;
  };
};
