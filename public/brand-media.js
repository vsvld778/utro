import {contactURL} from './brand-contact.js';
// Only bundled images replaced during the UTRO rebrand are versioned.
// Uploaded /media files and arbitrary external/custom URLs retain their identity.
export const BRAND_MEDIA_VERSION = 'utro-20261114';
const brandedMediaPaths = new Set([
 "/assets/benefit-bloating.jpg",
 "/assets/benefit-focus.jpg",
 "/assets/benefit-hydration.jpg",
 "/assets/benefit-liver.jpg",
 "/assets/gift-3.jpg",
 "/assets/hero-pouch.png",
 "/assets/lifestyle-pier.jpg",
 "/assets/logo-black.png",
 "/assets/logo-pink.png",
 "/assets/logo.png",
 "/assets/offer-original.png",
 "/assets/product-15.jpg",
 "/assets/product-30.jpg",
 "/assets/product-5.jpg",
 "/assets/product-facts.jpg",
 "/assets/product-gallery-7.jpg",
 "/assets/product-gallery-8.jpg",
 "/assets/product-lifestyle.jpg",
 "/assets/product-single.png",
 "/assets/review-1.jpg",
 "/assets/review-2.jpg",
 "/assets/review-3.jpg",
 "/assets/review-4.jpg",
 "/assets/review-5.jpg",
 "/assets/review-6.jpg",
 "/assets/step-1.jpg",
 "/assets/step-2.jpg",
 "/assets/step-3.jpg",
 "/reference/0784b50bda41-undo-gummies-pouch.png",
 "/reference/12bd7300259f-undo_lifestyle-3.jpg",
 "/reference/1a0b6e46c6b4-IMG_5624_1.jpg",
 "/reference/2192db01e139-Undo-15-pack.jpg",
 "/reference/3acbeec48df6-IMG_8419_1.jpg",
 "/reference/4584cc4c21f2-Untitled_design_c27e1d01-72b5-40ab-9d43-c31bdc4ae677.png",
 "/reference/45cd707230ee-undo-box.png",
 "/reference/4904f8deddf3-2035.jpg",
 "/reference/4bb7fe895384-image-8.jpg",
 "/reference/550dc81097d6-2030_1.jpg",
 "/reference/56be24b02849-UNDO_black.png",
 "/reference/5736374fc4a6-undo_pre_alcohol_gummies-12.jpg",
 "/reference/5cad16d79871-IMG_0623_1.jpg",
 "/reference/6027261e78c5-IMG_0740_1.jpg",
 "/reference/6297559ca910-2031.jpg",
 "/reference/635663933739-Undo-30-pack.jpg",
 "/reference/6ff5a61c9b22-UNDO_GUMMIES_GIRLS_PIER.jpg",
 "/reference/76399af5f4cd-undo_pre_alcohol_gummies-6.jpg",
 "/reference/773e45de799b-UNDO_pierplay-42.jpg",
 "/reference/77e080e3fb74-undo_pre_alcohol_gummies-13.jpg",
 "/reference/8e17373e2269-UNDO_pierplay.jpg",
 "/reference/8e6c4fb5b508-undo_lifestyle-11.jpg",
 "/reference/93dcd3c164a8-2031_1.jpg",
 "/reference/9d3c973e66c3-undo_lifestyle-10.jpg",
 "/reference/ae8d133d21eb-3-pack.jpg",
 "/reference/b2dbd51cae5f-IMG_1997_1.jpg",
 "/reference/be35ee22aca6-Undo-5-pack.jpg",
 "/reference/c3ee5f5e09c7-4_pack_supplement_facts.png",
 "/reference/c8d11b1dd314-undo_lifestyle-8_29fe9572-c74b-43c5-b287-5364490b96ba.jpg",
 "/reference/d16a85efac70-UNDNO_Gummies_-_Single_Pouch_1.png",
 "/reference/d9e2c07d16d3-2030.jpg",
 "/reference/e00662583d53-PINK_UNDO_1.png",
 "/reference/ec1fd4e95ec8-81mhxNFMbdL._AC_SL1500.jpg",
 "/reference/f4551a756cc9-undo_pre_alcohol_gummies-1.jpg",
 "/reference/f6709b7a363e-2034.jpg",
 "/reference/f78e96001114-716pIetA1CL._AC_SL1500.jpg",
 "/reference/fb5a9598b421-2034_1.jpg"
]);

