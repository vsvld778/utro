import { adminIdentity, fail } from '../../../lib/cms/auth';
import { database } from '../../../lib/cms/store';
import { InquiryError, INSERT_INQUIRY_SQL, inquiryInsertParameters, inquiryLocale, inquiryMessage, parseInquiryRequest } from '../../../lib/cms/inquiries';
export const dynamic='force-dynamic';
export async function GET(){if(!await adminIdentity())return fail('Доступ запрещён',403);return Response.json((await database().prepare('SELECT * FROM cms_inquiries ORDER BY created_at DESC LIMIT 200').all()).results,{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 let locale=inquiryLocale(request);
 try{
  const inquiry=await parseInquiryRequest(request);locale=inquiry.locale;
  const inserted=await database().prepare(INSERT_INQUIRY_SQL).bind(...inquiryInsertParameters(inquiry,crypto.randomUUID())).first<{id:string}>();
  if(!inserted)throw new InquiryError(429,'rate',locale);
  return Response.json({ok:true,message:inquiryMessage('success',locale)},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof InquiryError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'60'}:{})}});
  return fail(inquiryMessage('unavailable',locale),500);
 }
}
