import {contactMarkup} from '../../public/brand-contact.js';
import {pages, canonicalPath, pageLocale} from './pages';
import {Config,defaultPrices,defaultIntegrations,defaultCartSettings} from './types';
import {storefrontText} from '../../public/storefront-text.js';
import {brandMediaURL,brandMediaSrcset,brandShareURL} from '../../public/brand-media.js';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safeJSON=(data:unknown)=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
function versionMedia(value:unknown):unknown {
 if(typeof value==='string')return brandMediaURL(value);
 if(Array.isArray(value))return value.map(versionMedia);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,versionMedia(item)]));
 return value;
}
function brandMarkup(html:string,context:{origin?:string;path:string;title:string}):string {
 // Product gallery URLs also live in non-executable JSON, outside image attributes.
 const withJSON=contactMarkup(html).replace(/(<script\b[^>]*\btype=["']application\/json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,(whole,open,body,close)=>{
  try{return open+safeJSON(versionMedia(JSON.parse(body)))+close;}catch{return whole;}
 });
 return withJSON.replace(/(\s)(src|srcset|poster|href)(\s*=\s*)(["'])(.*?)\4/gi,(whole,space,name,equals,quote,raw)=>{
  const value=raw.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  const next=name.toLowerCase()==='srcset'?brandMediaSrcset(value):name.toLowerCase()==='href'?brandMediaURL(brandShareURL(value,context)):brandMediaURL(value);
  return next===value?whole:space+name+equals+quote+esc(next)+quote;
 });
}
export function renderStorefront({path,preview=false,config,settings,origin}:{path:string;preview?:boolean;config:Config;settings:Config;origin?:string}) {
 const page=pages[path];if(!page)throw new Error('Page not found');
 const locale=pageLocale(path);
 const attributes=Object.entries(page.bodyAttributes||{}).filter(([key])=>/^(data-[\w-]+|dir)$/.test(key)).map(([key,value])=>`${key}="${esc(value)}"`).join(' ');
 const payload={path,canonicalPath:canonicalPath(path),locale,preview,config,prices:settings.prices||defaultPrices,sections:page.sections,integrations:settings.integrations||defaultIntegrations(),cartSettings:settings.cartSettings||defaultCartSettings()};
 const title=storefrontText(config.title||page.title),context={origin,path,title};
 return `<!doctype html><html lang="${locale}" class="js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>${brandMarkup(page.head,context)}<link rel="stylesheet" href="/storefront.css">${locale==='ru'?'<link rel="stylesheet" href="/russian.css">':''}</head><body class="${esc(page.bodyClass)}" ${attributes}>${brandMarkup(page.body,context)}<script type="application/json" id="cms-state">${safeJSON(payload)}</script><script src="/storefront.js" type="module"></script></body></html>`;
}
