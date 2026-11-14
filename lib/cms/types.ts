export type Field = { id: string; kind: 'text'|'image'|'link'; label: string; value: string; section: string; alt?: string };
export type ReferencePage = { title: string; head: string; body: string; bodyClass: string; fields: Field[]; sections: { id: string; label: string }[] };
export type Config = { fields: Record<string,string>; hidden: string[]; order: string[]; prices?: Record<string,{ once: number; monthly: number; base: number }>; title?: string; integrations?: Integrations; cartSettings?: CartSettings };
export type Document = { path: string; draft: Config; published: Config; version: number; publishedVersion: number; updatedAt: string; publishedAt: string|null };
export const emptyConfig = (): Config => ({ fields: {}, hidden: [], order: [] });
// Local/GitHub fallback mirrors the owner's published prices (integer kopecks).
// Existing saved settings remain authoritative in the hosted and local stores.
export const defaultPrices = { '5': { once:190000,monthly:170000,base:200000 }, '15': {once:490000,monthly:450000,base:550000}, '30':{once:990000,monthly:950000,base:1000000} };
export type CartSettings = {
 promotion: { enabled:boolean; code:string; percent:number };
 gift: { enabled:boolean; title:string; image:string; value:number };
 emptyText:string;
};
export const defaultCartSettings = (): CartSettings => ({
 promotion:{enabled:true,code:'BF20',percent:20},
 gift:{enabled:true,title:'UTRO Gummies® Pre-Alcohol Support - 3 Pack',image:'/reference/ae8d133d21eb-3-pack.jpg',value:1500},
 emptyText:'Your cart is currently empty.',
});
export type Integrations = {
 checkout: {enabled:boolean;provider:string;links:Record<string,string>;cartUrl:string};
 accounts: {enabled:boolean;url:string;subscriptionUrl:string};
 map: {enabled:boolean;mode:'iframe'|'link';url:string};
};
export const defaultIntegrations = (): Integrations => ({checkout:{enabled:false,provider:'Платёжный сервис',links:{'5_once':'','15_once':'','30_once':'','5_monthly':'','15_monthly':'','30_monthly':''},cartUrl:''},accounts:{enabled:false,url:'',subscriptionUrl:''},map:{enabled:false,mode:'iframe',url:''}});
