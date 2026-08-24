<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, apiFetch, type AdminComment } from '../../lib/api';

/** 评论审核面板：按状态筛选，通过 / 隐藏 / 删除 */
type StatusFilter = 'all' | 'pending' | 'approved' | 'hidden';

const filter = ref<StatusFilter>('pending');
const comments = ref<AdminComment[]>([]);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);

const filterTabs: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'hidden', label: '已隐藏' },
  { value: 'all', label: '全部' },
];

const statusLabel: Record<AdminComment['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  hidden: '已隐藏',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const query = filter.value === 'all' ? '' : `?status=${filter.value}`;
    const data = await apiFetch<{ comments: AdminComment[] }>(`/api/admin/comments${query}`);
    comments.value = data.comments;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function setStatus(comment: AdminComment, status: AdminComment['status']) {
  if (busyId.value) return;
  busyId.value = comment.id;
  try {
    await apiFetch(`/api/admin/comments/${comment.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '操作失败';
  } finally {
    busyId.value = null;
  }
}

async function remove(comment: AdminComment) {
  if (!window.confirm('确认删除该评论？删除后不可恢复。')) return;
  busyId.value = comment.id;
  try {
    await apiFetch(`/api/admin/comments/${comment.id}`, { method: 'DELETE' });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '删除失败';
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div class="comment-admin">
    <div class="head">
      <h2>评论审核</h2>
      <div class="tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          :class="{ active: filter === tab.value }"
          @click="
            filter = tab.value;
            load();
          "
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="hint">加载中…</p>
    <div v-else-if="comments.length === 0" class="hint empty">该状态下暂无评论</div>

    <ul v-else class="comment-rows">
      <li v-for="comment in comments" :key="comment.id" class="row">
        <div class="row-head">
          <span class="author">{{ comment.author.nickname }}</span>
          <span class="muted">{{ comment.author.email }}</span>
          <span class="status" :class="comment.status">{{ statusLabel[comment.status] }}</span>
          <span class="muted post">《{{ comment.postTitle ?? '已删除文章' }}》</span>
          <time class="muted">{{ formatTime(comment.createdAt) }}</time>
        </div>
        <p class="body">{{ comment.body }}</p>
        <div class="row-actions">
          <button
            v-if="comment.status !== 'approved'"
            type="button"
            class="btn btn-sm"
            :disabled="busyId === comment.id"
            @click="setStatus(comment, 'approved')"
          >
            通过
          </button>
          <button
            v-if="comment.status !== 'hidden'"
            type="button"
            class="btn btn-sm"
            :disabled="busyId === comment.id"
            @click="setStatus(comment, 'hidden')"
          >
            隐藏
          </button>
          <button type="button" class="btn btn-sm danger" :disabled="busyId === comment.id" @click="remove(comment)">
            删除
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}

h2 {
  margin: 0;
}

.tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-soft);
  padding: 5px;
  border-radius: 12px;
}

.tabs button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.88rem;
  padding: 7px 16px;
  border-radius: 9px;
  cursor: pointer;
}

.tabs button.active {
  background: var(--card);
  color: var(--text);
  font-weight: 600;
}

.comment-rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  padding: 18px 20px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.author {
  font-weight: 600;
}

.muted {
  color: var(--text-muted);
}

.post {
  font-style: italic;
}

.status {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.status.pending {
  color: #ffd479;
  border-color: rgba(255, 212, 121, 0.4);
}

.status.approved {
  color: #7ce38b;
  border-color: rgba(124, 227, 139, 0.4);
}

.status.hidden {
  color: var(--text-muted);
}

.body {
  margin: 10px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.danger:hover {
  border-color: #ff8080;
  color: #ff8080;
}

.hint {
  color: var(--text-muted);
}

.empty {
  padding: 48px 20px;
  text-align: center;
}

.error {
  color: #ff8080;
}
</style>
