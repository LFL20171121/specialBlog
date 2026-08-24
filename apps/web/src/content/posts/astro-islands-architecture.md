---
contentId: "d1f0a2b3-2222-4e22-8c33-000000000002"
title: "用 Astro Islands 架构搭一个低 JS 负载的博客"
description: "静态优先, 交互按需: Astro Islands 让文章页面几乎不加载 JavaScript, 点赞和评论却一个不少。"
date: 2026-08-18
tags: ["技术", "前端"]
featured: true
draft: false
---

这个博客的文章页几乎不携带 JavaScript, 但点赞、评论这些交互功能一个不少。秘密在于 Astro 的 Islands 架构。

## 传统方案的问题

用 Vue 或 React 做整站 SPA 时, 访客打开一篇文章要做的事情很多: 下载框架运行时、执行组件渲染、水合整棵组件树。对一篇三千字的散文来说, 这些成本都花在了「不需要交互的地方」。

## Islands: 交互的孤岛

Astro 在构建时把页面渲染成纯 HTML, 只有标记了 `client:*` 指令的组件才会在浏览器里水合。以点赞按钮为例:

```astro
<LikeButton client:load contentId={post.data.contentId} />
<CommentSection client:visible contentId={post.data.contentId} />
```

两条指令的含义不同:

- `client:load`: 页面加载后立即水合, 适合首屏就要响应的按钮；
- `client:visible`: 滚动到可视区域才水合, 适合文章末尾的评论区。

于是首屏的 JS 体积只剩一个小按钮组件, 评论区则完全不影响打开速度。

### 和纯静态相比

纯静态站也能塞一个 `<script>` 标签实现点赞, 但组件化让状态管理、错误提示和样式封装都干净得多。鱼与熊掌, 这次算是都拿到了。

## 构建即校验

Astro 的内容集合(Content Collections) 还带来一个惊喜: frontmatter 会在构建时用 schema 校验。少写一个 `contentId`、日期格式不对, 构建直接失败并指出具体文件——发布前就拦住坏数据, 比上线后才发现文章打不开好太多。

## 小结

- 静态优先, 交互按需水合；
- 构建期校验内容结构；
- JS 体积与内容复杂度解耦。

这套架构特别适合「内容为主、互动为辅」的个人博客。