export function brandMediaURL(value) {
 if (typeof value !== 'string' || !brandedMediaPaths.has(value.split(/[?#]/, 1)[0])) return value;
 const url = new URL(value, 'https://local.invalid');
 url.searchParams.set('brand', BRAND_MEDIA_VERSION);
 return url.pathname + url.search + url.hash;
}

export function brandMediaSrcset(value) {
 return String(value).replace(/(^|[\s,])(\/(?:assets|reference)\/[^\s,]+)/g,
  (_, separator, url) => separator + brandMediaURL(url));
}

// Match captured defaults exactly. An owner's independently edited links stay intact.
const legacyShareLinks = new Map([
 [
  "//www.facebook.com/sharer.php?u=https://www.undogummies.com/blogs/news/remedies-for-hangovers",
  "/blogs/news/remedies-for-hangovers"
 ],
 [
  "//twitter.com/share?text=WHY%20DHM%20IS%20SO%20GREAT&url=https://www.undogummies.com/blogs/news/remedies-for-hangovers",
  "/blogs/news/remedies-for-hangovers"
 ],
 [
  "//pinterest.com/pin/create/button/?url=https://www.undogummies.com/blogs/news/remedies-for-hangovers&media=//www.undogummies.com/cdn/shop/articles/undo_pre_alcohol_gummies-19.jpg?v=1758636170&width=1024&description=WHY%20DHM%20IS%20SO%20GREAT",
  "/blogs/news/remedies-for-hangovers"
 ],
 [
  "//www.facebook.com/sharer.php?u=https://www.undogummies.com/blogs/news/enjoy-a-night-out",
  "/blogs/news/enjoy-a-night-out"
 ],
 [
  "//twitter.com/share?text=HANGOVER%20TIPS%20AND%20TRICKS&url=https://www.undogummies.com/blogs/news/enjoy-a-night-out",
  "/blogs/news/enjoy-a-night-out"
 ],
 [
  "//pinterest.com/pin/create/button/?url=https://www.undogummies.com/blogs/news/enjoy-a-night-out&media=//www.undogummies.com/cdn/shop/articles/undo_lifestyle-11.jpg?v=1758636205&width=1024&description=HANGOVER%20TIPS%20AND%20TRICKS",
  "/blogs/news/enjoy-a-night-out"
 ],
 [
  "//www.facebook.com/sharer.php?u=https://www.undogummies.com/blogs/news/science-behind-dhm",
  "/blogs/news/science-behind-dhm"
 ],
 [
  "//twitter.com/share?text=UNDO%E2%80%99S%20FAVORITE%20COCKTAILS&url=https://www.undogummies.com/blogs/news/science-behind-dhm",
  "/blogs/news/science-behind-dhm"
 ],
 [
  "//pinterest.com/pin/create/button/?url=https://www.undogummies.com/blogs/news/science-behind-dhm&media=//www.undogummies.com/cdn/shop/articles/undo_pre_alcohol_gummies-12.jpg?v=1758636189&width=1024&description=UNDO%E2%80%99S%20FAVORITE%20COCKTAILS",
  "/blogs/news/science-behind-dhm"
 ]
]);
const articleImages = {
 '/blogs/news/remedies-for-hangovers': '/assets/product-15.jpg',
 '/blogs/news/enjoy-a-night-out': "/reference/8e6c4fb5b508-undo_lifestyle-11.jpg",
 '/blogs/news/science-behind-dhm': "/reference/5736374fc4a6-undo_pre_alcohol_gummies-12.jpg"
};

export function brandShareURL(value, {origin, path, title} = {}) {
 value = contactURL(value);
 if (typeof value !== 'string') return value;
 const route = legacyShareLinks.get(value.replace(/&amp;/g, '&'));
 if (!route || !origin) return value;
 try {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol)) return value;
  const currentPath = path === route || path === '/en' + route ? path : route;
  const target = new URL(currentPath, base.origin).href;
  const share = new URL(value.replace(/&amp;/g, '&'), base.origin);
  if (share.hostname === 'www.facebook.com') share.searchParams.set('u', target);
  else {
   share.searchParams.set('url', target);
   if (share.hostname === 'twitter.com') share.searchParams.set('text', title || 'UTRO');
   else {
    share.searchParams.set('description', title || 'UTRO');
    share.searchParams.set('media', new URL(brandMediaURL(articleImages[route]), base.origin).href);
    share.searchParams.delete('width');
   }
  }
  return share.href;
 } catch { return value; }
}

