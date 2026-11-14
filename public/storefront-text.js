import {rubleText} from './currency.js';
import {disclaimerText} from './disclaimer.js';
import {brandText} from './brand.js';

// Apply current store terminology to older saved CMS text as well.
export function storefrontText(value) {
 return rubleText(brandText(disclaimerText(value))).replace(/(?<![\p{L}\p{N}_])саше(?![\p{L}\p{N}_])/giu, word => word === word.toUpperCase() ? 'ШТ' : 'шт');
}
