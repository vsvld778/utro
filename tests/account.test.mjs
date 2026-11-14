import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {cleanProfile,loadProfile,saveProfile,escapeHTML,PROFILE_KEY} from '../public/account-model.js';
import {accountRoutes} from '../scripts/account-pages.mjs';
test('Guest profile validates storage, limits input and keeps HTML inert',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.deepEqual(loadProfile(storage),cleanProfile());
 const p=saveProfile(storage,{firstName:'  Всеволод  ',email:'test@example.invalid',city:'Москва',extra:'ignored'});
 assert.equal(p.firstName,'Всеволод');assert.equal(loadProfile(storage).city,'Москва');assert.equal(p.extra,undefined);
 assert.equal(cleanProfile({firstName:'a'.repeat(1000),city:{}}).firstName.length,80);
 assert.equal(cleanProfile({city:{}}).city,'');
 map.set(PROFILE_KEY,'{bad');assert.deepEqual(loadProfile(storage),cleanProfile());
 assert.equal(escapeHTML('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
 assert.throws(()=>saveProfile({setItem(){throw Error('blocked')}},p),/blocked/);
});
test('Every customer route has real content, local assets and truthful guest status',async()=>{
 for(const route of accountRoutes){
 const html=await readFile(new URL('../out'+route+'/index.html',import.meta.url),'utf8');
 assert.match(html,/<html lang="ru">/);assert.match(html,/Гостевой|гостевой/);
 assert.doesNotMatch(html,/http-equiv="refresh"/);
 assert.doesNotMatch(html,/account\.undogummies\.com/);
 for(const m of html.matchAll(/(?:href|src)="(\/utro\/[^"]*)"/g)){
 const path=m[1].split(/[?#]/)[0].slice('/utro'.length);
 const url=new URL('../out'+path,import.meta.url);
 let s;try{s=await stat(url)}catch{assert.fail(route+' missing '+path)}
 if(s.isDirectory())assert.ok((await stat(new URL(url.href.replace(/\/$/,'')+'/index.html'))).isFile());
 }
 }
 const login=await readFile(new URL('../out/account/login/index.html',import.meta.url),'utf8');
 assert.match(login,/Сервис входа ещё не подключён/);assert.doesNotMatch(login,/<input/);
 const profile=await readFile(new URL('../out/account/profile/index.html',import.meta.url),'utf8');
 assert.match(profile,/data-edit="contact"/);assert.match(profile,/data-edit="address"/);
});
test('Account navigation and cart handoff use the GitHub Pages base path',async()=>{
 const runtime=await readFile(new URL('../out/storefront.js',import.meta.url),'utf8');
 assert.match(runtime,/function openAccount\(\)\{location.assign\(withBase\('\/account\/login\/'\)\);return;/);
 assert.match(runtime,/utro-account-entry/);assert.match(runtime,/cms-cart-account/);
 const page=await readFile(new URL('../out/account-page.js',import.meta.url),'utf8');
 assert.doesNotMatch(page,/\bfetch\s*\(/);
 assert.match(page,/if\(document.body.dataset.accountPage==='cart'\)/);
});
