<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiFetch, type SessionUser } from '../../lib/api';

const user = ref<SessionUser | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await apiFetch<{ user: SessionUser }>('/api/auth/me');
    user.value = data.user;
  } catch {
    user.value = null;
  } finally {
    loading.value = false;
  }
});

async function logout() {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  location.href = '/';
}
</script>

<template>
  <div class="account-card">
    <p v-if="loading" class="hint">加载中…</p>

    <template v-else-if="user">
      <div class="avatar" aria-hidden="true">{{ user.nickname.slice(0, 1) }}</div>
      <h2>{{ user.nickname }}</h2>
      <dl class="info">
        <div class="row">
          <dt>邮箱</dt>
          <dd>{{ user.email }}</dd>
        </div>
        <div class="row">
          <dt>角色</dt>
          <dd>{{ user.role === 'admin' ? '管理员' : '普通用户' }}</dd>
        </div>
      </dl>
      <div class="actions">
        <a v-if="user.role === 'admin'" class="btn" href="/admin/">进入管理后台</a>
        <button type="button" class="btn btn-ghost" @click="logout">退出登录</button>
      </div>
    </template>

    <template v-else>
      <p class="hint">当前未登录</p>
      <a class="btn btn-primary" href="/login/">前往登录</a>
    </template>
  </div>
</template>

<style scoped>
.account-card {
  max-width: 420px;
  margin: 32px auto 0;
  padding: 40px 32px;
  text-align: center;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

.avatar {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient);
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
}

h2 {
  margin: 0 0 20px;
}

.info {
  text-align: left;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.92rem;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  word-break: break-all;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hint {
  color: var(--text-muted);
}
</style>
