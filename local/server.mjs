import http from 'node:http';
import { readFile, writeFile, mkdir, rename, unlink, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const MAX_IMAGE = 8 * 1024 * 1024;
const JSON_LIMIT = 1_200_000;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self'; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';";

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const clone = value => structuredClone(value);

async function acquireDataLock(directory) {
  await mkdir(directory, { recursive: true });
  const filename = resolve(directory, '.undo-server.lock');
  const recoveryFile = filename + '.recovery';
  const token = randomUUID();
  const record = JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() });
  const busy = message => Object.assign(new Error(message), { code: 'ELOCALLOCKED' });
  const readOwner = async () => {
    try {
      const owner = JSON.parse(await readFile(filename, 'utf8'));
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.token !== 'string' || !owner.token) throw new Error('Invalid lock');
      return owner;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw busy('Не удалось проверить блокировку папки data. Закройте все копии сайта и проверьте файл блокировки, прежде чем продолжать.');
    }
  };
  const isAlive = pid => {
    try { process.kill(pid, 0); return true; }
    catch (error) { if (error.code === 'ESRCH') return false; return true; }
  };
  const tryClaim = async () => {
    try { await writeFile(filename, record, { flag: 'wx', mode: 0o600 }); return true; }
    catch (error) { if (error.code === 'EEXIST') return false; throw error; }
  };
  if (!await tryClaim()) {
    const initial = await readOwner();
    if (initial && isAlive(initial.pid)) throw busy(`Эта папка data уже используется другой копией сайта (процесс ${initial.pid}). Сначала остановите её через Ctrl+C. Смена порта не разрешает совместное использование данных.`);
    // Serialize stale-lock recovery. A normal new claimant can win the brief
    // unlink/create interval, but wx will then reject us without deleting it.
    try { await writeFile(recoveryFile, record, { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if (error.code === 'EEXIST') throw busy('Проверка блокировки data уже выполняется. Повторите запуск после её завершения. Если прошлый запуск аварийно завершился во время восстановления, сначала убедитесь, что все копии остановлены.');
      throw error;
    }
    try {
      const owner = await readOwner();
      if (owner && isAlive(owner.pid)) throw busy(`Папка data занята процессом ${owner.pid}. Сначала остановите другую копию сайта.`);
      if (owner) await unlink(filename);
      if (!await tryClaim()) throw busy('Другой экземпляр сайта уже открыл эту папку data. Остановите его перед повторным запуском.');
    } finally { await unlink(recoveryFile).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  let releasePromise;
  return () => releasePromise ||= (async () => {
    const owner = await readOwner();
    if (owner?.pid === process.pid && owner.token === token) await unlink(filename).catch(error => { if (error.code !== 'ENOENT') throw error; });
  })();
}

async function atomicWrite(filename, data) {
  await mkdir(dirname(filename), { recursive: true });
  const temporary = filename + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, data, { mode: 0o600, flag: 'wx' });
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function createStore(directory) {
  const releaseLock = await acquireDataLock(directory);
  const filename = resolve(directory, 'content.json');
  let state = { schemaVersion: 1, documents: {}, history: [], media: [], inquiries: [] };
  try {
    const loaded = JSON.parse(await readFile(filename, 'utf8'));
    if (loaded.schemaVersion !== 1 || !loaded.documents || typeof loaded.documents !== 'object' || Array.isArray(loaded.documents) || !['history', 'media', 'inquiries'].every(key => Array.isArray(loaded[key]))) {
      throw new Error('Неверный формат data/content.json. Восстановите файл из резервной копии.');
    }
    state = loaded;
  } catch (error) {
    if (error.code !== 'ENOENT') { await releaseLock(); throw error; }
  }
  let tail = Promise.resolve();
  return {
    async read() { await tail; return state; },
    async close() { await tail; await releaseLock(); },
    mutate(work) {
      const pending = tail.then(async () => {
        const next = clone(state);
        const result = await work(next);
        await atomicWrite(filename, JSON.stringify(next, null, 2) + '\n');
        state = next;
        return result;
      });
      tail = pending.then(() => undefined, () => undefined);
      return pending;
    },
  };
}

async function bodyBytes(request, limit) {
  const declared = Number(request.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) fail(413, 'Слишком большой запрос');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) fail(413, 'Слишком большой запрос');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(request, limit = JSON_LIMIT) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) fail(415, 'Требуется application/json');
  try { return JSON.parse((await bodyBytes(request, limit)).toString('utf8')); }
  catch (error) { if (error instanceof HttpError) throw error; fail(400, 'Некорректный JSON'); }
}

function send(response, status, body, contentType = 'application/json; charset=utf-8', headers = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  response.writeHead(status, {
    'Content-Type': contentType, 'Content-Length': data.length,
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN', ...headers,
  });
  if (response.req.method === 'HEAD') response.end(); else response.end(data);
}

function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ['png', 'image/png'];
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return ['jpg', 'image/jpeg'];
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return ['webp', 'image/webp'];
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return ['gif', 'image/gif'];
  fail(400, 'Поддерживаются PNG, JPEG, WebP и GIF. SVG не допускается.');
}

