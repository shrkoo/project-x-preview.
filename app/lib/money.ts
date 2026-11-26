/**
 * Canonical money boundary for Novyra.
 *
 * Storage contract:
 * - IRR: whole rials (integer).
 * - IRT / IRT-display: display/input in toman, but storage remains whole rials.
 * - Other ISO currencies: integer minor units (e.g. USD cents).
 *
 * This module deliberately does not migrate existing records. Migration requires
 * a verified source-unit contract, an export backup, and explicit user approval.
 */
export type MoneyOptions = { hidden?: boolean };
const HIDDEN = "••••";
const IRAN_CODES = new Set(["IRR", "IRT", "IRT-DISPLAY", "TOMAN"]);
const CURRENCY_DIGITS: Record<string, number> = {
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  IRR: 0,
};

function codeOf(currency: string): string {
  return String(currency || "USD").toUpperCase();
}
function decimalsOf(currency: string): number {
  const code = codeOf(currency);
  if (IRAN_CODES.has(code)) return 0;
  if (code in CURRENCY_DIGITS) return CURRENCY_DIGITS[code];
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}
function assertMinor(amountMinor: number): bigint {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError("amountMinor must be a safe integer");
  return BigInt(amountMinor);
}
function groupedInteger(value: bigint, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: true }).format(value);
}

/** Format an integer amount in the currency's smallest stored unit. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  locale: string,
  options: MoneyOptions = {},
): string {
  if (options.hidden) return HIDDEN;
  const code = codeOf(currency);
  const amount = assertMinor(amountMinor);
  if (code === "IRT" || code === "IRT-DISPLAY" || code === "TOMAN") {
    const toman = (amount + 5n) / 10n;
    return groupedInteger(toman, locale.startsWith("fa") ? locale : "fa-IR") + " تومان";
  }
  if (code === "IRR" && locale.startsWith("fa")) {
    return groupedInteger(amount, locale) + " ریال";
  }

  const digits = decimalsOf(code);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction = absolute % scale;
  const numericParts = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).formatToParts(whole);
  const fractionText = digits
    ? new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: digits, maximumFractionDigits: 0 }).format(fraction)
    : "";
  const template = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(negative ? -1 : 1);
  let insertedNumber = false;
  const rendered = template.map(part => {
    if (part.type === "integer" || part.type === "group") {
      if (insertedNumber) return "";
      insertedNumber = true;
      return numericParts.map(item => item.value).join("");
    }
    if (part.type === "fraction") return fractionText;
    if (part.type === "decimal" && digits === 0) return "";
    if (part.type === "minusSign") return negative ? part.value : "";
    return part.value;
  }).join("");
  return rendered;
}

const DIGITS: Record<string, string> = {
  "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
};

/** Parse a user-entered major/display amount into integer stored minor units. */
export function parseMoney(input: string, currency: string): number {
  const code = codeOf(currency);
  const digits = decimalsOf(code);
  let value = String(input ?? "").replace(/[۰-۹٠-٩]/g, digit => DIGITS[digit] || digit)
    .replace(/[\u00A0\u202F\s]/g, "").replace(/[٬،']/g, "");
  const decimalCandidates = [".", "٫", ","];
  let decimalAt = -1;
  if (digits > 0) {
    for (const separator of decimalCandidates) {
      const at = value.lastIndexOf(separator);
      if (at > decimalAt && at >= 0 && value.length - at - 1 <= digits) decimalAt = at;
    }
  }
  if (decimalAt >= 0) {
    const integerPart = value.slice(0, decimalAt).replace(/[.,٫]/g, "");
    const fractionPart = value.slice(decimalAt + 1).replace(/[.,٫]/g, "");
    value = integerPart + "." + fractionPart.padEnd(digits, "0").slice(0, digits);
  } else {
    value = value.replace(/[.,٫]/g, "");
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new TypeError("Invalid money amount");
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [wholeText, fractionText = ""] = unsigned.split(".");
  const scale = 10n ** BigInt(digits);
  let minor = BigInt(wholeText || "0") * scale + BigInt((fractionText || "").padEnd(digits, "0") || "0");
  if (code === "IRT" || code === "IRT-DISPLAY" || code === "TOMAN") minor *= 10n;
  if (negative) minor = -minor;
  const result = Number(minor);
  if (!Number.isSafeInteger(result)) throw new RangeError("Money amount exceeds the safe integer range");
  return result;
}

export const MONEY_HIDDEN_TEXT = HIDDEN;
