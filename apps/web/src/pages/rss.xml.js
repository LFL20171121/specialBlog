import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';

/** RSS 订阅源: 构建期生成静态 XML */
export async function GET(context) {
  const posts = await getPublishedPosts();

  return rss({
    title: '星河博客',
    description: '一个关于技术、阅读与生活的个人博客',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  });
}
