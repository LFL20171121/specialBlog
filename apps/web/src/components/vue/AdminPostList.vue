<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, apiFetch, type Draft } from '../../lib/api';

/** 后台文章列表：状态总览 + 发布 / 编辑 / 删除 */
const drafts = ref<Draft[]>([]);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);

const statusLabel: Record<Draft['status'], string> = {
  draft: '草稿',
  pending_sync: '待同步',
  published: '已发布',
  sync_failed: '同步失败',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function load() {
  error.value = '';
  try {
    const data = await apiFetch<{ drafts: Draft[] }>('/api/admin/drafts');
    drafts.value = data.drafts;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function publish(draft: Draft) {
  if (busyId.value) return;
  busyId.value = draft.id;
  try {
    await apiFetch(`/api/admin/drafts/${draft.id}/publish`, { method: 'POST' });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '发布失败';
  } finally {
    busyId.value = null;
  }
}

async function remove(draft: Draft) {
  if (!window.confirm(`确认删除「${draft.title}」？该操作不可恢复。`)) return;
  busyId.value = draft.id;
  try {
    await apiFetch(`/api/admin/drafts/${draft.id}`, { method: 'DELETE' });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '删除失败';
  } finally {
    busyId.value = null;
  }
}

function edit(draft: Draft) {
  // 静态后台页面：编辑器通过查询参数获取草稿 ID
  location.href = `/admin/posts/edit/?id=${draft.id}`;
}
</script>

<template>
  <div class="post-list">
    <div class="list-head">
      <h2>文章管理</h2>
      <a class="btn btn-primary btn-sm" href="/admin/posts/new/">+ 新建文章</a>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="hint">加载中…</p>
    <div v-else-if="drafts.length === 0" class="hint empty">
      还没有任何文章，点击右上角「新建文章」开始创作。
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>标题</th>
            <th>slug</th>
            <th>状态</th>
            <th>版本</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="draft in drafts" :key="draft.id">
            <td class="title-cell">{{ draft.title }}</td>
            <td class="muted">{{ draft.slug }}</td>
            <td>
              <span class="status" :class="draft.status">{{ statusLabel[draft.status] }}</span>
            </td>
            <td class="muted">r{{ draft.revision }}</td>
            <td class="muted">{{ formatTime(draft.updatedAt) }}</td>
            <td class="actions-cell">
              <button type="button" class="btn btn-sm" :disabled="busyId === draft.id" @click="edit(draft)">
                编辑
              </button>
              <button
                type="button"
                class="btn btn-sm"
                :disabled="busyId === draft.id || draft.status === 'pending_sync'"
                @click="publish(draft)"
              >
                发布
              </button>
              <button type="button" class="btn btn-sm danger" :disabled="busyId === draft.id" @click="remove(draft)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-head h2 {
  margin: 0;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

th {
  color: var(--text-muted);
  font-weight: 600;
}

tr:last-child td {
  border-bottom: none;
}

.title-cell {
  font-weight: 600;
}

.muted {
  color: var(--text-muted);
}

.status {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
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

.actions-cell {
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
