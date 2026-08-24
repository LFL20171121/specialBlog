import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';

/**
 * 构建期生成的搜索索引，供浏览器端过滤。
 * 不依赖外部搜索服务，国内访问零额外依赖。
 */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const items = posts.map((post) => ({
    slug: post.id,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    date: post.data.date.toISOString(),
  }));

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
