import assert from "node:assert/strict";
import { formatLegacyMoney, formatMoney, parseMoney } from "../app/lib/money.ts";

assert.equal(parseMoney("۱٬۲۵۰٬۰۰۰", "IRR"), 1250000);
assert.equal(parseMoney("١٬٢٥٠٬٠٠٠", "IRR"), 1250000);
assert.equal(parseMoney("۱۲۵٬۰۰۰", "IRT"), 1250000, "toman input is stored as rial");
assert.equal(parseMoney("۱٬۲۵۰٬۰۰۰", "IRT-display"), 12500000, "1,250,000 toman is stored as 12,500,000 rial");
assert.equal(formatMoney(1250000, "IRT-display", "fa-IR"), "۱۲۵٬۰۰۰ تومان");
assert.equal(formatMoney(12500000, "IRT-display", "fa-IR"), "۱٬۲۵۰٬۰۰۰ تومان");
assert.equal(formatMoney(1250000, "IRT-display", "en-US"), "125,000 Toman");
assert.equal(formatMoney(1250000, "IRR", "fa-IR"), "۱٬۲۵۰٬۰۰۰ ریال");
assert.equal(parseMoney("1,234.56", "USD"), 123456);
assert.equal(parseMoney("1.234,56", "EUR"), 123456);
assert.equal(parseMoney("١٬٢٣٤٫٥٦", "USD"), 123456);
assert.equal(formatMoney(123456, "USD", "en-US"), "$1,234.56");
assert.equal(formatMoney(123456, "EUR", "de-DE"), "1.234,56 €");
assert.equal(formatMoney(123456, "USD", "en-US", { hidden: true }), "••••");
assert.equal(formatMoney(10, "IRT", "fa-IR"), "۱ تومان", "toman display rounds half up");
assert.equal(formatMoney(-10, "IRT", "fa-IR"), "-۱ تومان", "negative toman rounding is symmetric");
assert.throws(() => parseMoney("abc", "USD"), /Invalid money/);
assert.throws(() => formatMoney(1.5, "USD", "en-US"), /safe integer/);
console.log("money unit checks: PASS");

assert.equal(formatLegacyMoney(125000, "IRT", "fa-IR"), "۱۲۵٬۰۰۰ تومان", "legacy display-unit values keep their historical display semantics");
