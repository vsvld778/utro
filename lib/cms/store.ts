import { env } from 'cloudflare:workers';
import { Config, Document, emptyConfig } from './types';
type DocumentRow = { path:string; draft:string; published:string; version:number; published_version:number; updated_at:string; published_at:string|null };
function documentFromRow(row:DocumentRow):Document {
 return {path:row.path,draft:JSON.parse(row.draft),published:JSON.parse(row.published),version:row.version,publishedVersion:row.published_version,updatedAt:row.updated_at,publishedAt:row.published_at};
}
export function database() { if(!env.DB) throw new Error('Content database unavailable'); return env.DB; }
export async function readDocument(path: string): Promise<Document> {
 const row = await database().prepare('SELECT * FROM cms_documents WHERE path = ?').bind(path).first<DocumentRow>();
 return row ? documentFromRow(row) : {path,draft:emptyConfig(),published:emptyConfig(),version:0,publishedVersion:0,updatedAt:'',publishedAt:null};
}
export {validateConfig} from './validation';
export async function saveDocument(path:string, config:Config, version:number, action:'save'|'publish'|'restore', editor:string) {
 const db=database();const now=new Date().toISOString(); const json=JSON.stringify(config);
 const update = action==='publish' ? db.prepare('UPDATE cms_documents SET draft=?,published=?,version=version+1,published_version=version+1,updated_at=?,published_at=? WHERE path=? AND version=? RETURNING *').bind(json,json,now,now,path,version) : db.prepare('UPDATE cms_documents SET draft=?,version=version+1,updated_at=? WHERE path=? AND version=? RETURNING *').bind(json,now,path,version);
 // D1 batches are transactional: a failed revision or update rolls back both.
 // The revision uses the same version predicate as the following update, so
 // a stale editor creates neither a new revision nor a document change.
 const results = await db.batch<DocumentRow>([
  db.prepare('INSERT OR IGNORE INTO cms_documents(path,draft,published,version,published_version,updated_at) VALUES(?,?,?,0,0,?)').bind(path,JSON.stringify(emptyConfig()),JSON.stringify(emptyConfig()),now),
  db.prepare('INSERT INTO cms_revisions(id,path,config,action,editor,created_at) SELECT ?,?,?,?,?,? FROM cms_documents WHERE path=? AND version=?').bind(crypto.randomUUID(),path,json,action,editor,now,path,version),
  update,
 ]);
 // RETURNING captures this write even if another editor saves immediately after.
 const row = results[2].results[0];
 return row ? documentFromRow(row) : null;
}
