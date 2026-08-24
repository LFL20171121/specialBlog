<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

/**
 * 站内搜索: 构建期生成 /search.json 索引, 浏览器端过滤, 
 * 不依赖任何搜索服务, 保证国内访问无外部依赖。
 */
interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
}

/** SSR 阶段无 window, 用空串兜底；客户端水合后再读取地址栏参数 */
const query = ref(
  typeof window === 'undefined' ? '' : (new URLSearchParams(window.location.search).get('q') ?? ''),
);
const items = ref<SearchItem[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await fetch('/search.json');
    items.value = (await response.json()) as SearchItem[];
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
});

const results = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return items.value;
  return items.value.filter((item) => {
    const haystack = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
    return haystack.includes(keyword);
  });
});

/** 输入时同步地址栏, 便于分享搜索结果链接 */
function syncUrl() {
  const keyword = query.value.trim();
  const url = keyword ? `/search/?q=${encodeURIComponent(keyword)}` : '/search/';
  history.replaceState(null, '', url);
}
</script>

<template>
  <div class="search-panel">
    <div class="search-box">
      <input
        v-model="query"
        type="search"
        placeholder="搜索文章标题、摘要或标签…"
        aria-label="搜索文章"
        autofocus
        @input="syncUrl"
      />
    </div>

    <p v-if="loading" class="hint">索引加载中…</p>
    <template v-else>
      <p v-if="query.trim()" class="result-count">找到 {{ results.length }} 篇相关文章</p>
      <div v-if="results.length === 0" class="empty">没有找到相关内容, 换个关键词试试？</div>
      <ul v-else class="result-list">
        <li v-for="item in results" :key="item.slug" class="result-item">
          <a class="title" :href="`/posts/${item.slug}/`">{{ item.title }}</a>
          <p class="desc">{{ item.description }}</p>
          <div class="tag-list">
            <span v-for="tag in item.tags" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.search-panel {
  max-width: 720px;
  margin: 0 auto;
}

.search-box input {
  width: 100%;
  font-family: inherit;
  font-size: 1.05rem;
  color: var(--text);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 22px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--glow);
}

.result-count {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.result-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result-item {
  padding: 20px 22px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  transition: border-color 0.2s;
}

.result-item:hover {
  border-color: rgba(124, 154, 255, 0.4);
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.title:hover {
  color: var(--accent);
}

.desc {
  margin: 8px 0 10px;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.tag-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 0.75rem;
  padding: 2px 10px;
  border-radius: 999px;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.hint,
.empty {
  color: var(--text-muted);
  text-align: center;
  padding: 40px 0;
}
</style>
