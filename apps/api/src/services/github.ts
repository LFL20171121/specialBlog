import { env, isGithubConfigured } from '../env';
import type { PostDraft } from '../db/schema';

const API_BASE = 'https://api.github.com';

/** 草稿在仓库中的 Markdown 路径: content/posts/{slug}.md */
export function draftGitPath(draft: Pick<PostDraft, 'slug'>): string {
  return `${env.CONTENT_DIR}/${draft.slug}.md`;
}

/**
 * 将草稿序列化为带 frontmatter 的 Markdown。
 * 字段与前台 Astro 内容集合的 schema（src/content.config.ts）保持对齐。
 */
export function buildMarkdown(draft: PostDraft): string {
  const lines: string[] = [
    '---',
    `contentId: ${JSON.stringify(draft.contentId)}`,
    `title: ${JSON.stringify(draft.title)}`,
    `description: ${JSON.stringify(draft.description)}`,
    `date: ${draft.createdAt.toISOString().slice(0, 10)}`,
    `updatedAt: ${draft.updatedAt.toISOString().slice(0, 10)}`,
    `tags: ${JSON.stringify(draft.tags)}`,
  ];
  if (draft.cover) {
    lines.push(`cover: ${JSON.stringify(draft.cover)}`);
  }
  lines.push(`featured: ${draft.featured}`, 'draft: false', '---', '');
  return `${lines.join('\n')}${draft.body.trimEnd()}\n`;
}

function githubHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export interface UpsertResult {
  commitSha: string;
  path: string;
}

/**
 * 通过 GitHub Contents API 创建/更新仓库中的 Markdown 文件。
 * 幂等性由上层 (draftId, revision) 任务去重保证；内容一致时重复提交也只会追加空 diff 提交。
 * 注意: Contents API 限制单文件 < 1MB, 大文件需换 Git Data API。
 */
export async function upsertMarkdown(draft: PostDraft): Promise<UpsertResult> {
  if (!isGithubConfigured()) {
    throw new Error('GitHub 同步未配置: 请设置 GITHUB_TOKEN、GITHUB_OWNER、GITHUB_REPO 环境变量');
  }

  const path = draftGitPath(draft);
  const url = `${API_BASE}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURI(path)}`;

  // 更新已有文件必须携带当前 blob 的 sha；新建文件（404）不需要
  let sha: string | undefined;
  const getRes = await fetch(url, { headers: githubHeaders() });
  if (getRes.ok) {
    const data = (await getRes.json()) as { sha?: string };
    sha = data.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`GitHub 查询文件失败（HTTP ${getRes.status}）`);
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `content: ${sha ? 'update' : 'create'} ${draft.slug} (${draft.contentId})`,
      content: Buffer.from(buildMarkdown(draft), 'utf8').toString('base64'),
      branch: env.GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    throw new Error(`GitHub 写入失败（HTTP ${putRes.status}）: ${text.slice(0, 300)}`);
  }

  const data = (await putRes.json()) as { commit: { sha: string } };
  return { commitSha: data.commit.sha, path };
}
