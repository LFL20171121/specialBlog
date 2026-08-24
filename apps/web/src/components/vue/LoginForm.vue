<script setup lang="ts">
import { ref } from 'vue';
import { ApiError, apiFetch, type SessionUser } from '../../lib/api';

/** 登录 / 注册二合一表单；成功后跳转账户页 */
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const nickname = ref('');
const submitting = ref(false);
const error = ref('');

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';

  try {
    const payload =
      mode.value === 'login'
        ? { email: email.value, password: password.value }
        : { email: email.value, password: password.value, nickname: nickname.value };

    await apiFetch<{ user: SessionUser }>(`/api/auth/${mode.value === 'login' ? 'login' : 'register'}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // 登录态由 HttpOnly Cookie 维护，直接跳转
    location.href = '/account/';
  } catch (err) {
    if (err instanceof ApiError) error.value = err.message;
    else error.value = '网络异常，请稍后再试';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-card">
    <div class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'login'"
        :class="{ active: mode === 'login' }"
        @click="mode = 'login'"
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'register'"
        :class="{ active: mode === 'register' }"
        @click="mode = 'register'"
      >
        注册
      </button>
    </div>

    <form @submit.prevent="submit">
      <div class="field">
        <label for="email">邮箱</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div class="field">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          placeholder="至少 8 位"
        />
      </div>

      <div v-if="mode === 'register'" class="field">
        <label for="nickname">昵称</label>
        <input id="nickname" v-model="nickname" type="text" required maxlength="30" placeholder="将展示在评论中" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn btn-primary submit" type="submit" :disabled="submitting">
        {{ submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录' }}
      </button>
    </form>

    <p class="oauth-hint">GitHub / Google 第三方登录将在后续版本提供，当前请使用邮箱登录。</p>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 420px;
  margin: 32px auto 0;
  padding: 32px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: var(--bg-soft);
  border-radius: 12px;
  padding: 5px;
  margin-bottom: 24px;
}

.tabs button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.95rem;
  padding: 9px 0;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.tabs button.active {
  background: var(--card);
  color: var(--text);
  font-weight: 600;
}

.error {
  color: #ff8080;
  font-size: 0.88rem;
  margin: 0 0 12px;
}

.submit {
  width: 100%;
  margin-top: 4px;
}

.oauth-hint {
  margin: 18px 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
