import {accountRoutes,renderAccountPage} from './account-pages.mjs';
import {cp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pages,renderStorefront,resolvePagePath,emptyConfig} from '../local/generated/shared.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'out');
const base='/utro';
const hosted='https://undo-gummies-study-vsevolod.nordterma.chatgpt.site';
const origin='https://vsvld778.github.io';
const documents=JSON.parse(await readFile(join(root,'reference/github-published-content.json'),'utf8'));
export function withBase(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value===base||value.startsWith(base+'/'))return value;
 if(value==='/admin'||value.startsWith('/admin/'))return hosted+value;
 if(value.startsWith('/media/'))return hosted+value;
 return base+value;
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
function cssURLs(text){return text.replace(/url\((['"]?)(\/(?!\/)[^)'"\s]+)\1\)/g,(_,quote,url)=>`url(${quote}${withBase(url)}${quote})`)}
function staticHref(value){
 if(value.startsWith('/'))return withBase(value);
 try{
  const url=new URL(value.replaceAll('&amp;','&'));
  if(['www.facebook.com','twitter.com','pinterest.com'].includes(url.hostname)){
   for(const key of ['u','url','media']){const target=url.searchParams.get(key);if(!target)continue;const nested=new URL(target);if(nested.origin===origin){nested.pathname=withBase(nested.pathname);url.searchParams.set(key,nested.href)}}
   return url.href.replaceAll('&','&amp;');
  }
 }catch{}
 return value;
}
function htmlURLs(html){
 return cssURLs(html.replace(/(\s(?:src|href|poster|action)=)(["'])(.*?)\2/g,(_,prefix,quote,url)=>prefix+quote+staticHref(url)+quote)
 .replace(/(\ssrcset=)(["'])(.*?)\2/g,(_,prefix,quote,value)=>prefix+quote+value.replace(/(^|[\s,])(\/(?!\/)[^\s,]+)/g,(_,sep,url)=>sep+withBase(url))+quote));
}
async function emit(route,html){
 html=html.replace(/(href="[^"]*\/account\.css)(?:\?[^"]*)?"/g,'$1?v=utro-cyan-20261114"');
 const segments=decodeURIComponent(route).split('/').filter(Boolean);
 if(segments.some(s=>s==='..'||s==='.'||s.includes('\\')))throw Error('Unsafe route');
 const file=join(out,...segments,'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,html);
}
function redirect(url,label='Открыть страницу UTRO') {const safe=escape(url);return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${safe}"><title>UTRO</title><a href="${safe}">${label}</a></html>`}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(join(root,'public'),out,{recursive:true,filter:source=>!source.includes('/localadmin')});
await writeFile(join(out,'.nojekyll'),'');
await writeFile(join(out,'github-paths.js'),`const base=${JSON.stringify(base)};const hosted=${JSON.stringify(hosted)};\nexport ${withBase.toString()}\n`);
let media=await readFile(join(out,'brand-media.js'),'utf8');
media=`import {withBase} from './github-paths.js';\n`+media;
media=media.replace('export function brandMediaURL(value) {',`export function brandMediaURL(value) {\n if(typeof value==='string' && value.startsWith('${base}/')) value=value.slice(${base.length});`);
media=media.replace("!brandedMediaPaths.has(value.split(/[?#]/, 1)[0])) return value;","!brandedMediaPaths.has(value.split(/[?#]/, 1)[0])) return withBase(value);");
media=media.replace('return url.pathname + url.search + url.hash;','return withBase(url.pathname + url.search + url.hash);');
media=media.replace('if (!route || !origin) return value;','if (!route || !origin) return withBase(value);');
media=media.replace('new URL(currentPath, base.origin)','new URL(withBase(currentPath), base.origin)');
await writeFile(join(out,'brand-media.js'),media);
let storefront=await readFile(join(out,'storefront.js'),'utf8');
storefront=`import {withBase} from './github-paths.js';\n`+storefront;
storefront=storefront.replace("const localizedPath=(path,locale=ru?'ru':'en')=>locale==='ru'?path:'/en'+(path==='/'?'':path);","const localizedPath=(path,locale=ru?'ru':'en')=>withBase(locale==='ru'?path:'/en'+(path==='/'?'':path));");
storefront=storefront.replaceAll('a[href="/account"]','a[href="/utro/account"]').replaceAll('a[href="/en/account"]','a[href="/utro/en/account"]').replaceAll('a[href="/cart"]','a[href="/utro/cart"]').replaceAll('a[href="/en/cart"]','a[href="/utro/en/cart"]');
storefront=storefront.replaceAll('href="/admin"',`href="${hosted}/admin"`);
storefront=storefront.replace("function openAccount(){","function openAccount(){location.assign(withBase('/account/login/'));return;");
storefront=storefront.replace("const body=!cart.length?","const accountLink='<a class=\"cms-cart-account\" href=\"'+withBase('/account/login/')+'\">Личный кабинет</a>';\n const body=!cart.length?");
storefront=storefront.replace("<p>${escapeText(storefrontText(emptyText))}</p></div>","<p>${escapeText(storefrontText(emptyText))}</p><a class=\"cms-cta\" href=\"${withBase('/products/undo-hangover-gummies/')}\">К покупкам</a>${accountLink}</div>");
storefront=storefront.replace("${tr('Check out','Оформить заказ')}</button></div>","${tr('Check out','Оформить заказ')}</button>${accountLink}</div>");
storefront=storefront.replace("// Merchant account is intentionally not impersonated.","\nconst headerCart=document.getElementById('CartButton');\nif(headerCart&&!document.body.classList.contains('utro-account')){\n const entry=document.createElement('a');entry.href=withBase('/account/login/');entry.className='utro-account-entry';entry.setAttribute('aria-label','Личный кабинет');\n entry.innerHTML='<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 22v-3a8 8 0 0 1 16 0v3\"/></svg>';\n headerCart.before(entry);\n}\n");

const bindPrefix="function bindForm(form){if(form.matches('[data-product-form]'))return;";
if(!storefront.includes(bindPrefix))throw Error('Form adapter requires review');
storefront=storefront.replace(bindPrefix,bindPrefix+`form.innerHTML='<p>Чтобы отправить обращение или оставить email, откройте форму связи UTRO.</p><a class="cms-cta" href="${hosted}/pages/contact">Открыть форму связи</a>';return;`);
storefront=storefront.replace("if(!state.preview){let dismiss=false;", "if(!state.preview&&!document.body.classList.contains('utro-account')){let dismiss=false;");
await writeFile(join(out,'storefront.js'),storefront);
for(const name of await readdir(out)){if(name.endsWith('.css'))await writeFile(join(out,name),cssURLs(await readFile(join(out,name),'utf8')))}
const routes=new Map();
for(const [route,page] of Object.entries(pages))if(page.locale==='ru')routes.set(route,route);
// Include legacy product collection aliases that are linked by the storefront.
for(const page of Object.values(pages))if(page.locale==='ru')for(const match of page.body.matchAll(/\bhref=["'](\/(?!\/)[^"'#?]*)/g)){
 const route=match[1],resolved=resolvePagePath(route);if(resolved)routes.set(route,resolved);
}
for(const [route,canonical] of routes){
 const config=documents['/ru'+canonical]||emptyConfig();
 const html=renderStorefront({path:canonical,config,settings:documents.__settings||emptyConfig(),origin}).replace('</head>',`<link rel="stylesheet" href="/account.css"></head>`);
 await emit(route,htmlURLs(html));
}
for(const [route,page] of Object.entries(pages))if(page.locale==='en')await emit(route,redirect(withBase(page.canonicalPath)));

const homeHTML=renderStorefront({path:'/',config:emptyConfig(),settings:documents.__settings||emptyConfig(),origin});
const stateMatch=homeHTML.match(/<script type="application\/json" id="cms-state">(.*?)<\/script>/s);
if(!stateMatch)throw Error('Account storefront state missing');
const accountState=JSON.parse(stateMatch[1]);accountState.config=emptyConfig();
const stateJSON=JSON.stringify(accountState).replaceAll('<','\\u003c');
for(const route of accountRoutes)await emit(route,renderAccountPage(route,{base,stateJSON}));
await emit('/checkout',redirect(base+'/cart/'));

await emit('/admin',redirect(hosted+'/admin','Открыть редактор UTRO'));
await writeFile(join(out,'404.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UTRO — страница не найдена</title><h1>Страница не найдена</h1><a href="${base}/">На главную UTRO</a></html>`);
await writeFile(join(out,'build-info.json'),JSON.stringify({brand:'UTRO',basePath:base,routes:[...routes.keys()],commit:process.env.GITHUB_SHA||null},null,2));
console.log(`GitHub Pages: ${routes.size} routes -> ${out}`);
