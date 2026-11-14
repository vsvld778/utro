import {loadProfile,saveProfile,PROFILE_KEY,escapeHTML as esc} from './account-model.js';
const $=s=>document.querySelector(s);
let profile;try{profile=loadProfile(localStorage)}catch{profile=loadProfile({getItem:()=>null})}
function renderProfile(){
 const greeting=$('[data-profile-greeting]');if(greeting)greeting.textContent=profile.firstName?', '+profile.firstName:'';
 const contact=$('[data-contact-summary]');if(contact){
 const lines=[(profile.firstName+' '+profile.lastName).trim(),profile.email,profile.phone].filter(Boolean);
 contact.innerHTML=lines.length?lines.map(s=>'<p>'+esc(s)+'</p>').join(''):'<p class="account-muted">Контактные данные пока не добавлены.</p>';
 }
 const address=$('[data-address-summary]');if(address){const lines=[profile.city,profile.street,profile.postalCode].filter(Boolean);address.innerHTML=lines.length?lines.map(s=>'<p>'+esc(s)+'</p>').join(''):'<p class="account-muted">Адреса пока нет.</p>';const edit=$('[data-edit="address"]');if(edit)edit.textContent=lines.length?'Редактировать':'Добавить';}
}
renderProfile();
let modal,opener;
function close(){modal?.close();modal?.remove();modal=null;opener?.focus();}
function edit(kind,trigger){
 opener=trigger;modal=document.createElement('dialog');modal.className='account-edit-dialog';modal.setAttribute('aria-labelledby','edit-title');
 const fields=kind==='contact'?[['firstName','Имя','given-name'],['lastName','Фамилия','family-name'],['email','Электронная почта','email'],['phone','Телефон','tel']]:[['city','Город','address-level2'],['street','Улица, дом, квартира','street-address'],['postalCode','Почтовый индекс','postal-code']];
 modal.innerHTML='<form data-account-form><div class="account-section-title"><h2 id="edit-title">'+(kind==='contact'?'Контактные данные':'Адрес доставки')+'</h2><button class="account-dialog-close" type="button" aria-label="Закрыть">×</button></div><p class="account-muted">Сохраняется только в этом браузере. Не вводите данные на общем устройстве.</p><div class="account-fields">'+fields.map(([key,label,autocomplete])=>'<label>'+label+'<input name="'+key+'" type="'+(key==='email'?'email':key==='phone'?'tel':'text')+'" autocomplete="'+autocomplete+'" maxlength="'+(key==='street'?200:key==='email'?160:120)+'" value="'+esc(profile[key])+'"></label>').join('')+'</div><p class="account-status" role="status"></p><div class="account-form-actions"><button class="account-button" type="submit">Сохранить</button><button class="account-text-button" type="button" data-cancel>Отмена</button></div></form>';
 document.body.append(modal);modal.showModal();
 modal.querySelector('input')?.focus();
 modal.querySelector('.account-dialog-close').onclick=close;modal.querySelector('[data-cancel]').onclick=close;
 modal.addEventListener('cancel',e=>{e.preventDefault();close()});
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.querySelector('form').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));try{profile=saveProfile(localStorage,{...profile,...values});renderProfile();close();$('#account-status').textContent='Данные сохранены в этом браузере.';}catch{modal.querySelector('[role="status"]').textContent='Браузер не разрешает сохранение. Проверьте настройки хранилища и повторите.'}};
}
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit,b));
$('[data-clear-profile]')?.addEventListener('click',()=>{
 if(!confirm('Удалить сохранённые в этом браузере данные профиля? Корзина останется.'))return;
 try{localStorage.removeItem(PROFILE_KEY);profile=loadProfile(localStorage);renderProfile();$('#account-status').textContent='Данные профиля удалены.'}catch{$('#account-status').textContent='Не удалось удалить данные. Проверьте настройки браузера.'}
});
$('[data-open-cart]')?.addEventListener('click',()=>$('#CartButton')?.click());
if(document.body.dataset.accountPage==='cart')$('#CartButton')?.click();
