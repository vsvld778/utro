// Prices are stored as integer kopecks. Changing currency does not convert amounts.
const rubles = new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB'});
export const money = kopecks => rubles.format(kopecks / 100);

// Keep older saved text fields consistent with the store currency as well.
export function rubleText(value) {
 const amount = number => number.includes('.') ? number.replaceAll(',', ' ').replace('.', ',') : number.replace(/,(?=\d{3}(?:,|$))/g, ' ');
 return String(value)
  .replace(/(?:\$|\bUSD)\s*(\d+(?:[.,]\d+)*)(?:\s*USD\b)?/gi, (_, number) => amount(number) + '\u00a0₽')
  .replace(/(\d+(?:[.,]\d+)*)\s*USD\b/gi, (_, number) => amount(number) + '\u00a0₽');
}
