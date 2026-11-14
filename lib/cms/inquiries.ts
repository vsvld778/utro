export type InquiryLocale = 'ru' | 'en';
export type Inquiry = { type:'newsletter'|'contact'; email:string; name:string; message:string; locale:InquiryLocale };
export const MAX_INQUIRY_BYTES = 30_000;
export const INQUIRY_COOLDOWN_MS = 60_000;
export const INQUIRY_BURST_LIMIT = 30;
const messages = {
  origin: ['Недопустимый источник запроса.', 'This request could not be verified.'],
  format: ['Некорректный формат заявки.', 'Invalid request format.'],
  large: ['Сообщение слишком длинное.', 'Your message is too long.'],
  email: ['Укажите корректный адрес электронной почты.', 'Please enter a valid email address.'],
  name: ['Имя должно содержать не более 200 символов.', 'Your name must be no longer than 200 characters.'],
  message: ['Сообщение должно содержать не более 10 000 символов.', 'Your message must be no longer than 10,000 characters.'],
  rate: ['Слишком много заявок. Попробуйте ещё раз через минуту.', 'Too many requests. Please try again in a minute.'],
  success: ['Спасибо! Ваша заявка принята.', 'Thank you! Your request has been received.'],
  unavailable: ['Не удалось отправить заявку. Попробуйте позже.', 'Your request could not be sent. Please try again later.'],
} as const;
export function inquiryMessage(key:keyof typeof messages, locale:InquiryLocale) { return messages[key][locale === 'en' ? 1 : 0]; }
export class InquiryError extends Error {
  constructor(public status:number, key:keyof typeof messages, public locale:InquiryLocale) { super(inquiryMessage(key, locale)); }
}
export function inquiryLocale(request:Request):InquiryLocale {
  try {
    const source = new URL(request.headers.get('referer') || request.url);
    return source.origin === new URL(request.url).origin && /^\/en(?:\/|$)/.test(source.pathname) ? 'en' : 'ru';
  } catch { return 'ru'; }
}
function normalizedEmail(value:unknown, locale:InquiryLocale):string {
  if (typeof value !== 'string') throw new InquiryError(400, 'email', locale);
  const email = value.trim().toLowerCase(), parts = email.split('@');
  if (email.length > 254 || parts.length !== 2 || parts[0].length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0]) || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..') || !/^[\p{L}\p{N}.-]+$/u.test(parts[1])) throw new InquiryError(400, 'email', locale);
  let domain;
  try { domain = new URL('https://' + parts[1]).hostname; } catch { throw new InquiryError(400, 'email', locale); }
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new InquiryError(400, 'email', locale);
  const normalized = parts[0] + '@' + domain;
  if (normalized.length > 254) throw new InquiryError(400, 'email', locale);
  return normalized;
}
export function validateInquiry(data:unknown, fallbackLocale:InquiryLocale = 'ru'):Inquiry {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new InquiryError(400, 'format', fallbackLocale);
  const input = data as Record<string,unknown>;
  const locale = input.locale === 'en' || input.locale === 'ru' ? input.locale : fallbackLocale;
  if (Object.keys(input).some(key => !['type','email','name','message','locale'].includes(key)) || input.locale !== undefined && input.locale !== 'ru' && input.locale !== 'en' || input.type !== 'newsletter' && input.type !== 'contact') throw new InquiryError(400, 'format', locale);
  const text = (value:unknown, max:number, key:'name'|'message') => {
    if (value === undefined) return '';
    if (typeof value !== 'string' || value.length > max || (key === 'name' ? /[\u0000-\u001f\u007f]/ : /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/).test(value)) throw new InquiryError(400, key, locale);
    return value.trim();
  };
  return { type:input.type, email:normalizedEmail(input.email, locale), name:text(input.name, 200, 'name'), message:text(input.message, 10000, 'message'), locale };
}
export async function parseInquiryRequest(request:Request):Promise<Inquiry> {
  const locale = inquiryLocale(request);
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new InquiryError(403, 'origin', locale);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new InquiryError(415, 'format', locale);
  if (Number(request.headers.get('content-length')) > MAX_INQUIRY_BYTES) throw new InquiryError(413, 'large', locale);
  if (!request.body) throw new InquiryError(400, 'format', locale);
  const reader = request.body.getReader(), decoder = new TextDecoder('utf-8', { fatal:true });
  let size = 0, text = '';
  try {
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_INQUIRY_BYTES) { await reader.cancel().catch(() => {}); throw new InquiryError(413, 'large', locale); }
      text += decoder.decode(value, {stream:true});
    }
    text += decoder.decode();
    return validateInquiry(JSON.parse(text), locale);
  } catch (error) {
    if (error instanceof InquiryError) throw error;
    throw new InquiryError(400, 'format', locale);
  } finally { reader.releaseLock(); }
}

// A single SQLite/D1 write checks both limits and inserts atomically. Two
// concurrent requests cannot both pass an earlier, separately issued SELECT.
export const INSERT_INQUIRY_SQL = `INSERT INTO cms_inquiries(id,type,email,name,message,created_at)
SELECT ?,?,?,?,?,?
WHERE NOT EXISTS (
  SELECT 1 FROM cms_inquiries WHERE created_at>? AND lower(email)=? AND type=?
) AND (SELECT count(*) FROM cms_inquiries WHERE created_at>?)<?
RETURNING id`;
export function inquiryInsertParameters(inquiry:Inquiry, id:string, now = new Date()) {
  const since = new Date(now.getTime() - INQUIRY_COOLDOWN_MS).toISOString();
  return [id, inquiry.type, inquiry.email, inquiry.name, inquiry.message, now.toISOString(), since, inquiry.email, inquiry.type, since, INQUIRY_BURST_LIMIT] as const;
}
