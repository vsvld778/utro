// Captured contact details belong to the original source store, not UTRO.
// Route those exact defaults to our existing contact form; never invent an email.
const legacyContactPhrases = new Map(Object.entries({
 "Если вы по любой причине недовольны покупкой, напишите нам по адресу": "Если вы по любой причине недовольны покупкой, напишите нам через",
 "Пожалуйста, проверьте заказ при получении и сразу напишите нам по адресу": "Пожалуйста, проверьте заказ при получении и сразу напишите нам через",
 "После одобрения запроса деньги будут автоматически возвращены тем же способом оплаты в течение 10 рабочих дней. Учтите, что вашему банку или эмитенту карты может потребоваться дополнительное время на обработку и зачисление возврата. Если с момента одобрения прошло более 15 рабочих дней, напишите нам по адресу": "После одобрения запроса деньги будут автоматически возвращены тем же способом оплаты в течение 10 рабочих дней. Учтите, что вашему банку или эмитенту карты может потребоваться дополнительное время на обработку и зачисление возврата. Если с момента одобрения прошло более 15 рабочих дней, напишите нам через"
}));
export function contactText(value) {
 const text = String(value), trimmed = text.trim();
 if (legacyContactPhrases.has(trimmed)) return text.replace(trimmed, legacyContactPhrases.get(trimmed));
 return text
  .replaceAll('по адресу: info@undogummies.com', 'через форму обратной связи на странице «Контакты»')
  .replaceAll('по адресу info@undogummies.com', 'через форму обратной связи на странице «Контакты»')
  .replaceAll('info@undogummies.com', 'форму обратной связи')
  .replaceAll('посещаете www.undogummies.com', 'посещаете сайт UTRO');
}
export function contactURL(value) {
 return typeof value === 'string' && value.toLowerCase() === 'mailto:info@undogummies.com' ? '/pages/contact' : value;
}
export function contactMarkup(html) {
 // Normalize text nodes while leaving script/style payloads and asset URLs intact.
 return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]+>|[^<]+/gi, part => {
  if (part.startsWith('<')) return part;
  return contactText(part);
 });
}
