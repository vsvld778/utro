"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import "./information-pages.css";

type InfoPageProps = { page: string; onShop: () => void };

const ingredients = ["DHM", "MILK THISTLE", "B VITAMINS", "MAGNESIUM", "ZINC", "ELECTROLYTES"];

function PageIntro({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return <header className="info-intro"><p className="info-eyebrow">{kicker}</p><h1>{title}</h1>{children && <div className="info-lede">{children}</div>}</header>;
}

function PreviewForm({ wholesale = false }: { wholesale?: boolean }) {
  const id = useId();
  const [reviewed, setReviewed] = useState(false);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewed(true);
  }
  return <form className="info-form" onSubmit={handleSubmit} onChange={() => setReviewed(false)}>
    <div className="info-field-row">
      <label htmlFor={`${id}-name`}>Your name<input id={`${id}-name`} name="name" autoComplete="name" placeholder="First and last name" required maxLength={100} /></label>
      <label htmlFor={`${id}-email`}>Email address<input id={`${id}-email`} name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={200} /></label>
    </div>
    {wholesale && <label htmlFor={`${id}-business`}>Business name<input id={`${id}-business`} name="business" autoComplete="organization" placeholder="Your store or company" required maxLength={150} /></label>}
    <label htmlFor={`${id}-phone`}>Phone <span>(optional)</span><input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" placeholder="Your contact number" maxLength={40} /></label>
    <label htmlFor={`${id}-message`}>{wholesale ? "Tell us about your business" : "What can we help with?"}<textarea id={`${id}-message`} name="message" rows={5} placeholder={wholesale ? "Your location, store type, and the products you’re interested in…" : "Write your message here…"} required minLength={5} maxLength={4000} /></label>
    <button className="info-action" type="submit">{wholesale ? "PREVIEW ENQUIRY" : "PREVIEW MESSAGE"}<span aria-hidden="true">↗</span></button>
    <p className="info-form-note">Demo form. Information remains in this browser tab and is not sent.</p>
    {reviewed && <div className="info-form-result" role="status"><strong>Your preview is ready.</strong><p>The required fields are complete. No message has been sent and no details have been saved.</p></div>}
  </form>;
}

function About({ onShop }: Pick<InfoPageProps, "onShop">) {
  return <div className="info-page info-about">
    <section className="info-editorial">
      <div className="info-editorial-copy"><p className="info-eyebrow">THE UNDO IDEA</p><h1>A LITTLE POUCH.<br />A BIG NIGHT.</h1><p>A pocket-sized addition to your going-out routine. The original UNDO product brings its ingredient blend into a portable, fruit-flavoured gummy format.</p><p>This private storefront study recreates the brand’s bold visual world, from its pink packaging to its simple product choices.</p><button className="info-action" onClick={onShop}>EXPLORE THE GUMMIES <span aria-hidden="true">↗</span></button></div>
      <div className="info-editorial-art"><span className="info-art-type" aria-hidden="true">GO<br />UNDO.</span><img src="/assets/hero-pouch.png" alt="Pink UNDO gummy pouch" /></div>
    </section>
    <section className="info-formula">
      <div><p className="info-eyebrow">INSIDE THE ORIGINAL FORMULA</p><h2>GET TO KNOW<br />THE INGREDIENTS.</h2></div>
      <div><p>The reference product lists DHM, milk thistle, B vitamins, magnesium, zinc and an electrolyte blend. Check the original product label for amounts, directions and suitability.</p><div className="info-ingredients">{ingredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div><p className="info-small">Product names and ingredient information refer to the original UNDO product. This design preview does not independently verify the seller’s health claims.</p></div>
    </section>
    <section className="info-bottom-cta"><h2>YOUR NEXT NIGHT<br />STARTS HERE.</h2><button className="info-action info-action-light" onClick={onShop}>CHOOSE YOUR PACK <span aria-hidden="true">→</span></button></section>
  </div>;
}

function Contact({ onShop, wholesale }: Pick<InfoPageProps, "onShop"> & { wholesale?: boolean }) {
  return <div className="info-page info-contact">
    <PageIntro kicker={wholesale ? "LET’S STOCK UP" : "SAY HELLO"} title={wholesale ? "GOOD THINGS.\nGREAT PARTNERS." : "LET’S TALK."}><p>{wholesale ? "An enquiry space for retailers, hospitality venues and future partners." : "Questions about the product, your plans, or a possible collaboration? Start here."}</p></PageIntro>
    <div className="info-contact-grid"><aside><div className="info-aside-mark" aria-hidden="true">↗</div><h2>{wholesale ? "BRING UNDO\nTO YOUR SHELVES." : "WE’RE ALL\nABOUT CONNECTION."}</h2><p>{wholesale ? "Share a little about your business. This preview shows how a wholesale enquiry would look." : "Use the form to try the contact experience. The working preview keeps your message on this page."}</p><button className="info-text-action" onClick={onShop}>TAKE A LOOK AT THE PRODUCT <span aria-hidden="true">→</span></button></aside><PreviewForm wholesale={wholesale} /></div>
  </div>;
}

function Stores({ onShop }: Pick<InfoPageProps, "onShop">) {
  return <div className="info-page">
    <PageIntro kicker="OUT IN THE WORLD" title="FIND YOUR\nNEXT POUCH."><p>The reference store has a live stockist finder. Retail locations are managed by the original merchant.</p></PageIntro>
    <section className="info-store-panel"><div className="info-location-art" aria-hidden="true"><div className="info-location-pin">U</div><span>GOOD NIGHTS START SOMEWHERE.</span></div><div className="info-store-copy"><p className="info-eyebrow">STORE LOCATOR</p><h2>LOOKING FOR<br />THE ORIGINAL?</h2><p>Use the original store’s locator for its current retail locations. A separate location list can be connected when this storefront is adapted to your own brand.</p><a className="info-action" href="https://www.undogummies.com/pages/store-locator" target="_blank" rel="noreferrer">OPEN ORIGINAL LOCATOR <span aria-hidden="true">↗</span></a><button className="info-text-action" onClick={onShop}>EXPLORE THE PRODUCT <span aria-hidden="true">→</span></button></div></section>
  </div>;
}

const journalArticles = [
  { number: "01", category: "THE LITTLE DETAILS", title: "A POUCH THAT GOES WHERE YOU GO.", text: "Small product formats make for a simple packing list. This editorial space could tell the story of your packaging, the places it fits, and the thinking behind it.", colour: "pink" },
  { number: "02", category: "BEHIND THE LABEL", title: "WHAT’S INSIDE MATTERS.", text: "A clear ingredient guide gives customers room to understand a product. Your final article can explain the ingredients, amounts and information supported by your own approved label.", colour: "cream" },
  { number: "03", category: "THE SOCIAL SIDE", title: "MAKE ROOM FOR THE GOOD MOMENTS.", text: "Dinner with friends. A celebration. A long-awaited reunion. Use this space for your own brand stories, photography and the people behind the product.", colour: "dark" },
];

function Journal() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return <div className="info-page info-journal"><PageIntro kicker="THE JOURNAL · EDITORIAL PREVIEW" title="MORE TO\nTHE STORY."><p>Sample editorial layouts ready for your own stories.</p></PageIntro><div className="info-journal-grid">{journalArticles.map((article, index) => <article className="info-journal-card" key={article.number}><div className={`info-journal-art info-art-${article.colour}`} aria-hidden="true"><span>UNDO.</span><b>{article.number}</b></div><p className="info-eyebrow">{article.category}</p><h2>{article.title}</h2><button className="info-text-action" aria-expanded={expanded === index} aria-controls={`journal-preview-${index}`} onClick={() => setExpanded(expanded === index ? null : index)}>{expanded === index ? "CLOSE STORY" : "READ PREVIEW"} <span aria-hidden="true">{expanded === index ? "−" : "+"}</span></button>{expanded === index && <p id={`journal-preview-${index}`} className="info-journal-text">{article.text}</p>}</article>)}</div></div>;
}

