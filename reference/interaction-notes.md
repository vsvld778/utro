# Reference storefront interaction notes

Captured 9 November 2026 from publicly served `https://www.undogummies.com/` HTML and theme resources. No original executable JavaScript is included in the rendered capture. Original Shopify, customer-login, subscription, contact delivery, popup marketing and other service integrations do not carry over merely by copying the page.

## Rendering prerequisites

- Apply `bodyAttributes` from `pages.json`, particularly `data-color-scheme="scheme1"`. This selects the CSS color variables.
- Original HTML starts with `class="no-js"`; the runtime changes it to `js`. Without that change, `.js-enabled` cart/menu buttons remain hidden.
- There are 144 `[data-fade-in]` elements on home, mainly retailer logos. Set their opacity to 1 once ready (or implement the reveal observer), otherwise they remain invisible without the theme runtime.
- Original CSS hides `[x-cloak]` and `.splide` until initialization. Remove the cloak selectively from initialized accordions/purchase benefits, not globally from hidden dialog contents. Set `.splide.is-initialized`/`.is-rendered` (or appropriate own CSS) when prepared.
- Captured SVG has HTML-parser-lowercased `viewbox`; when parsed as HTML in SVG foreign content, browsers normalize that known SVG attribute back to `viewBox`. The captured SVG path, dimensions, fill and stroke values are intact.
- Head includes the original compiled styles, base theme bundle, ESA stylesheet, all inline theme colors/spacing/font faces. All 112 downloaded CSS/image/font files succeeded. CSS audit found zero remaining network `url(http...)` or `@import` dependencies.

## Announcements

`announcement-bar-rotator` has `data-interval="5"`, `data-duration="500"`, `data-pause-on-hover="true"`. Its `[data-track]` contains four `[data-slide]` children. Move the horizontal track by one 100%-width slide every five seconds; pause on hover and honor reduced motion. Texts in order are pre-Black-Friday offer, free 3-pack, free shipping threshold, money-back guarantee.

## Header / mobile navigation

- Header container: `.section-site-header .site-header`, with `[data-sticky-header]`, `#headerBorderWrap`, `#headerContainer`.
- Menu button: `button[data-menu-drawer-toggle]`; original `@click` is `$store.modals.open('nav')`.
- Desktop navigation: `ul[x-ref="navigation"]` inside `.hidden.lg\:block`.
- Mobile contents remain inert under `template[x-teleport="#left-drawer-slot"] .sidebar-nav` and contain SHOP, ABOUT, CONTACT, STORE LOCATOR plus account links. Clone the template content into the local dialog if desired. The original drawer slots are constructed by the original theme runtime, so no live `#left-drawer-slot` exists in the static HTML.
- Mobile close button: `.sidebar-nav button` with original `@click.prevent="$store.modals.close('nav')"`.
- Cart trigger: `#CartButton`. Original count is a nested `x-text="$store.cart_count.count"` expression.
- Account links are normalized to `/account`; the copy must handle that route with its own account/integration boundary.

## Product selection and CTA

