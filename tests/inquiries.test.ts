import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { InquiryError, INSERT_INQUIRY_SQL, inquiryInsertParameters, inquiryLocale, inquiryMessage, parseInquiryRequest, validateInquiry } from '../lib/cms/inquiries';

const input = { type:'newsletter', email:'  Person@Example.COM  ' };
const origin = 'https://shop.example';
function request(body:unknown, headers:Record<string,string> = {}) {
  return new Request(origin + '/api/inquiries', { method:'POST', headers:{Origin:origin,'Content-Type':'application/json',...headers}, body:typeof body === 'string' ? body : JSON.stringify(body) });
}
test('anonymous same-origin JSON is accepted without cookies; email is normalized', async () => {
  const inquiry = await parseInquiryRequest(request(input));
  assert.equal(inquiry.email,'person@example.com');assert.equal(inquiry.locale,'ru');
  assert.equal(validateInquiry({...input,email:'person@почта.рф'}).email,'person@xn--80a1acny.xn--p1ai');
});
test('foreign origin and non-JSON submissions are rejected before processing', async () => {
  for(const headers of [{Origin:'https://outside.example'},{Origin:''}]) await assert.rejects(parseInquiryRequest(request(input,headers)),(e:unknown)=>e instanceof InquiryError&&e.status===403);
  await assert.rejects(parseInquiryRequest(request(input,{'Content-Type':'text/plain'})),(e:unknown)=>e instanceof InquiryError&&e.status===415);
});
test('validation rejects unknown fields, bad types, malformed email and excessive strings', () => {
  for(const data of [null,[],{...input,extra:true},{...input,type:'other'},{...input,locale:'fr'},{...input,email:'name@invalid'},{...input,email:'.name@example.com'},{...input,email:'name@example-.com'},{...input,name:12},{...input,name:'x'.repeat(201)},{...input,message:'x'.repeat(10001)},{...input,message:'bad\u0000text'}]) assert.throws(()=>validateInquiry(data),InquiryError);
  assert.equal(validateInquiry({...input,type:'contact',name:' Всеволод ',message:'Строка 1\nСтрока 2'}).name,'Всеволод');
});
test('UTF-8 body limit works with absent or inaccurate Content-Length', async () => {
  const payload = JSON.stringify({...input,message:'я'.repeat(16000)});
  await assert.rejects(parseInquiryRequest(request(payload)),(e:unknown)=>e instanceof InquiryError&&e.status===413);
  await assert.rejects(parseInquiryRequest(request(payload,{'Content-Length':'12'})),(e:unknown)=>e instanceof InquiryError&&e.status===413);
  await assert.rejects(parseInquiryRequest(request('{broken json')),InquiryError);
});
test('locale comes from the matching page or explicit locale; success copy makes no email promise', async () => {
  const english = request(input,{Referer:origin+'/en/pages/contact'});
  assert.equal(inquiryLocale(english),'en');assert.equal((await parseInquiryRequest(english)).locale,'en');
  assert.equal((await parseInquiryRequest(request({...input,locale:'en'}))).locale,'en');
  assert.equal(inquiryLocale(request(input,{Referer:'https://foreign.example/en/'})),'ru');
  assert.equal(inquiryMessage('success','ru'),'Спасибо! Ваша заявка принята.');
  assert.equal(inquiryMessage('success','en'),'Thank you! Your request has been received.');
});
test('single SQLite statement enforces duplicate cooldown and global burst limit atomically', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('../drizzle/0000_messy_blockbuster.sql',import.meta.url),'utf8'));
    db.exec(readFileSync(new URL('../drizzle/0001_inquiry_limits.sql',import.meta.url),'utf8'));
    const insert=db.prepare(INSERT_INQUIRY_SQL), now=new Date('2026-11-09T00:00:00Z');
    const save=(email:string,id:string,date=now)=>insert.all(...inquiryInsertParameters(validateInquiry({...input,email}),id,date));
    assert.equal(save('a@example.com','first').length,1);
    assert.equal(save(' A@EXAMPLE.COM ','duplicate').length,0);
    for(let i=1;i<30;i++) assert.equal(save(`user${i}@example.com`,`entry${i}`).length,1);
    assert.equal(save('overflow@example.com','overflow').length,0);
    assert.equal((db.prepare('SELECT count(*) AS n FROM cms_inquiries').get() as {n:number}).n,30);
    assert.equal(save('a@example.com','later',new Date(now.getTime()+60_001)).length,1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='index' AND name='cms_inquiries_created_at_idx'").get()?.n,1);
  } finally { db.close(); }
});
