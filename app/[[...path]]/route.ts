import {pages,resolvePagePath,documentKey,canonicalPath,russianRedirectPath} from '../../lib/cms/pages';
import {readDocument} from '../../lib/cms/store';
import {adminIdentity} from '../../lib/cms/auth';
import {renderStorefront} from '../../lib/cms/render';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const url=new URL(request.url),redirect=russianRedirectPath(url.pathname);
 if(redirect!==null)return new Response(null,{status:302,headers:{Location:redirect+url.search,'Cache-Control':'no-store'}});
 const path=resolvePagePath(url.pathname)||url.pathname;
 const canonical=canonicalPath(path);
 if(['/account','/cart','/checkout'].includes(canonical))return new Response(null,{status:302,headers:{Location:'/?panel='+canonical.slice(1)}});
 const page=pages[path];if(!page)return new Response('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Страница не найдена</title></head><body style="font:20px sans-serif;padding:10vw"><h1>Страница не найдена</h1><a href="/">На главную</a></body></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
 const preview=url.searchParams.get('cmsPreview')==='1';
 if(preview&&!await adminIdentity())return new Response('Войдите как владелец сайта, чтобы просмотреть черновик.',{status:403,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 const [record,settings]=await Promise.all([readDocument(documentKey(path)),readDocument('__settings')]);
 const config=preview?record.draft:record.published;
 const html=renderStorefront({path,preview,config,settings:settings.published,origin:url.origin});
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self'; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';"}});
}
