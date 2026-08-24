/**
 * 同源 API 请求封装。
 * 生产环境 /api 与静态站点同域名(由反向代理转发) , 开发环境由 Vite 代理, 
 * 因此无需配置 baseURL, 也天然规避跨域 Cookie 问题。
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    let message = `请求失败(HTTP ${response.status}) `;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // 响应不是 JSON 时使用默认消息
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ---------- 与后端契约对应的类型 ---------- */

export interface SessionUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

export interface LikeState {
  count: number;
  liked: boolean;
}

export interface PublicComment {
  id: string;
  body: string;
  createdAt: string;
  author: { nickname: string; avatarUrl: string | null };
}

export type DraftStatus = 'draft' | 'pending_sync' | 'published' | 'sync_failed';

export interface Draft {
  id: string;
  contentId: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  cover: string | null;
  featured: boolean;
  status: DraftStatus;
  gitPath: string | null;
  lastCommitSha: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type SyncJobStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface SyncJob {
  id: string;
  draftId: string;
  revision: number;
  status: SyncJobStatus;
  attempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  commitSha: string | null;
  createdAt: string;
  updatedAt: string;
  slug?: string | null;
  title?: string | null;
}

export interface AdminComment {
  id: string;
  contentId: string;
  body: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
  author: { nickname: string; email: string };
  postTitle: string | null;
}
