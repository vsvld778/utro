import localized_pages_default from "../../reference/localized-pages.json" with {type:"json"};
import {contactText,contactMarkup,contactURL} from "../../public/brand-contact.js";

// lib/cms/pages.ts
var pages = localized_pages_default;
var paths = Object.keys(pages);
function knownPath(path) {
  if (Object.prototype.hasOwnProperty.call(pages, path)) return path;
  try {
    const decoded = decodeURIComponent(path);
    return paths.find((candidate) => decodeURIComponent(candidate) === decoded) || null;
  } catch {
    return null;
  }
}
function resolvePagePath(path) {
  if (russianRedirectPath(path) !== null) return null;
  const clean = canonicalPath(path);
  const product = clean.match(/^\/collections\/[^/]+(\/products\/.+)$/);
  return product && knownPath(product[1]) || knownPath(clean);
}
function russianRedirectPath(path) {
  let decoded;
  try {
    decoded = decodeURIComponent(path).replace(/\\/g, "/");
  } catch {
    return null;
  }
  if (decoded !== "/en" && !decoded.startsWith("/en/")) return null;
  const suffix = decoded.slice(3).replace(/^\/+/, "");
  return "/" + suffix.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
function pageLocale(path) {
  return path === "/en" || path.startsWith("/en/") ? "en" : "ru";
}
function canonicalPath(path) {
  return pageLocale(path) === "en" ? path.slice(3) || "/" : path;
}
function documentKey(path) {
  return path === "__settings" ? path : pageLocale(path) === "en" ? canonicalPath(path) : "/ru" + canonicalPath(path);
}
var editablePages = Object.entries(pages).filter(([path, page]) => page.locale === "ru" && resolvePagePath(path) === path);

// lib/cms/types.ts
var emptyConfig = () => ({ fields: {}, hidden: [], order: [] });
var defaultPrices = { "5": { once: 19e4, monthly: 17e4, base: 2e5 }, "15": { once: 49e4, monthly: 45e4, base: 55e4 }, "30": { once: 99e4, monthly: 95e4, base: 1e6 } };
var defaultCartSettings = () => ({
  promotion: { enabled: true, code: "BF20", percent: 20 },
  gift: { enabled: true, title: "UTRO Gummies\xAE Pre-Alcohol Support - 3 Pack", image: "/reference/ae8d133d21eb-3-pack.jpg", value: 1500 },
  emptyText: "Your cart is currently empty."
});
var defaultIntegrations = () => ({ checkout: { enabled: false, provider: "\u041F\u043B\u0430\u0442\u0451\u0436\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0438\u0441", links: { "5_once": "", "15_once": "", "30_once": "", "5_monthly": "", "15_monthly": "", "30_monthly": "" }, cartUrl: "" }, accounts: { enabled: false, url: "", subscriptionUrl: "" }, map: { enabled: false, mode: "iframe", url: "" } });

// lib/cms/validation.ts
function validateConfig(value, page) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A");
  const config = emptyConfig();
  const known = new Map((page?.fields || []).map((f) => [f.id, f]));
  if (!value.fields || typeof value.fields !== "object" || Array.isArray(value.fields)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u043B\u044F");
  if (Object.keys(value.fields).length > 3e3) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u0435\u0439");
  for (const [id, v] of Object.entries(value.fields)) {
    const field = known.get(id);
    if (!field || typeof v !== "string" || v.length > 2e4) throw new Error("\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u043F\u043E\u043B\u0435");
    if (field.kind === "image" && !safeImage(v)) throw new Error("\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0443 \u0438\u043B\u0438 HTTPS URL");
    if (field.kind === "link" && !safeLink(v)) throw new Error("\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0441\u0441\u044B\u043B\u043A\u0438");
    config.fields[id] = v;
  }
  const sections = new Set(page?.sections.map((s) => s.id) || []);
  for (const key of ["hidden", "order"]) {
    if (!Array.isArray(value[key]) || value[key].some((id) => typeof id !== "string" || !sections.has(id))) throw new Error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0431\u043B\u043E\u043A");
    config[key] = [...new Set(value[key])];
  }
  if (value.title !== void 0) {
    if (typeof value.title !== "string" || value.title.length > 200) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A");
    config.title = value.title;
  }
  if (value.cartSettings !== void 0) {
    if (page) throw new Error("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u0440\u0437\u0438\u043D\u044B \u0438\u0437\u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0422\u043E\u0432\u0430\u0440\u044B \u0438 \u0446\u0435\u043D\u044B\xBB");
    config.cartSettings = validateCartSettings(value.cartSettings);
  }
  if (!page) {
    if (value.integrations) {
      let url2 = function(v2) {
        if (typeof v2 !== "string" || v2.length > 4096 || v2 !== "" && (!/^https:\/\//i.test(v2) || !isURL(v2))) throw new Error("\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438: \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u043B\u043D\u044B\u0439 HTTPS URL");
        return v2;
      };
      var url = url2;
      const v = value.integrations, output = defaultIntegrations();
      if (!v.checkout || !v.accounts || !v.map) throw new Error("\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0439");
      output.checkout.enabled = v.checkout.enabled === true;
      output.checkout.provider = String(v.checkout.provider || "\u041F\u043B\u0430\u0442\u0451\u0436\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0438\u0441").slice(0, 80);
      output.checkout.cartUrl = url2(v.checkout.cartUrl || "");
      for (const key of Object.keys(output.checkout.links)) output.checkout.links[key] = url2(v.checkout.links?.[key] || "");
      if (output.checkout.enabled && !output.checkout.cartUrl && !Object.values(output.checkout.links).some(Boolean)) throw new Error("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043F\u043B\u0430\u0442\u0451\u0436\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443");
      output.accounts = { enabled: v.accounts.enabled === true, url: url2(v.accounts.url || ""), subscriptionUrl: url2(v.accounts.subscriptionUrl || "") };
      if (output.accounts.enabled && !output.accounts.url && !output.accounts.subscriptionUrl) throw new Error("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430");
      output.map = { enabled: v.map.enabled === true, mode: v.map.mode === "link" ? "link" : "iframe", url: url2(v.map.url || "") };
      if (output.map.enabled && !output.map.url) throw new Error("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 URL \u043A\u0430\u0440\u0442\u044B");
      config.integrations = output;
    }
    if (value.prices) {
      config.prices = {};
      for (const pack of ["5", "15", "30"]) {
        const p = value.prices[pack];
        if (!p || ["base", "once", "monthly"].some((k) => !Number.isInteger(p[k]) || p[k] <= 0 || p[k] > 1e8)) throw new Error("\u0426\u0435\u043D\u044B \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C\u0438 \u0441\u0443\u043C\u043C\u0430\u043C\u0438 \u0432 \u043A\u043E\u043F\u0435\u0439\u043A\u0430\u0445");
        config.prices[pack] = { base: p.base, once: p.once, monthly: p.monthly };
      }
    }
  }
  return config;
}
function validateCartSettings(value) {
  function record(v, keys, label) {
    if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).some((key) => !keys.includes(key))) throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u043F\u043E\u043B\u044F " + label);
    return v;
  }
  function text(v, max, label) {
    if (typeof v !== "string" || !v.trim() || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u043F\u043E\u043B\u0435 \xAB" + label + "\xBB");
    return v.trim();
  }
  function enabled(v) {
    if (typeof v !== "boolean") throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u043C\u0435\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u0430 \u0438\u043B\u0438 \u043D\u0435\u0442");
    return v;
  }
  const settings = record(value, ["promotion", "gift", "emptyText"], "\u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A");
  const promotion = record(settings.promotion, ["enabled", "code", "percent"], "\u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u0430");
  const gift = record(settings.gift, ["enabled", "title", "image", "value"], "\u043F\u043E\u0434\u0430\u0440\u043A\u0430");
  if (!Number.isInteger(promotion.percent) || Number(promotion.percent) < 0 || Number(promotion.percent) > 100) throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u0441\u043A\u0438\u0434\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u043E\u043C \u043E\u0442 0 \u0434\u043E 100");
  if (!Number.isInteger(gift.value) || Number(gift.value) <= 0 || Number(gift.value) > 1e8) throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u0430\u0440\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0439 \u0441\u0443\u043C\u043C\u043E\u0439 \u0432 \u043A\u043E\u043F\u0435\u0439\u043A\u0430\u0445");
  const image = text(gift.image, 4096, "\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u0430\u0440\u043A\u0430");
  if (!safeImage(image)) throw new Error("\u041A\u043E\u0440\u0437\u0438\u043D\u0430: \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 HTTPS URL");
  return {
    promotion: { enabled: enabled(promotion.enabled), code: text(promotion.code, 64, "\u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434"), percent: promotion.percent },
    gift: { enabled: enabled(gift.enabled), title: text(gift.title, 200, "\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0434\u0430\u0440\u043A\u0430"), image, value: gift.value },
    emptyText: text(settings.emptyText, 1e3, "\u0442\u0435\u043A\u0441\u0442 \u043F\u0443\u0441\u0442\u043E\u0439 \u043A\u043E\u0440\u0437\u0438\u043D\u044B")
  };
}
function safeImage(v) {
  return /^\/(?!\/)[\w\-./%?=&]+$/.test(v) || /^https:\/\//i.test(v) && isURL(v);
}
function safeLink(v) {
  return v === "" || /^#/.test(v) || /^\/(?!\/)/.test(v) && !/[\\\r\n]/.test(v) || /^https:\/\//i.test(v) && isURL(v) || /^mailto:[^\s<>]+@[^\s<>]+$/.test(v) || /^tel:[+\d ()-]+$/.test(v);
}
function isURL(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

// public/currency.js
var rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" });
function rubleText(value) {
  const amount = (number) => number.includes(".") ? number.replaceAll(",", " ").replace(".", ",") : number.replace(/,(?=\d{3}(?:,|$))/g, " ");
  return String(value).replace(/(?:\$|\bUSD)\s*(\d+(?:[.,]\d+)*)(?:\s*USD\b)?/gi, (_, number) => amount(number) + "\xA0\u20BD").replace(/(\d+(?:[.,]\d+)*)\s*USD\b/gi, (_, number) => amount(number) + "\xA0\u20BD");
}

// public/disclaimer.js
var replacements = {
  "\u042D\u0442\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0435 \u043E\u0446\u0435\u043D\u0438\u0432\u0430\u043B\u0438\u0441\u044C \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u0438\u0449\u0435\u0432\u044B\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0438 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0421\u0428\u0410 (FDA). \u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u043D\u0435 \u043F\u0440\u0435\u0434\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u0434\u043B\u044F \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438, \u043B\u0435\u0447\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u043A\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0439. \u041F\u0440\u0438 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0439, \u043F\u0440\u0438\u0451\u043C\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432, \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438\u043B\u0438 \u0433\u0440\u0443\u0434\u043D\u043E\u043C \u0432\u0441\u043A\u0430\u0440\u043C\u043B\u0438\u0432\u0430\u043D\u0438\u0438 \u043F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u0441 \u043A\u0432\u0430\u043B\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u043C \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u043C. \u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u0445. \u0423\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439\u0442\u0435 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E.": "\u0411\u0438\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0434\u043E\u0431\u0430\u0432\u043A\u0430 \u043A \u043F\u0438\u0449\u0435. \u041D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u043C \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u043E\u043C. \u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441 \u0432\u0440\u0430\u0447\u043E\u043C. \u0421\u043E\u0431\u043B\u044E\u0434\u0430\u0439\u0442\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044E \u0438 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F, \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435 \u043D\u0430 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435. \u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0432\u0437\u0440\u043E\u0441\u043B\u044B\u0445. \u0423\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439\u0442\u0435 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E.",
  "\u042D\u0442\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0435 \u043E\u0446\u0435\u043D\u0438\u0432\u0430\u043B\u0438\u0441\u044C \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u0438\u0449\u0435\u0432\u044B\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0438 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0421\u0428\u0410 (FDA). UNDO Gummies\xAE \u043D\u0435 \u043F\u0440\u0435\u0434\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u0434\u043B\u044F \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438, \u043B\u0435\u0447\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u043A\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0439.": "\u0411\u0438\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0434\u043E\u0431\u0430\u0432\u043A\u0430 \u043A \u043F\u0438\u0449\u0435. \u041D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u043C \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u043E\u043C. \u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441 \u0432\u0440\u0430\u0447\u043E\u043C. \u0421\u043E\u0431\u043B\u044E\u0434\u0430\u0439\u0442\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044E \u0438 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F, \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435 \u043D\u0430 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435. \u0423\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439\u0442\u0435 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E.",
  "\u042D\u0442\u0438 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0435 \u043E\u0446\u0435\u043D\u0438\u0432\u0430\u043B\u0438\u0441\u044C \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u0438\u0449\u0435\u0432\u044B\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0438 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u0421\u0428\u0410 (FDA). \u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u043D\u0435 \u043F\u0440\u0435\u0434\u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u0434\u043B\u044F \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0438, \u043B\u0435\u0447\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u043A\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0439. \u041F\u0440\u0438 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0439, \u043F\u0440\u0438\u0451\u043C\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432, \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0438\u043B\u0438 \u0433\u0440\u0443\u0434\u043D\u043E\u043C \u0432\u0441\u043A\u0430\u0440\u043C\u043B\u0438\u0432\u0430\u043D\u0438\u0438 \u043F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u043F\u0440\u043E\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u0441 \u043A\u0432\u0430\u043B\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u043C \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u043C \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u043C. \u0423\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439\u0442\u0435 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E.": "\u0411\u0438\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u0434\u043E\u0431\u0430\u0432\u043A\u0430 \u043A \u043F\u0438\u0449\u0435. \u041D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u043C \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u043E\u043C. \u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441 \u0432\u0440\u0430\u0447\u043E\u043C. \u0421\u043E\u0431\u043B\u044E\u0434\u0430\u0439\u0442\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044E \u0438 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F, \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0435 \u043D\u0430 \u0443\u043F\u0430\u043A\u043E\u0432\u043A\u0435. \u0423\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u044F\u0439\u0442\u0435 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044C \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E."
};
function disclaimerText(value) {
  const text = contactText(value);
  const normalized = text.replace(/&#(?:x0*a0|0*160);|&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  const starred = normalized.startsWith("*");
  const replacement = replacements[normalized.replace(/^\*\s*/, "")];
  return replacement ? (starred ? "* " : "") + replacement : text;
}

// public/brand.js
var protectedReference = /(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/[^\s<>"']+/gi;
var legacyBrand = /(?<![\p{L}\p{N}_])undo(?![\p{L}\p{N}_])/giu;
function brandText(value) {
  const text = contactText(value);
  let result = "", end = 0;
  for (const match of text.matchAll(protectedReference)) {
    result += text.slice(end, match.index).replace(legacyBrand, "UTRO") + match[0];
    end = match.index + match[0].length;
  }
  return result + text.slice(end).replace(legacyBrand, "UTRO");
}

// public/storefront-text.js
function storefrontText(value) {
  return rubleText(brandText(disclaimerText(value))).replace(/(?<![\p{L}\p{N}_])саше(?![\p{L}\p{N}_])/giu, (word) => word === word.toUpperCase() ? "\u0428\u0422" : "\u0448\u0442");
}

// public/brand-media.js
var BRAND_MEDIA_VERSION = "utro-20261114";
var brandedMediaPaths = /* @__PURE__ */ new Set([
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
function brandMediaURL(value) {
  if (typeof value !== "string" || !brandedMediaPaths.has(value.split(/[?#]/, 1)[0])) return value;
  const url = new URL(value, "https://local.invalid");
  url.searchParams.set("brand", BRAND_MEDIA_VERSION);
  return url.pathname + url.search + url.hash;
}
function brandMediaSrcset(value) {
  return String(value).replace(
    /(^|[\s,])(\/(?:assets|reference)\/[^\s,]+)/g,
    (_, separator, url) => separator + brandMediaURL(url)
  );
}
var legacyShareLinks = /* @__PURE__ */ new Map([
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
var articleImages = {
  "/blogs/news/remedies-for-hangovers": "/assets/product-15.jpg",
  "/blogs/news/enjoy-a-night-out": "/reference/8e6c4fb5b508-undo_lifestyle-11.jpg",
  "/blogs/news/science-behind-dhm": "/reference/5736374fc4a6-undo_pre_alcohol_gummies-12.jpg"
};
function brandShareURL(value, { origin, path, title } = {}) {
  value = contactURL(value);
  if (typeof value !== "string") return value;
  const route = legacyShareLinks.get(value.replace(/&amp;/g, "&"));
  if (!route || !origin) return value;
  try {
    const base = new URL(origin);
    if (!["https:", "http:"].includes(base.protocol)) return value;
    const currentPath = path === route || path === "/en" + route ? path : route;
    const target = new URL(currentPath, base.origin).href;
    const share = new URL(value.replace(/&amp;/g, "&"), base.origin);
    if (share.hostname === "www.facebook.com") share.searchParams.set("u", target);
    else {
      share.searchParams.set("url", target);
      if (share.hostname === "twitter.com") share.searchParams.set("text", title || "UTRO");
      else {
        share.searchParams.set("description", title || "UTRO");
        share.searchParams.set("media", new URL(brandMediaURL(articleImages[route]), base.origin).href);
        share.searchParams.delete("width");
      }
    }
    return share.href;
  } catch {
    return value;
  }
}

// lib/cms/render.ts
var esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var safeJSON = (data) => JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
function versionMedia(value) {
  if (typeof value === "string") return brandMediaURL(value);
  if (Array.isArray(value)) return value.map(versionMedia);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, versionMedia(item)]));
  return value;
}
function brandMarkup(html, context) {
  const withJSON = contactMarkup(html).replace(/(<script\b[^>]*\btype=["']application\/json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (whole, open, body, close) => {
    try {
      return open + safeJSON(versionMedia(JSON.parse(body))) + close;
    } catch {
      return whole;
    }
  });
  return withJSON.replace(/(\s)(src|srcset|poster|href)(\s*=\s*)(["'])(.*?)\4/gi, (whole, space, name, equals, quote, raw) => {
    const value = raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const next = name.toLowerCase() === "srcset" ? brandMediaSrcset(value) : name.toLowerCase() === "href" ? brandMediaURL(brandShareURL(value, context)) : brandMediaURL(value);
    return next === value ? whole : space + name + equals + quote + esc(next) + quote;
  });
}
function renderStorefront({ path, preview = false, config, settings, origin }) {
  const page = pages[path];
  if (!page) throw new Error("Page not found");
  const locale = pageLocale(path);
  const attributes = Object.entries(page.bodyAttributes || {}).filter(([key]) => /^(data-[\w-]+|dir)$/.test(key)).map(([key, value]) => `${key}="${esc(value)}"`).join(" ");
  const payload = { path, canonicalPath: canonicalPath(path), locale, preview, config, prices: settings.prices || defaultPrices, sections: page.sections, integrations: settings.integrations || defaultIntegrations(), cartSettings: settings.cartSettings || defaultCartSettings() };
  const title = storefrontText(config.title || page.title), context = { origin, path, title };
  return `<!doctype html><html lang="${locale}" class="js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>${brandMarkup(page.head, context)}<link rel="stylesheet" href="/storefront.css">${locale === "ru" ? '<link rel="stylesheet" href="/russian.css">' : ""}</head><body class="${esc(page.bodyClass)}" ${attributes}>${brandMarkup(page.body, context)}<script type="application/json" id="cms-state">${safeJSON(payload)}</script><script src="/storefront.js" type="module"></script></body></html>`;
}
export {
  defaultCartSettings,
  defaultIntegrations,
  defaultPrices,
  documentKey,
  editablePages,
  emptyConfig,
  pages,
  renderStorefront,
  resolvePagePath,
  russianRedirectPath,
  validateConfig
};
