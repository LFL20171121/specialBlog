import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 获取已发布（非草稿）文章，按发布日期倒序 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', (post) => !post.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getFeaturedPosts(): Promise<Post[]> {
  return (await getPublishedPosts()).filter((post) => post.data.featured);
}

/** 汇总所有标签（去重） */
export async function getAllTags(): Promise<string[]> {
  const posts = await getPublishedPosts();
  return [...new Set(posts.flatMap((post) => post.data.tags))];
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/** 与 GitHub slugger 行为近似的标题 id 生成（保留中日韩文字与数字） */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/** 从 Markdown 源文本提取 h2/h3 生成目录，跳过代码块中的匹配行 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inCodeBlock = false;

  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (match?.[1] && match[2]) {
      const text = match[2].replace(/[*_`]/g, '').trim();
      headings.push({ depth: match[1].length, text, id: slugifyHeading(text) });
    }
  }
  return headings;
}

/** 中文语境的日期格式化: 2026年8月15日 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}
