<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, apiFetch, type SyncJob } from '../../lib/api';

/** 同步任务面板：观察发布状态、错误详情，手动重试失败任务 */
const jobs = ref<SyncJob[]>([]);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);

const statusLabel: Record<SyncJob['status'], string> = {
  pending: '等待中',
  processing: '同步中',
  succeeded: '已成功',
  failed: '已失败',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN');
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await apiFetch<{ jobs: SyncJob[] }>('/api/admin/sync-jobs');
    jobs.value = data.jobs;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function retry(job: SyncJob) {
  if (busyId.value) return;
  busyId.value = job.id;
  try {
    await apiFetch(`/api/admin/sync-jobs/${job.id}/retry`, { method: 'POST' });
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '重试失败';
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div class="sync-admin">
    <div class="head">
      <h2>GitHub 同步任务</h2>
      <button type="button" class="btn btn-sm" :disabled="loading" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="hint">加载中…</p>
    <div v-else-if="jobs.length === 0" class="hint empty">暂无同步任务，发布文章后会在这里出现</div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>文章</th>
            <th>状态</th>
            <th>尝试</th>
            <th>commit</th>
            <th>下次重试</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="job in jobs" :key="job.id">
            <tr>
              <td>{{ job.title ?? job.slug ?? job.draftId.slice(0, 8) }}</td>
              <td>
                <span class="status" :class="job.status">{{ statusLabel[job.status] }}</span>
              </td>
              <td>{{ job.attempts }}</td>
              <td class="mono">{{ job.commitSha ? job.commitSha.slice(0, 7) : '—' }}</td>
              <td>{{ formatTime(job.nextRetryAt) }}</td>
              <td>{{ formatTime(job.updatedAt) }}</td>
              <td>
                <button
                  v-if="job.status === 'failed'"
                  type="button"
                  class="btn btn-sm"
                  :disabled="busyId === job.id"
                  @click="retry(job)"
                >
                  手动重试
                </button>
              </td>
            </tr>
            <tr v-if="job.lastError" class="error-row">
              <td colspan="7">
                <code class="error-text">{{ job.lastError }}</code>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
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
  font-size: 0.88rem;
}

th,
td {
  padding: 11px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

th {
  color: var(--text-muted);
  font-weight: 600;
}

.error-row td {
  border-bottom: 1px solid var(--border);
}

.error-text {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #ff8080;
  white-space: normal;
  word-break: break-all;
}

.mono {
  font-family: var(--font-mono);
}

.status {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.status.succeeded {
  color: #7ce38b;
  border-color: rgba(124, 227, 139, 0.4);
}

.status.pending {
  color: #ffd479;
  border-color: rgba(255, 212, 121, 0.4);
}

.status.processing {
  color: var(--accent);
  border-color: rgba(124, 154, 255, 0.4);
}

.status.failed {
  color: #ff8080;
  border-color: rgba(255, 128, 128, 0.4);
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
