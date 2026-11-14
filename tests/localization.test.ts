import test from 'node:test';
import assert from 'node:assert/strict';
import original from '../reference/pages.json';
import {pages,editablePages,resolvePagePath,documentKey,russianRedirectPath} from '../lib/cms/pages';
test('Only 19 Russian canonical pages are editable; archived English keys remain intact',()=>{
 assert.equal(editablePages.length,19);
 assert.equal(editablePages.filter(([p,page])=>page.locale==='ru'&&!p.startsWith('/en/')).length,19);
 for(const path of ['/en','/en/','/en/pages/about','/%65n/pages/about','/en%2Fpages/about'])assert.equal(resolvePagePath(path),null,path);
 assert.notEqual(documentKey('/pages/about'),documentKey('/en/pages/about'));
 assert.equal(documentKey('/en/pages/about'),'/pages/about');
 assert.equal(documentKey('/pages/about'),'/ru/pages/about');
 const alias='/collections/pre-alcohol-gummies/products/undo-gummies%C2%AE-pre-alcohol-support-5-pack';
 assert.equal(resolvePagePath('/en'+alias),null);
 assert.equal(resolvePagePath(alias),'/products/undo-gummies%C2%AE-pre-alcohol-support-5-pack');
});
test('English redirects preserve their Russian path and never create an external URL',()=>{
 assert.equal(russianRedirectPath('/en'),'/');
 assert.equal(russianRedirectPath('/en/'),'/');
 assert.equal(russianRedirectPath('/en/pages/about'),'/pages/about');
 assert.equal(russianRedirectPath('/en/products/undo-gummies%C2%AE-pre-alcohol-support-5-pack'),'/products/undo-gummies%C2%AE-pre-alcohol-support-5-pack');
 assert.equal(russianRedirectPath('/%65n/pages/about'),'/pages/about');
 assert.equal(russianRedirectPath('/en/a%3Fb%23c'),'/a%3Fb%23c');
 for(const path of ['/en//outside.example','/en/%2f%2foutside.example','/en/\\outside.example','/en/%5c%5coutside.example','/en/%0d%0aLocation%3a%20https%3a%2f%2foutside.example']){
  const result=russianRedirectPath(path)!;
  assert.ok(result.startsWith('/')&&!result.startsWith('//'),path);
  assert.equal(new URL(result,'https://shop.example').origin,'https://shop.example',path);
  assert.doesNotMatch(result,/[\r\n\\]/);
 }
 for(const path of ['/pages/about','/enough','//outside.example','/en/%ZZ'])assert.equal(russianRedirectPath(path),null,path);
});
test('Localization preserves every original image URL and image field',()=>{
 const sources=(html:string)=>[...html.matchAll(/\b(?:src|srcset)="([^"]*)"/g)].map(m=>m[0]);
 for(const [path,page] of Object.entries(original)){
  for(const localized of [pages[path],pages['/en'+path]]){
   assert.deepEqual(sources(localized.body),sources(page.body),path);
   assert.deepEqual(localized.fields.filter(f=>f.kind==='image').map(f=>[f.id,f.value]),page.fields.filter(f=>f.kind==='image').map(f=>[f.id,f.value]),path);
  }
 }
});
test('Archived English copy text stays unchanged while its internal links retain English',()=>{
 for(const [path,page] of Object.entries(original)){
  const localized=pages['/en'+path];
  assert.equal(localized.title,page.title);
  assert.deepEqual(localized.fields.filter(f=>f.kind==='text').map(f=>f.value),page.fields.filter(f=>f.kind==='text').map(f=>f.value));
  const nav=localized.fields.filter(f=>f.kind==='link'&&f.value.startsWith('/pages/'));
  assert.equal(nav.length,0,path);
 }
});
