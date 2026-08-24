<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ApiError, apiFetch, type Draft } from '../../lib/api';

/**
 * 后台草稿编辑器：Markdown 正文 + 元信息编辑、保存、发布。
 * 发布后轮询草稿状态，直观展示「待同步 → 已发布 / 同步失败」全过程。
 */
const props = defineProps<{ draftId?: string }>();

/** 静态页面通过 ?id= 查询参数传入草稿 ID，与 prop 二选一（SSR 阶段跳过） */
const routeDraftId =
  props.draftId ??
  (typeof window === 'undefined'
    ? undefined
    : (new URLSearchParams(window.location.search).get('id') ?? undefined));

const draft = ref<Draft | null>(null);
const title = ref('');
const slug = ref('');
const description = ref('');
const body = ref('');
const tagsInput = ref('');
const cover = ref('');
const featured = ref(false);

const saving = ref(false);
const publishing = ref(false);
const message = ref('');
const error = ref('');

let pollTimer: ReturnType<typeof setInterval> | null = null;

const statusLabel: Record<Draft['status'], string> = {
  draft: '草稿',
  pending_sync: '待同步',
  published: '已发布',
  sync_failed: '同步失败',
};

/** 逗号分隔的标签输入 → 标签数组 */
const tags = computed(() =>
  tagsInput.value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean),
);

function applyDraft(value: Draft) {
  draft.value = value;
  title.value = value.title;
  slug.value = value.slug;
  description.value = value.description;
  body.value = value.body;
  tagsInput.value = value.tags.join(', ');
  cover.value = value.cover ?? '';
  featured.value = value.featured;
  maybeStartPolling();
}

/** pending_sync 期间轮询最新状态，直到离开该状态 */
function maybeStartPolling() {
  if (!draft.value || pollTimer) return;
  if (draft.value.status !== 'pending_sync') return;

  pollTimer = setInterval(async () => {
    if (!draft.value) return stopPolling();
    try {
      const data = await apiFetch<{ draft: Draft }>(`/api/admin/drafts/${draft.value.id}`);
      draft.value = data.draft;
      if (data.draft.status !== 'pending_sync') stopPolling();
    } catch {
      stopPolling();
    }
  }, 3000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onMounted(async () => {
  if (!routeDraftId) return;
  try {
    const data = await apiFetch<{ draft: Draft }>(`/api/admin/drafts/${routeDraftId}`);
    applyDraft(data.draft);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '草稿加载失败';
  }
});

onUnmounted(stopPolling);

async function save(): Promise<boolean> {
  if (saving.value) return false;
  saving.value = true;
  message.value = '';
  error.value = '';
  try {
    const payload = {
      title: title.value,
      slug: slug.value,
      description: description.value,
      body: body.value,
      tags: tags.value,
      cover: cover.value || null,
      featured: featured.value,
    };

    if (draft.value) {
      const data = await apiFetch<{ draft: Draft }>(`/api/admin/drafts/${draft.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      draft.value = data.draft;
      message.value = '已保存';
    } else {
      const data = await apiFetch<{ draft: Draft }>('/api/admin/drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      applyDraft(data.draft);
      // 新建后同步地址栏，刷新仍停留在编辑页
      history.replaceState(null, '', `/admin/posts/edit/?id=${data.draft.id}`);
      message.value = '草稿已创建';
    }
    return true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '保存失败';
    return false;
  } finally {
    saving.value = false;
  }
}

async function publish() {
  // 未保存过（或他人新建的）先落库，拿到 draftId 才能发布
  if (!draft.value) {
    const ok = await save();
    if (!ok || !draft.value) return;
  }
  if (publishing.value) return;
  publishing.value = true;
  message.value = '';
  error.value = '';
  try {
    const data = await apiFetch<{ draft: Draft }>(`/api/admin/drafts/${draft.value.id}/publish`, {
      method: 'POST',
    });
    draft.value = data.draft;
    message.value = '已创建同步任务，正在推送 Markdown 到 GitHub…';
    maybeStartPolling();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '发布失败';
  } finally {
    publishing.value = false;
  }
}
</script>

<template>
  <div class="editor">
    <div class="editor-head">
      <h2>{{ draft ? '编辑文章' : '新建文章' }}</h2>
      <span v-if="draft" class="status" :class="draft.status">{{ statusLabel[draft.status] }}</span>
    </div>

    <p v-if="draft?.status === 'sync_failed'" class="sync-error">
      同步失败：草稿已保留，可在<a href="/admin/">同步任务</a>中查看错误详情并手动重试。
    </p>

    <form class="meta-form" @submit.prevent="save">
      <div class="field">
        <label for="title">标题</label>
        <input id="title" v-model="title" required maxlength="120" placeholder="文章标题" />
      </div>

      <div class="field-row">
        <div class="field">
          <label for="slug">slug（URL 路径）</label>
          <input id="slug" v-model="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-first-post" />
        </div>
        <div class="field">
          <label for="tags">标签（逗号分隔）</label>
          <input id="tags" v-model="tagsInput" placeholder="随笔, 技术" />
        </div>
      </div>

      <div class="field">
        <label for="description">摘要</label>
        <input id="description" v-model="description" maxlength="300" placeholder="用于列表页与 SEO description" />
      </div>

      <div class="field">
        <label for="cover">封面图片 URL（可选）</label>
        <input id="cover" v-model="cover" placeholder="/images/cover.jpg" />
      </div>

      <label class="checkbox-row">
        <input v-model="featured" type="checkbox" />
        设为精选文章（展示在首页）
      </label>
    </form>

    <div class="field">
      <label for="body">正文（Markdown）</label>
      <textarea id="body" v-model="body" rows="18" spellcheck="false" placeholder="# 从这里开始写作…" />
    </div>

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div class="actions">
      <button type="button" class="btn" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存草稿' }}
      </button>
      <button type="button" class="btn btn-primary" :disabled="publishing" @click="publish">
        {{ publishing ? '发布中…' : '发布到 GitHub' }}
      </button>
      <a class="btn btn-ghost" href="/admin/posts/">返回列表</a>
    </div>
  </div>
</template>

<style scoped>
.editor {
  max-width: 860px;
  margin: 0 auto;
}

.editor-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.editor-head h2 {
  margin: 0;
}

.status {
  font-size: 0.8rem;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.status.published {
  color: #7ce38b;
  border-color: rgba(124, 227, 139, 0.4);
}

.status.pending_sync {
  color: #ffd479;
  border-color: rgba(255, 212, 121, 0.4);
}

.status.sync_failed {
  color: #ff8080;
  border-color: rgba(255, 128, 128, 0.4);
}

.sync-error {
  font-size: 0.9rem;
  color: #ff8080;
  background: rgba(255, 128, 128, 0.08);
  border: 1px solid rgba(255, 128, 128, 0.25);
  border-radius: 10px;
  padding: 10px 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}

textarea {
  font-family: var(--font-mono);
  font-size: 0.92rem;
  line-height: 1.8;
  min-height: 320px;
}

.message {
  color: var(--accent);
  font-size: 0.9rem;
}

.error {
  color: #ff8080;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}
</style>
