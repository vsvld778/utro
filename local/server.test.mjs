import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { startLocalServer, createLocalServer } from './server.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const emptyConfig = () => ({ fields: {}, hidden: [], order: [] });
const page = { title: 'Test page', fields: [{ id: 'headline', kind: 'text', value: 'Original' }], sections: [{ id: 'hero', label: 'Hero' }] };
const pages = { '/': {...page,locale:'ru'}, '/en/': {...page,locale:'en'} };
const shared = {
  pages, editablePages: Object.entries(pages).filter(([path])=>path==='/'), emptyConfig,
  resolvePagePath: path => path==='/' ? '/' : null,
  russianRedirectPath(path) {
    let decoded;
    try { decoded=decodeURIComponent(path).replace(/\\/g,'/'); } catch { return null; }
    if(decoded!=='/en'&&!decoded.startsWith('/en/'))return null;
    return '/'+decoded.slice(3).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  },
  documentKey: path => path.startsWith('/en') ? '/' : '/ru/',
  validateConfig(value) {
    if (!value || !value.fields || !Array.isArray(value.hidden) || !Array.isArray(value.order) || Object.keys(value.fields).some(key => key !== 'headline') || Object.values(value.fields).some(value => typeof value !== 'string')) throw new Error('Некорректный документ');
    return structuredClone(value);
  },
  renderStorefront: ({ path, config }) => `<!doctype html><html lang="${path.startsWith('/en') ? 'en' : 'ru'}"><body>${config.fields.headline || 'Original'}</body></html>`,
};

function requestWithHost(port, host) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/api/cms', headers: { Host: host } }, response => {
      response.resume(); response.once('end', () => resolve(response.statusCode));
    });
    req.once('error', reject);
  });
}