const policyCopy: Record<string, { title: string; sections: [string, string][] }> = {
  privacy: { title: "YOUR PRIVACY.", sections: [["A private design preview", "This page is a demonstration of the storefront experience. Contact and newsletter forms do not send their contents to a merchant or subscribe you to marketing."], ["Shopping preferences", "The demonstration may remember your cart in this browser so you can explore the interface. No payment details are requested by this storefront."], ["External websites", "Links to the original UNDO website open a separate service governed by that service’s own privacy terms."]] },
  terms: { title: "PREVIEW TERMS.", sections: [["For review only", "This is a private recreation for reviewing the visual design and storefront interactions. It is not the official UNDO shop."], ["No commercial orders", "Product selection and cart controls demonstrate the experience. This preview does not process orders, take payments or establish a paid subscription."], ["Brand and product content", "UNDO branding and reference imagery belong to their respective owners. Final commercial content, product statements and terms must match the business operating the finished storefront."]] },
  shipping: { title: "DELIVERY &\nRETURNS.", sections: [["Demonstration storefront", "No products are sold or shipped through this preview. Delivery estimates and return terms are not offered here."], ["For the original product", "Consult the original UNDO store for its current delivery coverage, shipping charges and refund conditions."], ["For your future store", "The finished storefront can show your actual fulfilment regions, delivery methods, shipping thresholds and return policy once they are defined."]] },
};

function Policy({ page, onShop }: InfoPageProps) {
  const policy = policyCopy[page];
  return <div className="info-page info-policy"><PageIntro kicker="STOREFRONT DEMONSTRATION" title={policy.title} /><div className="info-policy-body">{policy.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<button className="info-action" onClick={onShop}>BACK TO THE PRODUCT <span aria-hidden="true">→</span></button></div></div>;
}

function Account({ onShop }: Pick<InfoPageProps, "onShop">) {
  return <div className="info-page info-account"><div className="info-account-card"><p className="info-eyebrow">YOUR SPACE</p><h1>HELLO,<br />GOOD TIMES.</h1><p>This preview lets you explore products and build a cart without creating an account.</p><p className="info-account-note">Customer sign-in and order history become available when the storefront is connected to your own shop.</p><button className="info-action" onClick={onShop}>EXPLORE THE SHOP <span aria-hidden="true">→</span></button></div></div>;
}

export function InfoPage({ page, onShop }: InfoPageProps) {
  if (page === "contact" || page === "wholesale") return <Contact key={page} onShop={onShop} wholesale={page === "wholesale"} />;
  if (page === "stores") return <Stores onShop={onShop} />;
  if (page === "journal") return <Journal />;
  if (page === "account") return <Account onShop={onShop} />;
  if (Object.prototype.hasOwnProperty.call(policyCopy, page)) return <Policy page={page} onShop={onShop} />;
  return <About onShop={onShop} />;
}
