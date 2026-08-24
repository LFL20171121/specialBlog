<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, apiFetch, type PublicComment } from '../../lib/api';

const props = defineProps<{ contentId: string }>();

const comments = ref<PublicComment[]>([]);
const body = ref('');
const submitting = ref(false);
const loading = ref(true);
/** 提交后的状态提示: 审核中 / 未登录 / 限流 / 错误 */
const notice = ref<{ type: 'info' | 'error'; text: string } | null>(null);
const loggedIn = ref(false);

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadComments() {
  try {
    const data = await apiFetch<{ comments: PublicComment[] }>(
      `/api/posts/${props.contentId}/comments`,
    );
    comments.value = data.comments;
  } catch {
    // 评论区加载失败时静默, 保留输入能力
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  loadComments();
  // 顺带探测登录态, 用于提示
  try {
    await apiFetch('/api/auth/me');
    loggedIn.value = true;
  } catch {
    loggedIn.value = false;
  }
});

async function submit() {
  if (!body.value.trim() || submitting.value) return;
  submitting.value = true;
  notice.value = null;
  try {
    await apiFetch(`/api/posts/${props.contentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: body.value }),
    });
    // 进入审核队列, 通过后对所有人可见
    body.value = '';
    notice.value = { type: 'info', text: '评论已提交, 审核通过后将公开显示' };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) notice.value = { type: 'error', text: '请先登录后再发表评论' };
      else if (err.status === 429) notice.value = { type: 'error', text: '评论太频繁, 请稍后再试' };
      else notice.value = { type: 'error', text: err.message };
    } else {
      notice.value = { type: 'error', text: '网络异常, 请稍后再试' };
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="comment-section" aria-label="评论区">
    <h3>评论({{ comments.length }}) </h3>

    <div class="comment-form">
      <p v-if="!loggedIn" class="login-hint">
        <a href="/login/">登录</a> 后即可参与评论, 评论将经过审核后公开。
      </p>
      <textarea
        v-model="body"
        rows="3"
        maxlength="2000"
        placeholder="写下你的想法…(审核通过后显示) "
        :disabled="!loggedIn"
      />
      <div class="form-footer">
        <span class="counter">{{ body.length }}/2000</span>
        <button type="button" class="btn btn-primary" :disabled="!loggedIn || submitting" @click="submit">
          {{ submitting ? '提交中…' : '发表评论' }}
        </button>
      </div>
      <p v-if="notice" class="notice" :class="notice.type">{{ notice.text }}</p>
    </div>

    <p v-if="loading" class="loading">评论加载中…</p>
    <div v-else-if="comments.length === 0" class="empty">还没有评论, 来说第一句吧。</div>
    <ul v-else class="comment-list">
      <li v-for="comment in comments" :key="comment.id" class="comment-item">
        <div class="avatar" aria-hidden="true">{{ comment.author.nickname.slice(0, 1) }}</div>
        <div class="content">
          <div class="head">
            <span class="nickname">{{ comment.author.nickname }}</span>
            <time>{{ formatTime(comment.createdAt) }}</time>
          </div>
          <p class="body">{{ comment.body }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.comment-section {
  max-width: 720px;
  margin: 48px auto 0;
}

.comment-section h3 {
  font-size: 1.25rem;
  margin-bottom: 18px;
}

.login-hint {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 10px;
}

textarea {
  width: 100%;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--text);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  resize: vertical;
}

textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.counter {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.notice {
  font-size: 0.88rem;
  margin: 10px 0 0;
}

.notice.info {
  color: var(--accent);
}

.notice.error {
  color: #ff8080;
}

.loading,
.empty {
  color: var(--text-muted);
  text-align: center;
  padding: 28px 0;
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 28px 0 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 18px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.avatar {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient);
  color: #fff;
  font-weight: 700;
}

.head {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.nickname {
  font-weight: 600;
}

.head time {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.body {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
