import assert from "node:assert/strict";
import { formatMoney, parseMoney } from "../app/lib/money.ts";
assert.equal(parseMoney("۱۲۵۰۰۰۰","IRT"),1250000);
assert.equal(parseMoney("١٢٥٠٠٠٠","TOMAN"),1250000);
assert.equal(parseMoney("12.34","USD"),12.34);
assert.equal(formatMoney(1250000,"IRT","fa-IR"),"۱٬۲۵۰٬۰۰۰ تومان");
assert.equal(formatMoney(12.34,"USD","en-US"),"$12.34");
assert.equal(formatMoney(12.34,"USD","en-US",{hidden:true}),"••••");
assert.throws(()=>parseMoney("12.5","IRR"),/decimal/);
assert.throws(()=>parseMoney("not money","USD"),/Invalid money/);
console.log("money unit checks: PASS");

assert.equal(formatMoney(-50000,"IRT","fa-IR"),"\u2066−۵۰٬۰۰۰ تومان\u2069");
assert.equal(formatMoney(-50000,"IRR","fa-IR"),"\u2066−۵۰٬۰۰۰ ریال\u2069");
assert.equal(parseMoney("۵۰٬۰۰۰","IRT"),50000);
assert.equal(parseMoney("٥٠٬٠٠٠","IRT"),50000);
assert.equal(parseMoney("50,000","IRT"),50000);
