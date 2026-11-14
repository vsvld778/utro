import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=new URL('../out/',import.meta.url);
const info=JSON.parse(await readFile(new URL('build-info.json',out),'utf8'));
const exists=async url=>{try{return (await stat(url)).isFile()}catch{return false}};
test('All static routes load UTRO text and resolve navigation and first-render assets under /utro',async()=>{
 let images=0,links=0;
 for(const route of info.routes){
  const file=new URL('.'+decodeURIComponent(route).replace(/\/$/,'')+'/index.html',out);
  const html=await readFile(file,'utf8');
  const visible=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,'');
  assert.doesNotMatch(visible,/undo/i,route);
  for(const m of html.matchAll(/\b(src|href|poster)=["'](\/[^"']*)["']/g)){
   const value=m[2];if(value.startsWith('//'))continue;
   assert.ok(value.startsWith('/utro/'),route+' root URL '+value);
   const pathname=decodeURIComponent(value.split(/[?#]/)[0].slice('/utro/'.length));
   const target=new URL(pathname,out);
   if(m[1]!=='href'){assert.ok(await exists(target),route+' missing '+value);images++;}
   else if(!await exists(target)) {assert.ok(await exists(new URL((pathname?pathname.replace(/\/$/,'')+'/':'')+'index.html',out)),route+' broken link '+value);links++;}
  }
 }
 assert.ok(info.routes.length>=20);assert.ok(images>100);assert.ok(links>100);
});
test('Runtime cart/gallery URLs stay in the project and admin/form handoffs stay on the server',async()=>{
 const {brandMediaURL,brandShareURL}=await import('../out/brand-media.js');
 assert.equal(brandMediaURL('/assets/product-5.jpg'),'/utro/assets/product-5.jpg?brand=utro-20261114');
 assert.equal(brandMediaURL('/utro/assets/product-5.jpg?brand=old'),'/utro/assets/product-5.jpg?brand=utro-20261114');
 assert.equal(brandMediaURL('/reference/example.jpg'),'/utro/reference/example.jpg');
 assert.equal(brandShareURL('/pages/contact'),'/utro/pages/contact');
 assert.equal(brandShareURL('mailto:info@undogummies.com'),'/utro/pages/contact');
 assert.equal(brandShareURL('/admin'),'https://undo-gummies-study-vsevolod.nordterma.chatgpt.site/admin');
 const js=await readFile(new URL('storefront.js',out),'utf8');
 assert.ok(js.includes("if(form.matches('[data-product-form]'))return;form.innerHTML="));
 assert.ok(js.includes('Открыть форму связи'));
 const admin=await readFile(new URL('admin/index.html',out),'utf8');
 assert.match(admin,/https:\/\/undo-gummies-study-vsevolod.nordterma.chatgpt.site\/admin/);
});
test('Static export preserves published prices and root page CMS disclaimer',async()=>{
 const html=await readFile(new URL('index.html',out),'utf8');
 const match=html.match(/<script type="application\/json" id="cms-state">(.*?)<\/script>/s);
 assert.ok(match);const state=JSON.parse(match[1]);
 assert.equal(state.prices['5'].once,190000);assert.equal(state.prices['30'].monthly,950000);
 assert.match(state.config.fields['t-aa04d884bab4'],/Не является лекарственным средством/);
});
