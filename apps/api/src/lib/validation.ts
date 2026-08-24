import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

/**
 * 请求体解析 + zod 校验。
 * 校验失败抛出 400 HTTPException, 由全局 onError 统一转为 JSON 错误响应。
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: '请求体不是合法的 JSON' });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new HTTPException(400, { message: `参数校验失败: ${detail}` });
  }
  return result.data;
}
