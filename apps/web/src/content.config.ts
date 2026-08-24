import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 文章内容集合: 读取 src/content/posts 下的 Markdown。
 * frontmatter 校验失败会直接阻断构建并指出具体字段, 
 * 字段结构与后台同步到 GitHub 的 frontmatter 完全一致(见 apps/api/src/services/github.ts) 。
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    /** 文章稳定标识: 关联评论与点赞, slug 变更不受影响 */
    contentId: z.string().min(1, 'contentId 不能为空'),
    title: z.string().min(1, '标题不能为空'),
    description: z.string().default(''),
    date: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
