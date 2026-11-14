export const PROFILE_KEY='utro-guest-profile-v1';
export function cleanProfile(value={}) {
 const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 return {firstName:text(value.firstName,80),lastName:text(value.lastName,80),email:text(value.email,160),phone:text(value.phone,40),
 city:text(value.city,120),street:text(value.street,200),postalCode:text(value.postalCode,20)};
}
export function loadProfile(storage) {try{return cleanProfile(JSON.parse(storage.getItem(PROFILE_KEY)||'{}'))}catch{return cleanProfile()}}
export function saveProfile(storage,value){const profile=cleanProfile(value);storage.setItem(PROFILE_KEY,JSON.stringify(profile));return profile}
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
