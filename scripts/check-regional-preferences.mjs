import assert from "node:assert/strict";
import { defaultDateFormat, formatDate, formatMoney, formatNumber, weekStart } from "../app/lib/regional-preferences.ts";

const cases = [
  { country:"IR", language:"fa", direction:"rtl", currency:"IRR", calendar:"persian", dateFormat:"YYYY/MM/DD", numberSystem:"arabext", firstDay:"saturday" },
  { country:"US", language:"en", direction:"ltr", currency:"USD", calendar:"gregory", dateFormat:"MM/DD/YYYY", numberSystem:"latn", firstDay:"sunday" },
  { country:"SA", language:"ar", direction:"rtl", currency:"SAR", calendar:"islamic", dateFormat:"DD/MM/YYYY", numberSystem:"arab", firstDay:"saturday" },
  { country:"DE", language:"de", direction:"ltr", currency:"EUR", calendar:"gregory", dateFormat:"DD.MM.YYYY", numberSystem:"latn", firstDay:"monday" },
  { country:"JP", language:"ja", direction:"ltr", currency:"JPY", calendar:"japanese", dateFormat:"YYYY/MM/DD", numberSystem:"latn", firstDay:"sunday" },
  { country:"IN", language:"hi", direction:"ltr", currency:"INR", calendar:"gregory", dateFormat:"DD/MM/YYYY", numberSystem:"latn", firstDay:"monday" }
];

for (const prefs of cases) {
  const amount = formatMoney(1234, prefs);
  const number = formatNumber(1234, prefs);
  const date = formatDate(new Date("2026-11-24T12:00:00Z"), prefs);
  assert.ok(amount.length > 0, prefs.country + " money formatter");
  assert.ok(number.length > 0, prefs.country + " number formatter");
  assert.ok(date.length > 0, prefs.country + " date formatter");
  assert.equal(weekStart(new Date("2026-11-24T12:00:00"), prefs.firstDay).getDay(), ({saturday:6,sunday:0,monday:1})[prefs.firstDay]);
}
assert.match(formatMoney(150000, {...cases[0], currency:"IRT"}), /تومان/);
assert.match(formatNumber(1234, cases[0]), /[۰-۹]/);
assert.match(formatDate(new Date("2026-11-24T12:00:00Z"), cases[0]), /\//, "Iran date format uses configured slash pattern");
assert.match(formatDate(new Date("2026-11-24T12:00:00Z"), cases[1]), /\//, "US date format uses configured slash pattern");
assert.equal(defaultDateFormat("fa","IR"),"YYYY/MM/DD");
assert.equal(defaultDateFormat("en","US"),"MM/DD/YYYY");
assert.equal(defaultDateFormat("de","DE"),"DD.MM.YYYY");
assert.equal(defaultDateFormat("ja","JP"),"YYYY/MM/DD");
console.log("PASS: regional formatters and country date defaults for IR, US, SA, DE, JP and IN");
