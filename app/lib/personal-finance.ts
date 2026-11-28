export type FinanceEvent = { id: string; kind: "income" | "expense" | "transfer"; amount: number; category?: string; account?: string; fromAccount?: string; toAccount?: string };

const dateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
};

export function tehranDateKey(date: Date = new Date()): string {
  const { year, month, day } = dateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateOffsetInTehran(offset: number, now: Date = new Date()): string {
  const { year, month, day } = dateParts(now);
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

export function summarizeTransactions(events: FinanceEvent[]) {
  return events.reduce((totals, event) => {
    if (event.kind === "transfer" || event.category === "Transfer") return totals;
    if (event.kind === "income") totals.income += event.amount;
    if (event.kind === "expense") totals.expense += event.amount;
    return totals;
  }, { income: 0, expense: 0 });
}

export function calculateAccountBalances(events: FinanceEvent[]) {
  return events.reduce<Record<string, number>>((balances, event) => {
    if (event.kind === "transfer") {
      if (event.fromAccount) balances[event.fromAccount] = (balances[event.fromAccount] || 0) - event.amount;
      if (event.toAccount) balances[event.toAccount] = (balances[event.toAccount] || 0) + event.amount;
    } else if (event.account) {
      balances[event.account] = (balances[event.account] || 0) + (event.kind === "income" ? event.amount : -event.amount);
    }
    return balances;
  }, {});
}

export function isValidTransfer(amount: number, from: string, to: string): boolean {
  return Number.isFinite(amount) && amount > 0 && !!from && !!to && from !== to;
}

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function parseBankSms(message: string): { amount: number; kind: "income" | "expense" } | null {
  const text = normalizeDigits(message);
  const kind = /(واریز|دریافت|وصول|بستانکار|واریز به|deposit|credited|received)/i.test(text) ? "income" : /(برداشت|خرید|پرداخت|انتقال|بدهکار|کسر|withdraw|debit|purchase)/i.test(text) ? "expense" : null;
  if (!kind) return null;
  const candidates = [...text.matchAll(/(?:مبلغ|به مبلغ|برداشت|واریز|خرید|پرداخت)?\s*[:：]?\s*(\d[\d,٬،.\s]*\d|\d+)/g)]
    .map(match => match[1].replace(/[\s,٬،.]/g, ""))
    .map(Number).filter(value => Number.isSafeInteger(value) && value > 0);
  if (!candidates.length) return null;
  const amountMatch = text.match(/(?:مبلغ|به مبلغ)\s*[:：]?\s*([\d,٬،.]+)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/[\s,٬،.]/g, "")) : candidates[0];
  return Number.isSafeInteger(amount) && amount > 0 ? { amount, kind } : null;
}

/** Shared transaction validation used by both the sheet and its parent save handler. */
export function validatePersonalTransaction(amount: number): string | null {
  return Number.isFinite(amount) && amount > 0 ? null : "مبلغ باید بیشتر از صفر باشد";
}

export function resolvePersonalTransactionTitle(title: string, category: string, kind: "income" | "expense"): string {
  return title.trim() || category.trim() || (kind === "income" ? "درآمد" : "هزینه");
}

/** Format an ISO transaction date as a Jalali date in Tehran's time zone. */
export function formatTehranPersianDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(value) ? value + "T12:00:00+03:30" : value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
    timeZone: "Asia/Tehran", calendar: "persian", numberingSystem: "arabext",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return get("year") + "/" + get("month").padStart(2, "۰") + "/" + get("day").padStart(2, "۰");
}
