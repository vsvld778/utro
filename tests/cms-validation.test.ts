import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig,safeImage,safeLink} from '../lib/cms/validation';
import {defaultIntegrations,defaultCartSettings,emptyConfig,ReferencePage} from '../lib/cms/types';
const page:ReferencePage={title:'Test',head:'',body:'',bodyClass:'',fields:[{id:'headline',kind:'text',label:'Headline',value:'Hello',section:'hero'},{id:'photo',kind:'image',label:'Photo',value:'/assets/a.jpg',section:'hero'},{id:'link',kind:'link',label:'Link',value:'/',section:'hero'}],sections:[{id:'hero',label:'Hero'}]};
test('Content edits accept text without treating HTML as markup',()=>{const c=validateConfig({...emptyConfig(),fields:{headline:'<script>alert(1)</script>'}},page);assert.equal(c.fields.headline,'<script>alert(1)</script>');});
test('Unknown fields and sections are rejected',()=>{assert.throws(()=>validateConfig({...emptyConfig(),fields:{injected:'x'}},page));assert.throws(()=>validateConfig({...emptyConfig(),hidden:['invented']},page));});
test('No javascript/data/protocol-relative URLs or credential-bearing links',()=>{for(const x of ['javascript:alert(1)','data:text/html,test','//evil.com','https://user:pass@example.com','/\\evil.com']){assert.equal(safeLink(x),false,x);assert.equal(safeImage(x),false,x);}});
test('Normal supported URL types remain usable',()=>{for(const x of ['/pages/about','https://example.com/payment','mailto:shop@example.com','#faq'])assert.equal(safeLink(x),true,x);assert.equal(safeImage('/media/123.png'),true);});
test('Money must be bounded integer kopecks',()=>{for(const n of [0,-1,NaN,1.5,100000001])assert.throws(()=>validateConfig({...emptyConfig(),prices:{5:{once:n,monthly:1,base:1},15:{once:1,monthly:1,base:1},30:{once:1,monthly:1,base:1}}}));});
test('Disabled blank integrations can be saved; enabled empty connection rejected',()=>{const integrations=defaultIntegrations();assert.ok(validateConfig({...emptyConfig(),integrations}).integrations);integrations.checkout.enabled=true;assert.throws(()=>validateConfig({...emptyConfig(),integrations}));});
test('Payment link templates and hosted map links accepted; unsafe embeds rejected',()=>{const i=defaultIntegrations();i.checkout.enabled=true;i.checkout.links['15_once']='https://merchant.example/pay?quantity={quantity}';i.map={enabled:true,mode:'iframe',url:'https://maps.example/embed'};assert.equal(validateConfig({...emptyConfig(),integrations:i}).integrations?.map.mode,'iframe');i.map.url='javascript:alert(1)';assert.throws(()=>validateConfig({...emptyConfig(),integrations:i}));});
test('Legacy settings retain the cart defaults without requiring a new field',()=>{
 const legacy=validateConfig(emptyConfig());
 assert.equal(legacy.cartSettings,undefined);
 const defaults=legacy.cartSettings||defaultCartSettings();
 assert.deepEqual(defaults.promotion,{enabled:true,code:'BF20',percent:20});
 assert.equal(defaults.gift.value,1500);
 assert.equal(defaults.gift.image,'/reference/ae8d133d21eb-3-pack.jpg');
 const other=defaultCartSettings();other.gift.enabled=false;assert.equal(defaultCartSettings().gift.enabled,true);
});
test('Cart settings preserve disabled switches and valid custom content',()=>{
 const cartSettings=defaultCartSettings();cartSettings.promotion={enabled:false,code:'  SAVE25  ',percent:25};cartSettings.gift.enabled=false;cartSettings.gift.image='/media/custom-image';cartSettings.emptyText='Nothing here yet.';
 const c=validateConfig({...emptyConfig(),cartSettings});
 assert.equal(c.cartSettings?.promotion.enabled,false);assert.equal(c.cartSettings?.promotion.code,'SAVE25');assert.equal(c.cartSettings?.gift.enabled,false);assert.equal(c.cartSettings?.emptyText,'Nothing here yet.');
});
test('Cart promotion is limited to integer percentages from zero through one hundred',()=>{
 for(const percent of [0,100]){const cartSettings=defaultCartSettings();cartSettings.promotion.percent=percent;assert.equal(validateConfig({...emptyConfig(),cartSettings}).cartSettings?.promotion.percent,percent);}
 for(const percent of [-1,101,1.5,NaN,Infinity,'20',null]){const cartSettings:any=defaultCartSettings();cartSettings.promotion.percent=percent;assert.throws(()=>validateConfig({...emptyConfig(),cartSettings}));}
});
test('Gift value is bounded positive integer kopecks',()=>{
 for(const value of [1,100000000]){const cartSettings=defaultCartSettings();cartSettings.gift.value=value;assert.equal(validateConfig({...emptyConfig(),cartSettings}).cartSettings?.gift.value,value);}
 for(const value of [0,-1,1.5,NaN,Infinity,100000001,'1500']){const cartSettings:any=defaultCartSettings();cartSettings.gift.value=value;assert.throws(()=>validateConfig({...emptyConfig(),cartSettings}));}
});
test('Cart gift images cannot load unsafe or credential-bearing URLs',()=>{
 for(const image of ['javascript:alert(1)','data:image/svg+xml,test','//evil.example/a.jpg','https://u:p@example.com/a.jpg','/\\evil.example/a.jpg','https://example.com/\na.jpg','']){const cartSettings=defaultCartSettings();cartSettings.gift.image=image;assert.throws(()=>validateConfig({...emptyConfig(),cartSettings}),image);}
 const cartSettings=defaultCartSettings();cartSettings.gift.image='https://example.com/photo.jpg';assert.ok(validateConfig({...emptyConfig(),cartSettings}).cartSettings);
});
test('Cart settings reject unknown fields, malformed objects and coercible switches',()=>{
 for(const cartSettings of [null,[],{}, {...defaultCartSettings(),unexpected:1},{...defaultCartSettings(),promotion:{...defaultCartSettings().promotion,unknown:true}},{...defaultCartSettings(),gift:{...defaultCartSettings().gift,variantId:'injected'}},{...defaultCartSettings(),promotion:{...defaultCartSettings().promotion,enabled:'true'}},{...defaultCartSettings(),gift:{...defaultCartSettings().gift,enabled:1}}])assert.throws(()=>validateConfig({...emptyConfig(),cartSettings}));
});
test('Cart labels are nonempty and bounded; cart settings are global only',()=>{
 for(const key of ['code','title','emptyText'])for(const invalid of ['', '   ', 'x'.repeat(key==='code'?65:key==='title'?201:1001)]){
  const cartSettings:any=defaultCartSettings();if(key==='code')cartSettings.promotion.code=invalid;else if(key==='title')cartSettings.gift.title=invalid;else cartSettings.emptyText=invalid;
  assert.throws(()=>validateConfig({...emptyConfig(),cartSettings}));
 }
 assert.throws(()=>validateConfig({...emptyConfig(),cartSettings:defaultCartSettings()},page));
});
