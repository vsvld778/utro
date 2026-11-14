import {Config,ReferencePage,CartSettings,emptyConfig,defaultIntegrations} from './types';
export function validateConfig(value: any, page?: ReferencePage): Config {
 if(!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Некорректный формат настроек');
 const config: Config = emptyConfig();
 const known = new Map((page?.fields || []).map(f=>[f.id,f]));
 if(!value.fields || typeof value.fields !== 'object' || Array.isArray(value.fields)) throw new Error('Некорректные поля');
 if(Object.keys(value.fields).length > 3000) throw new Error('Слишком много полей');
 for(const [id,v] of Object.entries(value.fields)) {
   const field = known.get(id); if(!field || typeof v !== 'string' || v.length > 20000) throw new Error('Недопустимое поле');
   if(field.kind === 'image' && !safeImage(v)) throw new Error('Изображение: используйте загрузку или HTTPS URL');
   if(field.kind === 'link' && !safeLink(v)) throw new Error('Недопустимый адрес ссылки');
   config.fields[id] = v;
 }
 const sections = new Set(page?.sections.map(s=>s.id) || []);
 for(const key of ['hidden','order'] as const) {
   if(!Array.isArray(value[key]) || value[key].some((id:any)=>typeof id!=='string'||!sections.has(id))) throw new Error('Неизвестный блок');
   config[key] = [...new Set<string>(value[key])];
 }
 if(value.title !== undefined) { if(typeof value.title!=='string'||value.title.length>200) throw new Error('Слишком длинный заголовок'); config.title=value.title; }
 if(value.cartSettings !== undefined) {
  if(page) throw new Error('Настройки корзины изменяются в разделе «Товары и цены»');
  config.cartSettings=validateCartSettings(value.cartSettings);
 }
 if(!page) {
  if(value.integrations) {
   const v=value.integrations, output=defaultIntegrations();
   function url(v:unknown){if(typeof v!=='string'||v.length>4096||v!==''&&(!/^https:\/\//i.test(v)||!isURL(v)))throw new Error('Интеграции: используйте полный HTTPS URL');return v;}
   if(!v.checkout||!v.accounts||!v.map)throw new Error('Неполные настройки интеграций');
   output.checkout.enabled=v.checkout.enabled===true;output.checkout.provider=String(v.checkout.provider||'Платёжный сервис').slice(0,80);output.checkout.cartUrl=url(v.checkout.cartUrl||'');
   for(const key of Object.keys(output.checkout.links))output.checkout.links[key]=url(v.checkout.links?.[key]||'');
   if(output.checkout.enabled&&!output.checkout.cartUrl&&!Object.values(output.checkout.links).some(Boolean))throw new Error('Добавьте хотя бы одну платёжную ссылку');
   output.accounts={enabled:v.accounts.enabled===true,url:url(v.accounts.url||''),subscriptionUrl:url(v.accounts.subscriptionUrl||'')};
   if(output.accounts.enabled&&!output.accounts.url&&!output.accounts.subscriptionUrl)throw new Error('Добавьте ссылку личного кабинета');
   output.map={enabled:v.map.enabled===true,mode:v.map.mode==='link'?'link':'iframe',url:url(v.map.url||'')};if(output.map.enabled&&!output.map.url)throw new Error('Добавьте URL карты');
   config.integrations=output;
  }
  if(value.prices) {
   config.prices={}; for(const pack of ['5','15','30']) { const p=value.prices[pack]; if(!p || ['base','once','monthly'].some(k=>!Number.isInteger(p[k])||p[k]<=0||p[k]>100000000)) throw new Error('Цены должны быть положительными суммами в копейках'); config.prices[pack]={base:p.base,once:p.once,monthly:p.monthly}; }
  }
 }
 return config;
}
function validateCartSettings(value:unknown): CartSettings {
 function record(v:unknown,keys:string[],label:string):Record<string,unknown> {
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(key=>!keys.includes(key))) throw new Error('Корзина: некорректные поля '+label);
  return v as Record<string,unknown>;
 }
 function text(v:unknown,max:number,label:string):string {
  if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v)) throw new Error('Корзина: некорректное поле «'+label+'»');
  return v.trim();
 }
 function enabled(v:unknown):boolean {if(typeof v!=='boolean')throw new Error('Корзина: переключатель должен иметь значение да или нет');return v;}
 const settings=record(value,['promotion','gift','emptyText'],'настроек');
 const promotion=record(settings.promotion,['enabled','code','percent'],'промокода');
 const gift=record(settings.gift,['enabled','title','image','value'],'подарка');
 if(!Number.isInteger(promotion.percent)||Number(promotion.percent)<0||Number(promotion.percent)>100)throw new Error('Корзина: скидка должна быть целым процентом от 0 до 100');
 if(!Number.isInteger(gift.value)||Number(gift.value)<=0||Number(gift.value)>100000000)throw new Error('Корзина: стоимость подарка должна быть положительной суммой в копейках');
 const image=text(gift.image,4096,'изображение подарка');
 if(!safeImage(image))throw new Error('Корзина: используйте загруженное изображение или HTTPS URL');
 return {
  promotion:{enabled:enabled(promotion.enabled),code:text(promotion.code,64,'промокод'),percent:promotion.percent as number},
  gift:{enabled:enabled(gift.enabled),title:text(gift.title,200,'название подарка'),image,value:gift.value as number},
  emptyText:text(settings.emptyText,1000,'текст пустой корзины'),
 };
}
export function safeImage(v:string) {return /^\/(?!\/)[\w\-./%?=&]+$/.test(v) || /^https:\/\//i.test(v)&&isURL(v);}
export function safeLink(v:string) {return v==='' || /^#/.test(v) || /^\/(?!\/)/.test(v)&&!/[\\\r\n]/.test(v) || /^https:\/\//i.test(v)&&isURL(v) || /^mailto:[^\s<>]+@[^\s<>]+$/.test(v) || /^tel:[+\d ()-]+$/.test(v);}
function isURL(v:string) { try{const u=new URL(v); return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;} }
