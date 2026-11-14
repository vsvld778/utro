import {contactText} from '../public/brand-contact.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {brandText} from '../public/brand.js';
import {storefrontText} from '../public/storefront-text.js';

const fixture = new URL('../reference/localized-pages.json', import.meta.url);
test('Legacy CMS brand names normalize without changing URLs, contacts or identifiers',()=>{
 assert.equal(brandText('UNDO, Undo и undo — новый UTRO.'),'UTRO, UTRO и UTRO — новый UTRO.');
 const protectedText='https://undogummies.com/UNDO?brand=UNDO /reference/Undo-15-pack.jpg hello@undogummies.com undo_cart undoable';
 assert.equal(brandText(protectedText),protectedText);
 assert.equal(brandText('UNDO: '+protectedText),'UTRO: '+protectedText);
 assert.equal(storefrontText('Набор UNDO — 15 саше, $49.00'),'Набор UTRO — 15 шт, 49,00 ₽');
});
test('The legacy disclaimer is recognized before the brand replacement',()=>{
 const legacy='Эти утверждения не оценивались Управлением по контролю качества пищевых продуктов и лекарственных средств США (FDA). UNDO Gummies® не предназначен для диагностики, лечения или профилактики заболеваний.';
 const result=storefrontText(legacy);
 assert.match(result,/Не является лекарственным средством/);
 assert.doesNotMatch(result,/FDA|UNDO|UTRO Gummies/);
});
test('Every Russian snapshot and accessible label displays UTRO, retaining the archived English source',async()=>{
 const pages=JSON.parse(await readFile(fixture,'utf8'));
 const original=JSON.parse(await readFile(new URL('../reference/pages.json',import.meta.url),'utf8'));
 let checked=0;
 for(const [path,page] of Object.entries(pages)){
  if(page.locale!=='ru')continue;
  checked++;
  const body=page.body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  const values=[page.title,...page.sections.map(s=>s.label),...page.fields.map(f=>f.label),...page.fields.filter(f=>f.kind==='text').map(f=>f.value),...page.fields.map(f=>f.alt||''),body.replace(/<[^>]*>/g,'')];
  for(const match of body.matchAll(/\b(?:alt|aria-label|title|placeholder|data-custom-title)\s*=\s*(["'])(.*?)\1/gis))values.push(match[2]);
  for(const value of values)assert.equal(brandText(value),contactText(value),'Unconverted visible brand at '+path+': '+value.slice(0,160));
  const en=pages['/en'+path];
  assert.equal(en.title,original[path].title);
  assert.deepEqual(en.fields.filter(f=>f.kind==='text').map(f=>f.value),original[path].fields.filter(f=>f.kind==='text').map(f=>f.value));
 }
 assert.equal(checked,20);
 assert.match(pages['/'].title,/UTRO/);
});
test('Rebranding leaves product handles and media references intact in runtime JSON',async()=>{
 const pages=JSON.parse(await readFile(fixture,'utf8'));
 const original=JSON.parse(await readFile(new URL('../reference/pages.json',import.meta.url),'utf8'));
 const keys=new Set(['handle','url','featuredImageSrc','overrideImageSrc','thumbSrc','heroSrc']);
 const collect=value=>Array.isArray(value)?value.flatMap(collect):value&&typeof value==='object'?Object.entries(value).flatMap(([key,item])=>keys.has(key)?[[key,item],...collect(item)]:collect(item)):[];
 const runtime=body=>[...body.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
 for(const [path,page] of Object.entries(original))assert.deepEqual(collect(runtime(pages[path].body)),collect(runtime(page.body)),path);
});

// Test the actual server HTML, including the first response before browser JS.
test('Every rendered Russian page removes original-store contact text and mail links', async()=>{
 const {pages,renderStorefront}=await import('../local/generated/shared.mjs');
 let count=0;
 for(const [path,page] of Object.entries(pages)){
  if(page.locale!=='ru')continue;
  count++;
  const html=renderStorefront({path,config:{fields:{},hidden:[],order:[]},settings:{fields:{},hidden:[],order:[]},origin:'https://utro.example'});
  const visible=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,'');
  assert.doesNotMatch(visible,/undo/i,path);
  assert.doesNotMatch(html,/href=["']mailto:info@undogummies\.com/i,path);
 }
 assert.equal(count,20);
 const {brandShareURL}=await import('../public/brand-media.js');
 assert.equal(brandShareURL('mailto:info@undogummies.com'),'/pages/contact');
 assert.equal(brandShareURL('mailto:owner@example.com'),'mailto:owner@example.com');
 assert.equal(contactText('info@undogummies.com'),'форму обратной связи');
});