- Product root: `[data-product-root]`; pack selector `.pack-selector`; pack radios `.pack-selector__radio`.
- Original configuration retained in `script[id^="PackSelectorConfigs-"]` and in `reference/product-data.json`. Each entry includes packIndex, packAmount, qty, unitPrice, planPct, oneTimePct, media and local image URLs. Packs are 5 (index 1), 15 (2), 30 (3). The 30-pack uses two 15-pack units.
- Selected pack class: `.pack-selector__item--selected` on `.pack-selector__item`. The checked radio is authoritative.
- Frequency root `.subscribe-save`; radios `.subscribe-save__radio`, values `subscribe` and `one_time`. Selected label gets `.subscribe-save__option--selected`.
- `.subscribe-save__title` with `x-text="currentSubscriptionLabel"` is normally Monthly Subscription.
- Prices are empty server-rendered spans. Inside each `.subscribe-save__price-wrap`, `.subscribe-save__compare` is the struck-through value, the following span is current price, and `.subscribe-save__per-unit` is per pouch. Formula: round(unitPrice × qty × (1 - discountPct / 100)). Monthly discounts are 10/15/20%; one-time 0/5/10%.
- `.subscribe-save__save-line span[x-text="currentSavingsPct"]` needs the percentage.
- `.subscribe-save__gift` is hidden for pack 5 and shown for 15/30. First benefit Free Shipping is hidden for 5; risk-free/cancel benefits are present for all three.
- Buy button is `button.add-to-cart-btn[type="submit"]`. Visible text is `.push-btn__surface > span[x-text="addToCartText"]`, fallback “Try Risk Free”. If handling unavailable products, original toggles `add-to-cart-btn--sold-out`, `cursor-not-allowed`, `disabled` and push-button classes.
- Original product form endpoint `/cart/add` has been made inert (`action="#"`); runtime must intercept locally.
- Main product image: `.splide--product [data-product-single-media-wrapper] img`. Thumbnails `.product-thumbnails-strip img` or `.splide--thumbnails .splide__list img` depending page. Preserve active thumbnail and image source when switching pack.

## Accordions

Product and FAQ both use `ul.undo-accordion`, `.undo-accordion__item`, `.undo-accordion__trigger`, `.undo-accordion__panel`. Trigger `aria-controls` points at a panel ID. The original `x-data="{ active: 0 }"` opens the first panel; opening another closes the previous one. Update `aria-expanded` and both plus/minus icon wrappers (their `x-show` expressions contain `active !== index` and `active === index`). Panels initially have `style="display:none"` and `x-collapse`.

## Carousels

Structure: `.splide > .splide__track > .splide__list > .splide__slide`, arrows `.splide__arrow--prev/--next`. Original settings are preserved separately at `reference/slideshow-options.json` keyed by route and root ID.

- Benefits: autoWidth, gap 1.25rem, type slide, no rewind, left focus, left padding 1.25rem; below 990 px arrows visible, above 990 px arrows hidden and right padding 1.25rem.
- How-to steps: mobile-only autoWidth, gap 2.5rem, rewind, left/right padding 1.25rem; destroyed at min-width 990 so desktop shows three columns.
- Reviews: loop, autoWidth, perMove 1, gap 1.25rem, rewind, left focus; left padding `calc(max(0px, (100vw - var(--max-site-width)) / 2) + var(--section-x-padding))`.
- Generic theme defaults: min media query; one per page/move; autoWidth; arrows; no pagination; rewind.
- Product theme options: slide, one per page/move, autoWidth, no pagination, arrows, rewind, drag unless `data-drag-disabled="true"`; original special handling changes at 990 px. Original main product is managed by its product component in addition to Splide.
- No standalone Splide URL exists in the HTML. Import map resolves named Splide exports from the combined `vendor.bundle.min.js` (also Alpine and plugins). That bundle has not been downloaded or executed. `inspect-global.bundle.js.txt` is a non-executed research copy showing original options.

## Mobile assets and external components

Hero uses `.undo-hero__background > .hidden.lg\:block` for desktop and sibling `.lg\:hidden` for mobile. Both image variants and their srcsets are local; original breakpoint is 990 px, not 700 px. Full source image bytes are stored once per canonical asset, with responsive descriptors retained.

Store locator requires Stockist, wholesale form requires Globo, affiliate form is injected by a third-party service. Their static page wrappers are captured, but runtime forms/maps need own implementations or an explicit integration boundary. Contact contains a real static `#ContactForm` but delivery is disconnected. Blog listing and all three linked article pages are captured. Article card links and previous/next navigation resolve locally. Internal collection-product alias `/collections/pre-alcohol-gummies/products/undo-hangover-gummies` should resolve to `/products/undo-hangover-gummies`.
