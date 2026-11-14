import { pages, editablePages, resolvePagePath, documentKey } from '../../../lib/cms/pages';
import { adminIdentity, fail, sameOrigin } from '../../../lib/cms/auth';
import { database, readDocument, saveDocument, validateConfig } from '../../../lib/cms/store';
export const dynamic = 'force-dynamic';
export async function GET(request:Request) {
 if(!await adminIdentity()) return fail('Вход доступен только владельцу сайта',403);
 const requestedPath=new URL(request.url).searchParams.get('path');
 if(requestedPath) {const path=requestedPath==='__settings'?requestedPath:resolvePagePath(requestedPath);if(!path) return fail('Страница не найдена',404); return Response.json({document:{...await readDocument(documentKey(path)),path},page:pages[path] ? {title:pages[path].title,fields:pages[path].fields,sections:pages[path].sections}:null},{headers:{'Cache-Control':'no-store'}});}
 const saved=await database().prepare('SELECT path, version,published_version,updated_at,published_at FROM cms_documents').all();
 return Response.json({pages:editablePages.map(([path,p])=>({path,title:p.title,fields:p.fields.length,sections:p.sections.length,locale:p.locale})),saved:saved.results},{headers:{'Cache-Control':'no-store'}});
}
export async function PUT(request:Request) {
 const user=await adminIdentity();if(!user) return fail('Доступ запрещён',403);
 if(!sameOrigin(request)) return fail('Недопустимый источник запроса',403);
 if(Number(request.headers.get('content-length'))>1200000) return fail('Слишком большой документ',413);
 try{
  const raw=await request.text(); if(raw.length>1200000) return fail('Слишком большой документ',413);
  const data=JSON.parse(raw);const {version,action}=data;
  const path=typeof data.path==='string'?(data.path==='__settings'?data.path:resolvePagePath(data.path)):null;
  if(!path) return fail('Страница не найдена',404);
  if(!Number.isInteger(version)||version<0||!['save','publish','restore'].includes(action)) return fail('Некорректный запрос');
  let incoming=data.config;
  if(action==='restore') {const revision=await database().prepare('SELECT config FROM cms_revisions WHERE id=? AND path=?').bind(data.revisionId,documentKey(path)).first<{config:string}>(); if(!revision) return fail('Версия не найдена',404);incoming=JSON.parse(revision.config);}
  const config=validateConfig(incoming,pages[path]);
  const document=await saveDocument(documentKey(path),config,version,action,user.userId);
  if(!document) return fail('Страница уже изменена в другой вкладке. Обновите редактор перед сохранением.',409);
  return Response.json({document:{...document,path}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e instanceof Error?e.message:'Не удалось сохранить');}
}
