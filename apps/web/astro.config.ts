import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 正式域名(部署后替换为已备案域名, RSS/sitemap 依赖它生成绝对链接) 
  site: 'https://blog.example.com',
  integrations: [vue(), sitemap()],
  vite: {
    server: {
      proxy: {
        // 开发环境将 /api 代理到本地 Hono 服务, 保持前后端同源；
        // 生产环境由反向代理(Nginx 等) 完成同样的同域名转发
        '/api': 'http://localhost:8787',
      },
    },
  },
});