test('standalone local server: content isolation, persistence and request boundaries', async t => {
  const rootDir = await mkdtemp(join(tmpdir(), 'undo-local-'));
  const dataDir = join(rootDir, 'data');
  await mkdir(join(rootDir, 'public'), { recursive: true });
  await mkdir(join(rootDir, 'local'), { recursive: true });
  await writeFile(join(rootDir, 'public', 'sample.css'), 'body{color:black}');
  await writeFile(join(rootDir, 'local', 'admin.html'), '<h1>Admin</h1>');
  const archivedEnglish={path:'/',draft:{...emptyConfig(),fields:{headline:'English draft'}},published:{...emptyConfig(),fields:{headline:'English published'}},version:7,publishedVersion:6,updatedAt:'2026-11-09T00:00:00.000Z',publishedAt:'2026-11-08T00:00:00.000Z'};
  const archivedRevision={id:'english-revision',path:'/',config:archivedEnglish.published,action:'publish',editor:'local-owner',created_at:'2026-11-08T00:00:00.000Z'};
  await mkdir(dataDir,{recursive:true});
  await writeFile(join(dataDir,'content.json'),JSON.stringify({schemaVersion:1,documents:{'/':archivedEnglish},history:[archivedRevision],media:[],inquiries:[]}));
  let server = await startLocalServer({ rootDir, dataDir, shared, port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(done => server.close(done)); await rm(rootDir, { recursive: true, force: true }); });
  const get = path => fetch(origin + path);
  const put = (path, version, text, action = 'save', revisionId) => fetch(origin + '/api/cms', {
    method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, version, action, revisionId, config: { ...emptyConfig(), fields: { headline: text } } }),
  });
  const doc = async path => (await (await get('/api/cms?path=' + encodeURIComponent(path))).json()).document;

  await t.test('binds IPv4 loopback and exposes Russian-only metadata', async () => {
    assert.equal(server.address().address, '127.0.0.1');
    assert.match(await (await get('/')).text(), /lang="ru"/);
    assert.match(await (await get('/en/')).text(), /lang="ru"/);
    const result = await (await get('/api/cms')).json();
    assert.deepEqual(result.pages.map(item => item.path), ['/']);
    assert.equal((await get('/admin')).status, 200);
    assert.equal((await get('/sample.css')).headers.get('content-type'), 'text/css; charset=utf-8');
  });

  await t.test('English public paths redirect to Russian with queries and no external authority', async () => {
    for(const [source,target] of [['/en','/'],['/en/?campaign=a%20b','/?campaign=a%20b'],['/en/pages/about?cmsPreview=1','/pages/about?cmsPreview=1'],['/en/cart?from=header','/cart?from=header'],['/%65n/pages/about','/pages/about'],['/en//outside.example?x=1','/outside.example?x=1'],['/en/%2f%2foutside.example','/outside.example']]) {
      const response=await fetch(origin+source,{redirect:'manual'});
      assert.equal(response.status,302,source);assert.equal(response.headers.get('location'),target,source);
      assert.equal(new URL(response.headers.get('location'),origin).origin,origin,source);
    }
    assert.equal((await get('/api/cms?path=/en/')).status,404);
    assert.equal((await get('/api/cms/history?path=/en/')).status,404);
  });

  await t.test('the same data directory cannot be opened by a second server, even before listen', async () => {
    await assert.rejects(createLocalServer({ rootDir, dataDir, shared }), error => error.code === 'ELOCALLOCKED');
    await assert.rejects(startLocalServer({ rootDir, dataDir, shared, port: 0 }), error => error.code === 'ELOCALLOCKED');
    const unstartedData = join(rootDir, 'unstarted-data');
    const first = await createLocalServer({ rootDir, dataDir: unstartedData, shared });
    await assert.rejects(createLocalServer({ rootDir, dataDir: unstartedData, shared }), error => error.code === 'ELOCALLOCKED');
    await new Promise(done => first.close(done));
    const reopened = await createLocalServer({ rootDir, dataDir: unstartedData, shared });
    await new Promise(done => reopened.close(done));
  });

  await t.test('saving a Russian draft does not publish it or change archived English', async () => {
    assert.equal((await put('/', 0, 'Русский черновик')).status, 200);
    assert.match(await (await get('/')).text(), /Original/);
    assert.match(await (await get('/?cmsPreview=1')).text(), /Русский черновик/);
    assert.equal((await put('/en/', 7, 'Attempted English edit', 'publish')).status, 404);
    assert.equal((await put('/', 1, 'Русский опубликованный', 'publish')).status, 200);
    assert.match(await (await get('/')).text(), /Русский опубликованный/);
    assert.match(await (await get('/en/')).text(), /Русский опубликованный/);
    assert.equal((await doc('/')).path, '/');
    const persisted=JSON.parse(await readFile(join(dataDir,'content.json'),'utf8'));
    assert.deepEqual(persisted.documents['/'],archivedEnglish);
    assert.deepEqual(persisted.history.find(item=>item.id==='english-revision'),archivedRevision);
  });

  await t.test('serialized writes reject one of two concurrent stale edits', async () => {
    const results = await Promise.all([put('/', 2, 'Вариант A'), put('/', 2, 'Вариант B')]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal((await doc('/')).version, 3);
    assert.match(await (await get('/')).text(), /Русский опубликованный/);
  });

  await t.test('history restores a draft without changing the published page', async () => {
    const history = await (await get('/api/cms/history?path=/')).json();
    assert.equal(history.length, 3);
    const first = history.at(-1);
    assert.equal((await put('/', 3, 'Unused value', 'restore', first.id)).status, 200);
    assert.equal((await doc('/')).draft.fields.headline, 'Русский черновик');
    assert.match(await (await get('/')).text(), /Русский опубликованный/);
    assert.equal((await put('/en/', 1, '', 'restore', first.id)).status, 404);
  });

  await t.test('rejects non-loopback Host and missing or foreign mutation Origin', async () => {
    assert.equal(await requestWithHost(server.address().port, `attacker.example:${server.address().port}`), 403);
    for (const mutationOrigin of [undefined, 'https://attacker.example']) {
      const response = await fetch(origin + '/api/cms', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(mutationOrigin ? { Origin: mutationOrigin } : {}) }, body: JSON.stringify({ path: '/', version: 4, action: 'save', config: emptyConfig() }) });
      assert.equal(response.status, 403);
    }
    assert.equal((await doc('/')).version, 4);
    assert.equal((await get('/%2e%2e/data/content.json')).status, 404);
  });

  let imageUrl;
  await t.test('stores raster uploads locally and rejects SVG content', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jux8AAAAASUVORK5CYII=', 'base64');
    const form = new FormData(); form.set('file', new File([png], 'pixel.png', { type: 'image/png' }));
    const result = await fetch(origin + '/api/cms/media', { method: 'POST', headers: { Origin: origin }, body: form });
    assert.equal(result.status, 200); imageUrl = (await result.json()).url;
    const image = await get(imageUrl); assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const invalid = new FormData(); invalid.set('file', new File(['<svg onload="alert(1)"/>'], 'fake.png', { type: 'image/png' }));
    assert.equal((await fetch(origin + '/api/cms/media', { method: 'POST', headers: { Origin: origin }, body: invalid })).status, 400);
    assert.equal((await (await get('/api/cms/media')).json()).length, 1);
  });

  await t.test('saves local inquiries and rejects immediate duplicates', async () => {
    const inquiry = () => fetch(origin + '/api/inquiries', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'newsletter', email: 'local-test@example.test', locale: 'ru' }) });
    const first = await inquiry(); assert.equal(first.status, 200); assert.match((await first.json()).message, /Спасибо/);
    assert.equal((await inquiry()).status, 429);
    assert.equal((await (await get('/api/inquiries')).json()).length, 1);
  });

  await t.test('atomic JSON survives a restart with drafts, history and media', async () => {
    await new Promise(done => server.close(done));
    server = await startLocalServer({ rootDir, dataDir, shared, port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await doc('/')).version, 4);
    assert.equal((await doc('/')).draft.fields.headline, 'Русский черновик');
    assert.equal((await get('/api/cms?path=/en/')).status,404);
    assert.equal((await get(imageUrl)).status, 200);
    const persisted = JSON.parse(await readFile(join(dataDir, 'content.json'), 'utf8'));
    assert.ok(persisted.documents['/ru/']); assert.ok(persisted.documents['/']);
    assert.deepEqual(persisted.documents['/'],archivedEnglish);
    assert.deepEqual(persisted.history.find(item=>item.id==='english-revision'),archivedRevision);
    assert.equal(persisted.inquiries.length, 1);
    assert.equal(persisted.history.length, 5);
  });

  await t.test('a failed listen releases its data lock', async () => {
    const alternateData = join(rootDir, 'alternate-data');
    await assert.rejects(startLocalServer({ rootDir, dataDir: alternateData, shared, port: server.address().port }), error => error.code === 'EADDRINUSE');
    const recovered = await startLocalServer({ rootDir, dataDir: alternateData, shared, port: 0 });
    await new Promise(done => recovered.close(done));
  });

  await t.test('a lock from a crashed process is recovered; an uncertain lock is retained', async () => {
    const crashData = join(rootDir, 'crash-data');
    const moduleURL = new URL('./server.mjs', import.meta.url).href;
    const child = spawn(process.execPath, ['--input-type=module', '-e', `
      import {startLocalServer} from ${JSON.stringify(moduleURL)};
      await startLocalServer({rootDir:${JSON.stringify(rootDir)},dataDir:${JSON.stringify(crashData)},port:0,shared:{}});
      process.send('ready');
    `], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
    await once(child, 'message');
    await assert.rejects(createLocalServer({ rootDir, dataDir: crashData, shared }), error => error.code === 'ELOCALLOCKED');
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    const recovered = await startLocalServer({ rootDir, dataDir: crashData, shared, port: 0 });
    await new Promise(done => recovered.close(done));
    const uncertainLock = join(crashData, '.undo-server.lock');
    await writeFile(uncertainLock, 'unreadable lock');
    await assert.rejects(createLocalServer({ rootDir, dataDir: crashData, shared }), error => error.code === 'ELOCALLOCKED');
    assert.equal(await readFile(uncertainLock, 'utf8'), 'unreadable lock');
  });
});
