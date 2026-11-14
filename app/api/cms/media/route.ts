import {env} from 'cloudflare:workers';
import { adminIdentity, fail, sameOrigin } from '../../../../lib/cms/auth';
import { database } from '../../../../lib/cms/store';
export const dynamic='force-dynamic';
const MAX=8*1024*1024;
export async function GET(){if(!await adminIdentity())return fail('Доступ запрещён',403);return Response.json((await database().prepare('SELECT * FROM cms_media ORDER BY created_at DESC LIMIT 200').all()).results,{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 if(!await adminIdentity())return fail('Доступ запрещён',403);
 if(!sameOrigin(request))return fail('Недопустимый источник',403);
 if(Number(request.headers.get('content-length'))>MAX+10000)return fail('Максимум 8 МБ',413);
 const form=await request.formData();const file=form.get('file');
 if(!(file instanceof File)||file.size>MAX||file.size===0)return fail('Выберите изображение до 8 МБ');
 const bytes=new Uint8Array(await file.arrayBuffer());let mime='';let ext='';
 if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47){mime='image/png';ext='png';}
 else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff){mime='image/jpeg';ext='jpg';}
 else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){mime='image/webp';ext='webp';}
 else if(['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6)))){mime='image/gif';ext='gif';}
 else return fail('Поддерживаются PNG, JPEG, WebP и GIF. SVG не допускается.');
 if(!env.BUCKET)return fail('Хранилище изображений недоступно',503);
 const id=crypto.randomUUID()+'.'+ext;
 await env.BUCKET.put('media/'+id,bytes,{httpMetadata:{contentType:mime}});
 await database().prepare('INSERT INTO cms_media(id,name,mime,size,created_at) VALUES(?,?,?,?,?)').bind(id,file.name.slice(0,200),mime,file.size,new Date().toISOString()).run();
 return Response.json({id,url:'/media/'+id,name:file.name});
}