async function staticFile(response, directory, pathname, options = {}) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { fail(400, 'Некорректный адрес'); }
  if (/[\0\\]/.test(decoded) || decoded.split('/').some(part => part.startsWith('.'))) return false;
  const base = resolve(directory);
  const candidate = resolve(base, '.' + decoded);
  if (!candidate.startsWith(base + sep) || !MIME[extname(candidate).toLowerCase()]) return false;
  try {
    const actual = await realpath(candidate), actualBase = await realpath(base);
    if (!actual.startsWith(actualBase + sep) || !(await stat(actual)).isFile()) return false;
    send(response, 200, await readFile(actual), MIME[extname(actual).toLowerCase()], options);
    return true;
  } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return false; throw error; }
}

/** A local-only server. Injecting shared allows storage/HTTP tests without a build. */
export async function createLocalServer({ rootDir = PROJECT_ROOT, dataDir = resolve(rootDir, 'data'), shared } = {}) {
  if (!shared) shared = await import(pathToFileURL(resolve(rootDir, 'local/generated/shared.mjs')).href);
  const { pages, editablePages, resolvePagePath, documentKey, russianRedirectPath, emptyConfig, validateConfig, renderStorefront } = shared;
  const store = await createStore(dataDir);
  const canonicalPath = value => typeof value === 'string' ? (value === '__settings' ? value : resolvePagePath(value)) : null;
  const keyFor = path => path === '__settings' ? path : documentKey(path);
  const readDocument = (state, path) => {
    const document = state.documents[keyFor(path)];
    return document ? { ...clone(document), path } : { path, draft: emptyConfig(), published: emptyConfig(), version: 0, publishedVersion: 0, updatedAt: '', publishedAt: null };
  };

  const server = http.createServer(async (request, response) => {
    try {
      const port = request.socket.localPort;
      const host = request.headers.host?.toLowerCase();
      const validHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!validHosts.includes(host) || request.rawHeaders.filter((_, i) => i % 2 === 0 && request.rawHeaders[i].toLowerCase() === 'host').length !== 1) fail(403, 'Разрешён только локальный адрес');
      const origin = `http://${host}`;
      const url = new URL(request.url, origin);
      if (url.origin !== origin) fail(403, 'Недопустимый адрес запроса');
      if (!['GET', 'HEAD'].includes(request.method) && request.headers.origin !== origin) fail(403, 'Недопустимый источник запроса');
      const pathname = url.pathname;
      const method = request.method;

      if (pathname === '/api/cms' && method === 'GET') {
        const state = await store.read(), requested = url.searchParams.get('path');
        if (requested) {
          const path = canonicalPath(requested); if (!path) fail(404, 'Страница не найдена');
          const page = pages[path];
          send(response, 200, { document: readDocument(state, path), page: page ? { title: page.title, fields: page.fields, sections: page.sections } : null });
        } else {
          send(response, 200, {
            pages: editablePages.map(([path, page]) => ({ path, title: page.title, locale: page.locale || (path.startsWith('/en') ? 'en' : 'ru'), fields: page.fields.length, sections: page.sections.length })),
            saved: Object.values(state.documents).map(document => ({ path: document.path, version: document.version, published_version: document.publishedVersion, updated_at: document.updatedAt, published_at: document.publishedAt })),
          });
        }
        return;
      }
      if (pathname === '/api/cms' && method === 'PUT') {
        const data = await jsonBody(request);
        const path = canonicalPath(data?.path); if (!path) fail(404, 'Страница не найдена');
        if (!Number.isInteger(data.version) || data.version < 0 || !['save', 'publish', 'restore'].includes(data.action)) fail(400, 'Некорректный запрос');
        const document = await store.mutate(state => {
          const current = readDocument(state, path), key = keyFor(path);
          if (current.version !== data.version) fail(409, 'Страница уже изменена в другой вкладке. Обновите редактор перед сохранением.');
          let incoming = data.config;
          if (data.action === 'restore') {
            const revision = state.history.find(item => item.id === data.revisionId && item.path === key);
            if (!revision) fail(404, 'Версия не найдена');
            incoming = revision.config;
          }
          let config;
          try { config = validateConfig(incoming, pages[path]); } catch (error) { fail(400, error.message); }
          const now = new Date().toISOString();
          const next = { ...current, path: key, draft: config, version: current.version + 1, updatedAt: now };
          if (data.action === 'publish') Object.assign(next, { published: clone(config), publishedVersion: next.version, publishedAt: now });
          state.documents[key] = next;
          state.history.unshift({ id: randomUUID(), path: key, config: clone(config), action: data.action, editor: 'local-owner', created_at: now });
          return { ...clone(next), path };
        });
        send(response, 200, { document }); return;
      }
      if (pathname === '/api/cms/history' && method === 'GET') {
        const path = canonicalPath(url.searchParams.get('path')); if (!path) fail(404, 'Страница не найдена');
        const state = await store.read();
        send(response, 200, state.history.filter(item => item.path === keyFor(path)).slice(0, 40).map(({ id, action, created_at }) => ({ id, action, created_at }))); return;
      }
      if (pathname === '/api/cms/media' && method === 'GET') {
        send(response, 200, (await store.read()).media.slice(0, 200)); return;
      }
      if (pathname === '/api/cms/media' && method === 'POST') {
        if (!/^multipart\/form-data\s*;/i.test(request.headers['content-type'] || '')) fail(415, 'Требуется загрузка файла');
        const bytes = await bodyBytes(request, MAX_IMAGE + 65_536);
        let form;
        try { form = await new Request(origin + pathname, { method: 'POST', headers: { 'Content-Type': request.headers['content-type'] }, body: bytes }).formData(); }
        catch { fail(400, 'Некорректная загрузка'); }
        const file = form.get('file');
        if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE) fail(400, 'Выберите изображение до 8 МБ');
        const content = Buffer.from(await file.arrayBuffer()), [extension, mime] = imageType(content);
        const id = `${randomUUID()}.${extension}`, location = resolve(dataDir, 'media', id);
        await atomicWrite(location, content);
        try {
          await store.mutate(state => state.media.unshift({ id, name: file.name.slice(0, 200), mime, size: file.size, created_at: new Date().toISOString() }));
        } catch (error) { await unlink(location).catch(() => {}); throw error; }
        send(response, 200, { id, url: '/media/' + id, name: file.name }); return;
      }
      if (pathname === '/api/inquiries' && method === 'GET') {
        send(response, 200, (await store.read()).inquiries.slice(0, 200)); return;
      }
      if (pathname === '/api/inquiries' && method === 'POST') {
        const data = await jsonBody(request, 30_000);
        if (typeof data?.email !== 'string' || !/^\S+@\S+\.\S+$/.test(data.email) || data.email.length > 254) fail(400, 'Укажите email');
        const type = data.type === 'newsletter' ? 'newsletter' : 'contact';
        await store.mutate(state => {
          const since = new Date(Date.now() - 60_000).toISOString();
          if (state.inquiries.some(item => item.email === data.email && item.type === type && item.created_at > since)) fail(429, 'Заявка уже сохранена. Повторите через минуту.');
          state.inquiries.unshift({ id: randomUUID(), type, email: data.email, name: String(data.name || '').slice(0, 200), message: String(data.message || '').slice(0, 10000), created_at: new Date().toISOString() });
        });
        const english = data.locale === 'en' || (data.locale !== 'ru' && /^https?:\/\/[^/]+\/en(?:\/|$)/.test(request.headers.referer || ''));
        send(response, 200, { ok: true, message: english ? 'Thank you! Your request has been saved.' : 'Спасибо! Ваша заявка сохранена.' }); return;
      }
      if (pathname.startsWith('/api/')) { fail(method === 'GET' ? 404 : 405, 'Запрос не поддерживается'); }
      if (!['GET', 'HEAD'].includes(method)) fail(405, 'Метод не поддерживается');
      const russianPath = russianRedirectPath(pathname);
      if (russianPath !== null) { send(response, 302, '', 'text/plain', { Location: russianPath + url.search }); return; }

      if (pathname.startsWith('/media/')) {
        const id = pathname.slice('/media/'.length);
        if (!/^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(id)) fail(404, 'Файл не найден');
        if (await staticFile(response, resolve(dataDir, 'media'), '/' + id, { 'Cache-Control': 'public, max-age=31536000, immutable' })) return;
        fail(404, 'Файл не найден');
      }
      if (pathname === '/admin' || pathname === '/admin/') {
        const html = await readFile(resolve(rootDir, 'local/admin.html'));
        send(response, 200, html, MIME['.html'], { 'Content-Security-Policy': CSP }); return;
      }
      if (await staticFile(response, resolve(rootDir, 'public'), pathname)) return;
      const panel = pathname.match(/^\/(account|cart|checkout)\/?$/);
      if (panel) { send(response, 302, '', 'text/plain', { Location: `/?panel=${panel[1]}` }); return; }
      const path = canonicalPath(pathname);
      if (!path || path === '__settings') {
        send(response, 404, '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Страница не найдена</title><body><h1>Страница не найдена</h1><a href="/">На главную</a></body></html>', MIME['.html']); return;
      }
      const state = await store.read(), document = readDocument(state, path), preview = url.searchParams.get('cmsPreview') === '1';
      const html = renderStorefront({ path, preview, config: preview ? document.draft : document.published, settings: readDocument(state, '__settings').published, origin });
      send(response, 200, html, MIME['.html'], { 'Content-Security-Policy': CSP });
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Локальный сервер:', error.message);
      send(response, status, { error: status === 500 ? 'Не удалось выполнить запрос. Проверьте окно локального сервера.' : error.message });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  // close(callback) resolves only after queued writes and lock release finish.
  // Also release on a native close event or a failed listen attempt.
  let closing;
  const release = () => closing ||= store.close();
  const nativeClose = server.close.bind(server);
  server.once('close', () => { release().catch(error => console.error('Блокировка data:', error.message)); });
  server.close = callback => {
    nativeClose(error => { release().then(() => callback?.(error), lockError => callback?.(error || lockError)); });
    return server;
  };
  return server;
}

export async function startLocalServer(options = {}) {
  const server = await createLocalServer(options);
  const port = options.port ?? 4173;
  try { await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); }); }
  catch (error) { await new Promise(done => server.close(done)); throw error; }
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Для запуска нужен Node.js 22 или новее: https://nodejs.org/');
  const port = Number(process.env.UNDO_PORT || 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('UNDO_PORT должен быть целым числом от 1024 до 65535.');
  try {
    const server = await startLocalServer({ port });
    console.log(`\nUTRO запущен локально: http://127.0.0.1:${port}/\nАдмин-панель: http://127.0.0.1:${port}/admin\nИзменения сохраняются в data/. Для остановки нажмите Ctrl+C.\n`);
    const stop = () => server.close(() => process.exit(0));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch (error) {
    console.error(error.code === 'EADDRINUSE' ? `Порт ${port} занят. Сначала остановите уже запущенную копию сайта. Другой порт выбирайте только если порт занят другим приложением.` : error.message);
    process.exitCode = 1;
  }
}
