import { adminIdentity, fail } from '../../../../lib/cms/auth';
import { database } from '../../../../lib/cms/store';
import { resolvePagePath, documentKey } from '../../../../lib/cms/pages';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!await adminIdentity())return fail('Доступ запрещён',403);const requestedPath=new URL(request.url).searchParams.get('path');if(!requestedPath)return fail('Укажите страницу');const path=requestedPath==='__settings'?requestedPath:resolvePagePath(requestedPath);if(!path)return fail('Страница не найдена',404);const rows=await database().prepare('SELECT id,action,created_at FROM cms_revisions WHERE path=? ORDER BY created_at DESC LIMIT 40').bind(documentKey(path)).all();return Response.json(rows.results,{headers:{'Cache-Control':'no-store'}});}
