
# 项目的完整结构

现在我有了完整的文件清单。让我组织一个从零开始的开发流程教程。用户是新手，想了解这种项目的真实开发过程。

真实世界的个人开发者开发顺序，应该是：

**阶段 0：设计文档**（个人开发者的第一步永远是设计）

**阶段 1：静态博客（Web 前台）**
- 工程脚手架（package.json、tsconfig、astro.config）
- 内容层（content.config.ts、示例文章）
- 布局层（global.css、BaseLayout）
- 页面层（首页→文章列表→文章详情→关于→标签→搜索）
- 工具层（lib/posts.ts）

**阶段 2：用户互动（API 后端）**
- 工程脚手架
- 数据层（env.ts、db/schema.ts、db/index.ts、drizzle.config.ts、seed.ts）
- 中间件层（rateLimit、auth）
- 业务层（session、types、validation）
- 路由层（auth、posts）
- 入口（app.ts、index.ts）

**阶段 3：互动前端（Vue 岛）**
- lib/api.ts
- LoginForm、LikeButton、CommentSection、AccountPanel

**阶段 4：管理后台（admin API + Vue 编辑器）**
- admin 路由（drafts、comments、sync）
- services（github、sync）、workers（syncWorker）
- Vue 组件（AdminEditor、AdminPostList、AdminComments、AdminSyncJobs）
- 后台页面（admin/index、admin/posts/index、admin/posts/edit、new）
- 登录/账户页、search.json、rss、sitemap

让我数一下文件，确保涵盖所有：

