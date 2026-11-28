import test from "node:test";
import assert from "node:assert/strict";
import { calculateAccountBalances, dateOffsetInTehran, isValidTransfer, parseBankSms, summarizeTransactions, tehranDateKey, validatePersonalTransaction, resolvePersonalTransactionTitle } from "./personal-finance.ts";
import { parseMoney, formatMoneyInputFa } from "./money.ts";

test("Tehran date crosses midnight at Tehran midnight, not UTC midnight", () => {
  assert.equal(tehranDateKey(new Date("2026-11-27T20:29:59.000Z")), "2026-11-27");
  assert.equal(tehranDateKey(new Date("2026-11-27T20:30:00.000Z")), "2026-11-28");
  assert.equal(dateOffsetInTehran(-1, new Date("2026-11-27T20:30:00.000Z")), "2026-11-27");
});

test("transfer changes account balances but not income or expense totals", () => {
  const events = [
    { id: "i", kind: "income", amount: 1000, account: "Cash" },
    { id: "e", kind: "expense", amount: 200, account: "Cash" },
    { id: "t", kind: "transfer", amount: 300, fromAccount: "Cash", toAccount: "Bank" },
  ];
  assert.deepEqual(summarizeTransactions(events), { income: 1000, expense: 200 });
  assert.deepEqual(calculateAccountBalances(events), { Cash: 500, Bank: 300 });
  assert.equal(isValidTransfer(300, "Cash", "Bank"), true);
  assert.equal(isValidTransfer(300, "Cash", "Cash"), false);
  assert.equal(isValidTransfer(0, "Cash", "Bank"), false);
});

test("legacy transfer pairs stay out of income/expense totals while preserving both account movements", () => {
  const legacy = [
    { id: "old-out", kind: "expense", category: "Transfer", amount: 50, account: "Cash" },
    { id: "old-in", kind: "income", category: "Transfer", amount: 50, account: "Bank" },
  ];
  assert.deepEqual(summarizeTransactions(legacy), { income: 0, expense: 0 });
  assert.deepEqual(calculateAccountBalances(legacy), { Cash: -50, Bank: 50 });
});

const smsCases = [
  ["واریز: مبلغ ۱,۲۵۰,۰۰۰ ریال", { amount: 1250000, kind: "income" }],
  ["برداشت از کارت به مبلغ ۲۵۰٬۰۰۰ ریال", { amount: 250000, kind: "expense" }],
  ["مبلغ: ۵۰۰۰۰۰۰ ریال بابت واریز", { amount: 5000000, kind: "income" }],
  ["خرید مبلغ ۱۲۳٬۴۵۶ ریال", { amount: 123456, kind: "expense" }],
  ["واریز به حساب شما 2,450,000 ریال", { amount: 2450000, kind: "income" }],
];
for (const [message, expected] of smsCases) test(`bank SMS parses ${message}`, () => assert.deepEqual(parseBankSms(message), expected));
test("unrecognized bank message returns null", () => assert.equal(parseBankSms("موجودی حساب شما ۱۰۰۰۰۰ ریال"), null));


test("grouped Latin and Persian amounts parse in the selected Toman currency", () => {
  assert.equal(parseMoney("100,000", "IRT"), 100000);
  assert.equal(parseMoney("۱۰۰٬۰۰۰", "IRT"), 100000);
  assert.equal(parseMoney("۱۰۰٬۰۰۰", "IRR"), 100000);
});

test("amount input uses Persian digits and the Persian thousands separator", () => {
  assert.equal(formatMoneyInputFa(100000), "۱۰۰٬۰۰۰");
});

test("shared validation accepts a positive amount and rejects zero", () => {
  assert.equal(validatePersonalTransaction(100), null);
  assert.equal(validatePersonalTransaction(0), "مبلغ باید بیشتر از صفر باشد");
});

test("a missing title falls back to category, then transaction kind", () => {
  assert.equal(resolvePersonalTransactionTitle("", "خوراک", "expense"), "خوراک");
  assert.equal(resolvePersonalTransactionTitle("  ", "", "income"), "درآمد");
  assert.equal(resolvePersonalTransactionTitle("فروشگاه", "خرید", "expense"), "فروشگاه");
});

test("personal transaction draft permits zero accounts or a selected account", () => {
  const withoutAccount = { amount: parseMoney("۱۰۰٬۰۰۰", "IRT"), account: undefined };
  const withAccount = { amount: parseMoney("100,000", "IRT"), account: "نقدی" };
  assert.equal(validatePersonalTransaction(withoutAccount.amount), null);
  assert.equal(withoutAccount.account, undefined);
  assert.equal(validatePersonalTransaction(withAccount.amount), null);
  assert.equal(withAccount.account, "نقدی");
});
