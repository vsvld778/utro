import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../app/chatgpt-auth';
export async function adminIdentity() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const allowed = env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
  return allowed && user.email.toLowerCase() === allowed ? user : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
export function fail(message: string, status = 400) { return Response.json({ error:message }, {status, headers:{'Cache-Control':'no-store'}}); }