Web：
1. package.json
2. tsconfig.json
3. astro.config.ts
4. src/env.d.ts
5. src/content.config.ts
6. src/styles/global.css
7. src/layouts/BaseLayout.astro
8. src/lib/posts.ts
9. src/lib/api.ts
10. src/components/PostCard.astro
11. src/components/PostToc.astro
12. src/components/ThemeToggle.astro
13. src/pages/index.astro
14. src/pages/about.astro
15. src/pages/posts/index.astro
16. src/pages/posts/[slug].astro
17. src/pages/tags/[tag].astro
18. src/pages/search.astro
19. src/pages/search.json.ts
20. src/pages/login.astro
21. src/pages/account.astro
22. src/pages/admin/index.astro
23. src/pages/admin/posts/index.astro
24. src/pages/admin/posts/edit.astro
25. src/pages/admin/posts/new.astro
26. src/components/vue/LoginForm.vue
27. src/components/vue/LikeButton.vue
28. src/components/vue/CommentSection.vue
29. src/components/vue/AccountPanel.vue
30. src/components/vue/SearchResults.vue
31. src/components/vue/AdminPostList.vue
32. src/components/vue/AdminEditor.vue
33. src/components/vue/AdminComments.vue
34. src/components/vue/AdminSyncJobs.vue
35. content/posts/*.md（3 篇示例文章）
36. rss.xml.js？—— 等等，之前提到 rss.xml 和 sitemap。让我看看，glob 结果里没有 rss.xml.js。之前说"17 个页面 + RSS + sitemap + 搜索索引"。sitemap 可能是 @astrojs/sitemap 集成自动生成的，rss 可能也在某处。我搜索的 pattern 不包含 .xml.js 后缀。不过 dist/search.json 存在。RSS 可能是 src/pages/rss.xml.js。我的 glob 模式是 *.{ts,vue,astro,css,json,mjs}，.xml.js 不匹配。让我相信之前会话生成的文件，rss.xml.js 应该存在。

API：
1. package.json
2. tsconfig.json
3. drizzle.config.ts
4. src/env.ts
5. src/db/schema.ts
6. src/db/index.ts
7. src/db/seed.ts
8. src/middleware/rateLimit.ts
9. src/middleware/auth.ts
10. src/lib/validation.ts
11. src/types.ts
12. src/services/session.ts
13. src/routes/auth.ts
14. src/routes/posts.ts
15. src/app.ts
16. src/index.ts
17. src/routes/admin/index.ts
18. src/routes/admin/drafts.ts
19. src/routes/admin/comments.ts
20. src/routes/admin/sync.ts
21. src/services/github.ts
22. src/services/sync.ts
23. src/workers/syncWorker.ts

根目录：
1. package.json
2. .env.example / .env
3. personal-blog-design.md（设计文档）
4. .gitignore

这样组织成一个教程。用户是新手，需要讲清楚"为什么这个顺序"——即开发逻辑。

核心理念：
- 个人开发者的真实顺序不是"从哪个文件开始"按字母序，而是**按依赖方向**：先没有依赖的，后依赖别人的
- 数据流驱动：设计 → 数据模型 → 展示层 → 交互层 → 管理层
- 每一步都要能跑、能验证（小步快跑）

我要用"依赖关系"来解释顺序：
1. 设计文档（想清楚）
2. 根脚手架（npm workspaces）
3. API 的 env/schema（数据模型是地基）
4. Web 静态部分（看得见的成果，激励自己）
5. API 认证（互动的前提）
6. Vue 互动岛（连接前后端）
7. 后台（最复杂的部分）

其实有两种合理路线：API-first（后端优先）或 UI-first（前端优先）。个人开发者通常 UI-first（快速看到东西）。但这个项目数据模型简单（评论点赞），UI-first 更符合博客项目的实际。

我采用的顺序（推荐给新手）：
- 第 0 步：设计文档 personal-blog-design.md
- 第 1 步：根脚手架（package.json、.env.example、.gitignore）
- 第 2 步：Web 工程骨架（apps/web：package.json、astro.config.ts、tsconfig.json、env.d.ts、global.css）
- 第 3 步：内容模型（content.config.ts + 第一篇文章 .md + lib/posts.ts）——"内容优先"，博客本质是内容站
- 第 4 步：布局与通用组件（BaseLayout、ThemeToggle、PostCard、PostToc）
- 第 5 步：公开页面（index、about、posts/index、posts/[slug]、tags/[tag]、search、search.json、rss、sitemap）
- 第 6 步：API 工程骨架（apps/api：package.json、tsconfig、drizzle.config、env.ts）
- 第 7 步：数据库层（schema.ts、db/index.ts、seed.ts、db:push 验证）
- 第 8 步：API 基础设施（types、validation、rateLimit、session、middleware/auth）
- 第 9 步：认证路由（routes/auth.ts、app.ts、index.ts）——第一个能 curl 验证的 API
- 第 10 步：互动路由（routes/posts.ts：点赞评论）
- 第 11 步：前端 API 客户端 + 互动岛（lib/api.ts、LoginForm、LikeButton、CommentSection、AccountPanel + login.astro、account.astro）
- 第 12 步：发布链路（services/github.ts、services/sync.ts、workers/syncWorker.ts）
- 第 13 步：后台 API（routes/admin/*）
- 第 14 步：后台页面与组件（admin/*.astro、AdminPostList、AdminEditor、AdminComments、AdminSyncJobs、SearchResults）

每个文件讲：职责、核心内容、为什么此时写、依赖谁。

这会是一个长回答，但用户明确要求"详细说明"+"涵盖所有文件"。输出风格允许教育性内容超出常规长度。

我要控制格式让它可读：用阶段分组，每个文件用简洁条目。避免过度膨胀——每个文件 1-3 句核心说明，重点讲"为什么"。

先讲一个总纲：个人开发的元逻辑（自顶向下设计、自底向上实现、每步可验证）。
好问题。我把整个项目复盘成一条**个人开发者的真实开发路线**。先给你总纲，再逐步展开所有文件。

# 总纲：这种项目的开发元逻辑

个人开发不是“从 A 文件写到 Z 文件”，而是三条原则：

1. **设计先行**：先写设计文档（本项目就是 [personal-blog-design.md](file:///Users/gss/PP/TRAE_Project/specialBlog/personal-blog-design.md)），确定“做什么、用什么技术、分几期”
2. **依赖决定顺序**：被依赖的先写（数据模型 → 工具函数 → 页面/路由），依赖别人的后写
3. **每步可验证**：每写完一小块就跑起来看效果，绝不一次写完 50 个文件再调试

本项目按依赖关系切成 **8 个阶段**，对应设计文档的“三阶段交付”：

```text
阶段0 设计 → 阶段1 工程骨架 → 阶段2 内容模型 → 阶段3 公开页面
→ 阶段4 API地基 → 阶段5 认证与互动 → 阶段6 互动前端
→ 阶段7 发布链路与后台 → 阶段8 后台页面与组件
```

---

# 阶段 0：设计文档

**[personal-blog-design.md](file:///Users/gss/PP/TRAE_Project/specialBlog/personal-blog-design.md)**

个人项目最大的死因是“写到一半不知道该做什么了”。这份文档先回答：目标用户（中国大陆访客）、功能范围（做什么/不做什么）、技术选型（Astro+Vue+Hono+PG+Drizzle）、数据模型、发布流程、安全底线。后面每个文件都是它的落地——比如第 5 节规定了 `contentId` 机制，整个数据库和 API 都围绕它展开。

---

# 阶段 1：工程骨架（能 npm install，但什么都没有）

## 1.1 根目录三个文件

- **[package.json](file:///Users/gss/PP/TRAE_Project/specialBlog/package.json)**：声明 `workspaces: ["apps/*"]`（单仓双应用），定义顶层脚本 `dev`（同时起 API 和 Web）、`db:push` 等——你以后只在这一个目录跑命令
- **.gitignore**：排除 `node_modules`、`dist`、`.env`（密钥永不进版本库）
- **.env.example → .env**：环境变量模板。先建模板是为了让“配置与代码分离”从第一天就成立：数据库连接串、管理员账号、GitHub Token 全在这里，换环境只改这一个文件

## 1.2 apps/web 骨架（4 个文件）

- **[package.json](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/package.json)**：依赖 astro、vue、@astrojs/vue 集成；脚本 `dev`/`build`/`typecheck`
- **[astro.config.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/astro.config.ts)**：注册 Vue 集成、配置 `site`（RSS/sitemap 依赖它）、**Vite 代理 `/api` → `localhost:8787`**——这是前后端同域的关键，前端请求 `/api/xxx` 开发时自动转发给 API
- **[tsconfig.json](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/tsconfig.json)**：TypeScript 编译规则
- **src/env.d.ts**：让 TS 认识 `.astro`、`.vue` 文件的类型声明

## 1.3 apps/api 骨架（3 个文件）

- **[package.json](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/package.json)**：依赖 hono、drizzle-orm、postgres（驱动）、@node-rs/argon2（密码哈希）、zod（校验）
- **tsconfig.json**：API 侧编译规则
- **[drizzle.config.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/drizzle.config.ts)**：告诉 drizzle-kit“方言是 postgresql、schema 在哪、数据库连哪”——`npm run db:push` 就靠它

---

# 阶段 2：内容模型（博客的本质是内容站，先把“文章是什么”定义清楚）

## 2.1 [content.config.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/content.config.ts)

用 zod 定义文章 frontmatter 的 schema：`title`、`date`、`tags`、`draft`、`featured`、`contentId`……**这是 Web 侧唯一的“文章定义”**，Astro 构建时用它校验每篇文章，字段错直接阻断构建（设计文档第 9 节的要求）。先写它的原因：所有页面（首页、列表、详情、标签）都消费文章数据，数据形状不定，页面没法写。

## 2.2 content/posts/*.md（3 篇示例文章）

每篇带完整 frontmatter。有了它们，接下来写的每个页面都能**立刻看到真实效果**。

## 2.3 [lib/posts.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/lib/posts.ts)

文章数据的工具层：`getPublishedPosts()`（过滤草稿+按日期倒序）、`getFeaturedPosts()`、`getAllTags()`、`extractHeadings()`（从 Markdown 提取目录）。页面不直接调 Astro API，而是调这层——逻辑只写一遍，处处复用。

## 2.4 [styles/global.css](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/styles/global.css)

设计 token（CSS 变量）：深色主题配色、蓝紫渐变强调色、明暗两套变量。先写样式地基，后面所有组件只引用变量，视觉天然统一。

---

# 阶段 3：公开页面（访客看得见的部分，静态输出）

**顺序原则：先布局 → 再卡片类复用组件 → 最后按路由逐页写。**

## 3.1 布局与通用组件（4 个文件）

- **[layouts/BaseLayout.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/layouts/BaseLayout.astro)**：全站外壳——`<html>` 骨架、SEO meta、导航栏、页脚、主题初始化脚本（防闪烁）。所有页面都包它
- **[components/ThemeToggle.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/ThemeToggle.astro)**：明暗切换，纯原生 JS 小脚本（不值得上 Vue）
- **[components/PostCard.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/PostCard.astro)**：文章卡片（标题+摘要+标签+日期），首页/列表/标签页复用
- **[components/PostToc.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/PostToc.astro)**：文章目录，消费 `extractHeadings()` 的输出

## 3.2 公开路由（设计文档第 3 节的页面清单）

Astro 的约定：`src/pages/` 下的文件路径即路由。

- **[pages/index.astro](file:////Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/index.astro)**：首页——个人介绍+精选+最新文章
- **[pages/posts/index.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/posts/index.astro)**：文章列表
- **[pages/posts/[slug].astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/posts/[slug].astro)**：文章详情——渲染 Markdown、目录、阅读进度条，并**预埋**点赞/评论两个 Vue 岛的位置（此时组件还不存在，先用占位）
- **[pages/about.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/about.astro)**：关于页
- **[pages/tags/[tag].astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/tags/[tag].astro)**：标签筛选页
- **[pages/search.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/search.astro)** + **[pages/search.json.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/search.json.ts)**：后者构建期生成全站搜索索引（标题+摘要的 JSON），前者加载它做客户端过滤——静态站也能有搜索，不需要搜索引擎服务
- **rss.xml.js / sitemap**：RSS 端点 + sitemap 集成，SEO 三件套收尾

**到此设计文档“阶段一：公开博客”完成。每一步都可以 `npm run dev` 看到效果。**

---

# 阶段 4：API 地基（环境 → 数据库 → 中间件，自底向上）

## 4.1 [env.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/env.ts)

API 的**第一个文件**：零依赖的 .env 加载器 + zod 集中校验所有环境变量（端口、DATABASE_URL、管理员账号、GitHub 配置），并导出 `isGithubConfigured()`。先写它是因为后面**所有**模块都要 import `env`——配置必须最先稳定。

## 4.2 数据库三件套

- **[db/schema.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/db/schema.ts)**：**整个后端最重要的文件**。用 Drizzle 定义 6 张表——`profiles`（用户）、`sessions`（会话）、`post_drafts`（草稿）、`comments`、`likes`（含 `(user_id, content_id)` 唯一约束，天然防重复点赞）、`sync_jobs`。表结构直接翻译设计文档第 5 节
- **[db/index.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/db/index.ts)**：创建 postgres 连接 + Drizzle 实例，全项目唯一的数据库入口
- **[db/seed.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/db/seed.ts)**：幂等种子——首次启动按 `.env` 创建管理员，已存在就跳过

写完立刻 `npm run db:push` 验证：schema 能推上数据库，等于数据模型成立。

## 4.3 基础设施（4 个文件）

- **[types.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/types.ts)**：跨模块共享的 TS 类型（如返回给前端的用户信息）
- **[lib/validation.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/lib/validation.ts)**：zod schema 复用（邮箱/密码/评论正文的格式规则），路由层调它
- **[middleware/rateLimit.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/middleware/rateLimit.ts)**：滑动窗口限流，防止登录/评论接口被刷（设计文档第 7 节）
- **[services/session.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/services/session.ts)**：会话管理——生成随机令牌 → 哈希后落库 → 写 HttpOnly Cookie。独立成 service 因为登录/登出/鉴权三处都要用

## 4.4 [middleware/auth.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/middleware/auth.ts)

两个 Hono 中间件：`requireUser`（没登录就 401）和 `requireAdmin`（非管理员就 403）。路由统一挂它，权限校验只写一次——这是“路由层校验权限”的实现。

---

# 阶段 5：认证与互动路由（API 长出第一批端点）

- **[routes/auth.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/auth.ts)**：注册（Argon2id 哈希密码）、登录（防时序攻击的校验）、登出、`/me`（当前用户）。**第一个写的路由**，因为它最独立、能用 curl 直接验证，成功后立刻确认“env→db→middleware→service”整条链路通了
- **[routes/posts.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/posts.ts)**：按 `contentId` 的点赞（toggle，唯一约束保证幂等——重复请求返回当前状态而非报错）和评论（创建默认 `pending`，公开读取只返回 `approved`）
- **[app.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/app.ts)**：把所有路由挂到 Hono 实例 + **统一错误出口**（捕获异常、区分错误类型、绝不把堆栈/密钥返回客户端）
- **[index.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/index.ts)**：入口——启动 HTTP 服务、跑种子、启动同步 worker（下阶段填）

写完用 curl 测：注册→登录拿 Cookie→带 Cookie 点赞→查库确认。**设计文档“阶段二：用户互动”的后端完成。**

---

# 阶段 6：互动前端（Vue 岛连接前后端）

## 6.1 [lib/api.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/lib/api.ts)

前端统一 fetch 封装：自动带 cookie、统一错误结构。先写它，所有 Vue 组件只调这层，不手写 fetch——以后换后端地址只改一处。

## 6.2 四个互动岛（components/vue/）

- **[LoginForm.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/LoginForm.vue)**：登录+注册表单，成功后跳转。配 **[pages/login.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/login.astro)**（页面只做布局，交互全在岛里）
- **[LikeButton.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/LikeButton.vue)**：点赞按钮——未登录引导去登录，已登录 toggle，乐观更新
- **[CommentSection.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/CommentSection.vue)**：评论区——加载已审核评论 + 提交新评论（提示“审核中”，失败保留输入，设计文档第 9 节）
- **[AccountPanel.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/AccountPanel.vue)**：账户页的昵称修改、登出。配 **[pages/account.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/account.astro)**

回到 `[slug].astro` 把占位换成真正的 `<LikeButton client:visible />`、`<CommentSection client:visible />`——**`client:visible` 表示滚动到可见才水合**，文章页上半屏保持零 JS。另外 **[SearchResults.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/SearchResults.vue)** 驱动搜索页交互。

---

# 阶段 7：发布链路与后台（最复杂的一块，最后做）

**为什么最后做**：它依赖前面所有东西（草稿表、会话、权限、GitHub 配置），且自身链路最长。

## 7.1 发布链路（API 侧 3 个文件）

- **[services/github.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/services/github.ts)**：GitHub Contents API 的薄封装——生成 frontmatter + Markdown、创建/更新文件
- **[services/sync.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/services/sync.ts)**：**同步处理器，核心逻辑**——领取任务（状态 pending→processing）、调 GitHub、成功记 commit SHA + 触发草稿转 published；失败按**指数退避**算下次重试时间（10s→20s→40s…），超过最大次数转 failed 等手动重试。幂等性靠 `(draftId, revision)` 唯一
- **[workers/syncWorker.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/workers/syncWorker.ts)**：`setInterval` 轮询到期任务交给 sync 处理。**设计取舍**：不用独立进程，直接嵌在 API 里——个人项目少一个部署单元，量级完全够

## 7.2 后台路由（routes/admin/，全部挂 requireAdmin）

- **[drafts.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/admin/drafts.ts)**：草稿 CRUD + **发布**（保存 DB → 创建 sync_job，事务保证草稿不丢）
- **[comments.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/admin/comments.ts)**：评论列表（含 pending）/通过/隐藏/删除
- **[sync.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/admin/sync.ts)**：同步任务列表 + 手动重试
- **[index.ts](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/api/src/routes/admin/index.ts)**：后台路由聚合导出

## 7.3 后台页面与组件（Web 侧最后一波）

- **[pages/admin/index.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/admin/index.astro)**：后台首页，聚合三个管理面板
- **[pages/admin/posts/index.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/admin/posts/index.astro)** + **[AdminPostList.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/AdminPostList.vue)**：草稿列表——显示状态（草稿/待同步/已发布/同步失败）、发布、删除
- **[pages/admin/posts/edit.astro](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/pages/admin/posts/edit.astro) / new.astro** + **[AdminEditor.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/AdminEditor.vue)**：编辑器——标题/摘要/标签/slug/封面/精选的表单 + Markdown 正文编辑 + 实时预览 + 保存/发布。静态站下用 `?id=` 传参由组件拉取草稿
- **[AdminComments.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/AdminComments.vue)**：审核台——pending 通过、已发布隐藏
- **[AdminSyncJobs.vue](file:///Users/gss/PP/TRAE_Project/specialBlog/apps/web/src/components/vue/AdminSyncJobs.vue)**：同步任务监控——每次尝试、错误信息、手动重试按钮

**至此设计文档“阶段三”完成，全项目约 60 个手写文件闭环。**

---

# 给新手的复盘要点

1. **顺序的本质是依赖图**：配置 → 数据模型 → 工具层 → 页面/路由 → 复杂交互。每写一个文件前问“它 import 谁”，被依赖者必须先存在
2. **静态优先于动态**：先把不依赖后端的部分全部做完（阶段 2–3），项目随时处于“可展示”状态，心理上不会烂尾
3. **每阶段有验证仪式**：`db:push` 成功 = 数据模型对；curl 登录成功 = 后端链路通；浏览器点赞成功 = 前后端打通。**绝不连写三个阶段不验证**
4. **横切关注点独立成层**：env/config、错误处理、权限、限流、API client 各自只写一遍——这就是为什么文件要分 `middleware`/`services`/`routes`/`lib` 目录，不是为了好看，是为了不重复
5. **复杂功能最后做**：发布链路（异步任务、重试、幂等）是全项目最难的，放在你对项目最熟的阶段末期，而不是一开始就被它劝退

想深入哪个文件的具体实现（比如 sync.ts 的指数退避怎么写的、Argon2id 登录怎么防时序攻击），告诉我，我带你逐行读.
