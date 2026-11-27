import test from "node:test";
import assert from "node:assert/strict";
import { calculateAccountBalances, dateOffsetInTehran, isValidTransfer, parseBankSms, summarizeTransactions, tehranDateKey } from "./personal-finance.ts";

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

const smsCases = [
  ["واریز: مبلغ ۱,۲۵۰,۰۰۰ ریال", { amount: 1250000, kind: "income" }],
  ["برداشت از کارت به مبلغ ۲۵۰٬۰۰۰ ریال", { amount: 250000, kind: "expense" }],
  ["مبلغ: ۵۰۰۰۰۰۰ ریال بابت واریز", { amount: 5000000, kind: "income" }],
  ["خرید مبلغ ۱۲۳٬۴۵۶ ریال", { amount: 123456, kind: "expense" }],
  ["واریز به حساب شما 2,450,000 ریال", { amount: 2450000, kind: "income" }],
];
for (const [message, expected] of smsCases) test(`bank SMS parses ${message}`, () => assert.deepEqual(parseBankSms(message), expected));
test("unrecognized bank message returns null", () => assert.equal(parseBankSms("موجودی حساب شما ۱۰۰۰۰۰ ریال"), null));
