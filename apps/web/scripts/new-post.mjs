import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = path.resolve(process.argv[1]) === __filename;
const CONTENT_DIR = path.resolve(
  path.dirname(__filename),
  "..",
  "src",
  "content",
  "posts",
);
const todayISO = () => new Date().toISOString().slice(0, 10);

function uuidv4() {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function slugify(s) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "")
      .slice(0, 80) || "untitled"
  );
}
function parseTags(raw) {
  return raw
    ? raw
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

/** ──────────────── 模板模式 ────────────────
 *  每个字段下面加解释性注释 (# 开头);
 *  可修改值先用空字符串或空数组占位 (必填字段会显式标 *);
 *  contentId 自动生成 UUID (必须唯一, 不需要手填)。
 */
function buildTemplateFrontmatter(options = {}) {
  const contentId = options.contentId || uuidv4();
  const title = options.title ?? "";
  const description = options.description ?? "";
  const date = options.date ?? "";
  const updatedAt = options.updatedAt ?? "";
  const tags = options.tags ?? [];
  const cover = options.cover ?? "";
  const featured = options.featured ?? false;
  const draft = options.draft ?? false;

  const quote = (s) => JSON.stringify(s ?? "");

  const q = (val, useEmptyQuotes = true) => {
    if (val === "") return useEmptyQuotes ? '""' : "";
    if (typeof val === "string") return JSON.stringify(val);
    if (Array.isArray(val))
      return "[" + val.map((v) => JSON.stringify(v)).join(", ") + "]";
    return String(val);
  };

  const lines = [
    "---",
    "# ⚠️  必填: 文章永久唯一标识, 发布后不要修改 (关联点赞/评论)。系统已自动生成 UUID。",
    `contentId: "${contentId}"`,
    "",
    "# ⚠️  必填: 文章标题 (zod: z.string().min(1))",
    `title: ${q(title)}`,
    "",
    '# 可选: 一两句话的文章摘要, 显示在列表卡片、搜索结果和 SEO description 里。留空也行 (zod: default="")',
    `description: ${q(description)}`,
    "",
    "# ⚠️  必填: 发布日期, 格式 YYYY-MM-DD, 决定文章列表排序 (zod: z.coerce.date)",
    `date: ${date ? date : '""  # 例如: 2026-08-24'}`,
    "",
    "# 可选: 更新日期, 有大改时填; 不改就留空, 页面只显示 date (zod: .optional())",
    `updatedAt: ${updatedAt ? updatedAt : '""  # 例如: 2026-08-25'}`,
    "",
    '# 可选: 标签数组; 空数组 = 无标签。格式: ["技术", "随笔"]; 首页/标签页会自动汇总 (zod: default [])',
    `tags: ${tags.length ? "[" + tags.map(JSON.stringify).join(", ") + "]" : '[]  # 例如: ["技术", "随笔"]'}`,
    "",
    "# 可选: 封面图路径, 留空则无封面; 可填 /images/xxx.jpg 或完整 URL (zod: .optional())",
    `cover: ${cover ? JSON.stringify(cover) : '""  # 例如: "/images/cover.jpg"'}`,
    "",
    "# 可选: 是否上首页「精选」区 (zod: default false)。通常 3-5 篇就够。",
    `featured: ${featured}  # true 或 false`,
    "",
    "# 可选: 草稿开关。true = 全站隐藏, 写完发布时改成 false (zod: default false)",
    `draft: ${draft}  # true 或 false`,
    "---",
    "",
    "<!-- 在这里开始写作。支持所有标准 Markdown：标题、列表、代码块、引用、链接、图片等。 -->",
    "",
  ];
  return lines.join("\n");
}

/** 交互模式 (之前版本保留) */
async function prompt(rl, q, fb = "") {
  const a = await rl.question(q + (fb ? ` (${fb})` : "") + ": ");
  return a.trim() || fb;
}

/** 简易 slug 提取: 从命令行最后一个非 -- 参数取, 或取 --slug=xxx */
function resolveSlug(argv) {
  const explicit = argv.slug || argv._name || argv._;
  if (explicit) return String(explicit);
  const rest = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  return (
    rest[rest.length - 1] || "new-post-" + Date.now().toString(36).slice(-4)
  );
}

export async function newPostCommand() {
  const argvRaw = process.argv.slice(2);
  const argv = { template: false };

  /* ── 先从环境变量兜底读取 (NEW_POST_SLUG, NEW_POST_TITLE, ..., NEW_POST_TEMPLATE) */
  for (const [envKey, value] of Object.entries(process.env)) {
    const m = envKey.match(/^NEW_POST_(.+)$/i);
    if (!m || !value) continue;
    const key = m[1].toLowerCase();
    if (value === '1' || value.toLowerCase() === 'true') argv[key] = true;
    else if (value.toLowerCase() === 'false') argv[key] = false;
    else argv[key] = value;
  }

  /* ── 再从命令行覆盖 */
  for (const arg of argvRaw) {
    if (arg === "--force") {
      argv.force = true;
      continue;
    }
    if (arg === "--template" || arg === "-t") {
      argv.template = true;
      continue;
    }
    if (arg === "--draft=y") {
      argv.draft = true;
      continue;
    }
    const [k, ...rest] = arg.replace(/^--/, "").split("=");
    if (k) argv[k] = rest.join("=");
  }

  if (!existsSync(CONTENT_DIR)) await mkdir(CONTENT_DIR, { recursive: true });

  if (argv.template) {
    /* ── 模板模式: 非交互, 直接生成带注释的 frontmatter ── */
    const slug = slugify(
      argv.slug ||
        argv.title ||
        "new-post-" + Date.now().toString(36).slice(-4),
    );
    const tags = argv.tags ? parseTags(argv.tags) : [];
    const content = buildTemplateFrontmatter({
      title: argv.title ?? "",
      description: argv.description ?? "",
      date: argv.date ?? "",
      updatedAt: argv.updatedAt ?? "",
      tags,
      cover: argv.cover ?? "",
      featured: argv.featured === "y",
      draft:
        typeof argv.draft === "undefined"
          ? true
          : argv.draft === "y" || argv.draft === true,
    });

    const file = path.join(CONTENT_DIR, `${slug}.md`);
    if (existsSync(file) && !argv.force) {
      console.error(`✖ 文件已存在: ${path.relative(process.cwd(), file)}`);
      console.error(
        "  如需覆盖, 加 --force; 或用 --slug=其它名称 换个文件名。",
      );
      process.exit(1);
    }
    await writeFile(file, content, "utf8");
    console.log(`✔ 模板已生成: ${path.relative(process.cwd(), file)}`);
    console.log(`   打开编辑: ${file}`);
    console.log(
      `   所有 # 开头的行是字段注释, 不影响构建 (frontmatter 只认 key: value)。`,
    );
    return { file, slug };
  }

  /* ── 交互模式 (保留旧逻辑) ── */
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const title = await prompt(rl, "文章标题 *", argv.title);
    if (!title) {
      console.error("✖ 标题不能为空");
      process.exit(1);
    }
    const description = await prompt(rl, "文章摘要", argv.description || "");
    const rawTags = await prompt(rl, "标签（逗号分隔）", argv.tags || "随笔");
    const featured = (await prompt(rl, "上精选？(y/N)", "N"))
      .toLowerCase()
      .startsWith("y");
    const draft = (await prompt(rl, "保存为草稿？(y/N)", "N"))
      .toLowerCase()
      .startsWith("y");
    const slug = await prompt(rl, "URL slug", argv.slug || slugify(title));
    const date = await prompt(rl, "发布日期", argv.date || todayISO());
    const contentId = argv.contentId || uuidv4();
    const tags = parseTags(rawTags);

    const fm = [
      "---",
      `contentId: "${contentId}"`,
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(description)}`,
      `date: ${date}`,
      `updatedAt: ${date}`,
      tags.length
        ? `tags: [${tags.map(JSON.stringify).join(", ")}]`
        : "tags: []",
      ...(featured ? ["featured: true"] : []),
      ...(draft ? ["draft: true"] : []),
      "---",
      "",
      "在这里开始写作……",
      "",
      "## 章节示例",
      "",
      "正文内容。",
      "",
    ].join("\n");

    const file = path.join(CONTENT_DIR, `${slug}.md`);
    if (existsSync(file) && !argv.force) {
      console.error(`✖ 文件已存在: ${path.relative(process.cwd(), file)}`);
      console.error("  如需覆盖, 请加 --force。");
      process.exit(1);
    }
    await writeFile(file, fm, "utf8");
    console.log(`\n✔ 文章已生成: ${path.relative(process.cwd(), file)}`);
    console.log(
      `   contentId: ${contentId}  slug: ${slug}  tags: ${tags.join(", ") || "无"}`,
    );
    console.log(
      `   draft: ${draft ? "是 (全站隐藏)" : "否" + (featured ? " + 精选" : "")}`,
    );
    console.log(`   预览: http://localhost:4321/posts/${slug}`);
    return { file, contentId, slug };
  } finally {
    rl.close();
  }
}

if (isDirectRun) newPostCommand();
