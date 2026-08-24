<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError, apiFetch, type LikeState } from '../../lib/api';

const props = defineProps<{ contentId: string }>();

const count = ref(0);
const liked = ref(false);
const loading = ref(false);
const notice = ref('');

onMounted(async () => {
  try {
    const state = await apiFetch<LikeState>(`/api/posts/${props.contentId}/like`);
    count.value = state.count;
    liked.value = state.liked;
  } catch {
    // 点赞数拉取失败时保持安静, 不打扰阅读
  }
});

async function toggle() {
  if (loading.value) return;
  loading.value = true;
  notice.value = '';
  try {
    const state = await apiFetch<LikeState>(`/api/posts/${props.contentId}/like`, {
      method: liked.value ? 'DELETE' : 'PUT',
    });
    count.value = state.count;
    liked.value = state.liked;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) notice.value = '登录后才能点赞';
      else if (err.status === 429) notice.value = '操作太频繁, 请稍后再试';
      else notice.value = err.message;
    } else {
      notice.value = '网络异常, 请稍后再试';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="like-button">
    <button
      type="button"
      class="like-btn"
      :class="{ liked }"
      :disabled="loading"
      :aria-pressed="liked"
      @click="toggle"
    >
      <span class="heart" aria-hidden="true">{{ liked ? '♥' : '♡' }}</span>
      <span class="count">{{ count }}</span>
      <span class="label">{{ liked ? '已赞' : '点赞' }}</span>
    </button>
    <transition name="fade">
      <p v-if="notice" class="notice">
        {{ notice }}
        <a v-if="notice === '登录后才能点赞'" href="/login/">去登录</a>
      </p>
    </transition>
  </div>
</template>

<style scoped>
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s, box-shadow 0.2s;
}

.like-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent);
}

.like-btn.liked {
  border-color: transparent;
  background: var(--gradient);
  color: #fff;
}

.heart {
  font-size: 1.05rem;
}

.label {
  color: inherit;
}

.notice {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
