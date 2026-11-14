// Rename the displayed brand without changing links, email addresses or asset paths.
// CMS records keep their original text so the rebrand does not rewrite user data.
const protectedReference = /(?:https?:\/\/|www\.)[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/[^\s<>"']+/gi;
const legacyBrand = /(?<![\p{L}\p{N}_])undo(?![\p{L}\p{N}_])/giu;

export function brandText(value) {
 const text = String(value);
 let result = '', end = 0;
 for (const match of text.matchAll(protectedReference)) {
  result += text.slice(end, match.index).replace(legacyBrand, 'UTRO') + match[0];
  end = match.index + match[0].length;
 }
 return result + text.slice(end).replace(legacyBrand, 'UTRO');
}
