export type NumberFormatOptions = {
  digits?: "fa" | "en";
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  grouping?: boolean;
  compact?: boolean;
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const PERSIAN_GROUP_SEPARATOR = "\u066C";
const PERSIAN_DECIMAL_SEPARATOR = "٫";

/** The single number formatter used throughout NOVYRA. Persian output always uses U+066C and U+066B. */
export function formatNumber(input: number, options: NumberFormatOptions = {}): string {
  const digits = options.digits ?? "fa";
  const finite = Number.isFinite(input) ? input : 0;
  const negative = finite < 0;
  let value = Math.abs(finite);
  let maximumFractionDigits = options.maximumFractionDigits ?? 2;
  let minimumFractionDigits = options.minimumFractionDigits ?? 0;
  let suffix = "";

  if (options.compact) {
    if (value >= 1_000_000) {
      value /= 1_000_000;
      suffix = " میلیون";
      maximumFractionDigits = 1;
    } else if (value >= 10_000) {
      value /= 1_000;
      suffix = " هزار";
      maximumFractionDigits = 1;
    } else {
      value = Math.floor(value);
      maximumFractionDigits = 0;
    }
    minimumFractionDigits = 0;
  }

  const maxDigits = Math.max(0, Math.min(20, maximumFractionDigits));
  const minDigits = Math.max(0, Math.min(maxDigits, minimumFractionDigits));
  const factor = 10 ** maxDigits;
  const scaled = Math.round(value * factor + Number.EPSILON);
  const wholeValue = Math.floor(scaled / factor);
  let whole = String(wholeValue);
  let fraction = maxDigits ? String(scaled % factor).padStart(maxDigits, "0") : "";

  while (fraction.length > minDigits && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }
  if (fraction.length < minDigits) fraction = fraction.padEnd(minDigits, "0");

  if (options.grouping !== false) {
    const separator = digits === "fa" ? PERSIAN_GROUP_SEPARATOR : ",";
    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }
  const decimalSeparator = digits === "fa" ? PERSIAN_DECIMAL_SEPARATOR : ".";
  let result = whole + (fraction ? decimalSeparator + fraction : "") + suffix;
  if (digits === "fa") {
    result = result.replace(/[0-9]/g, digit => PERSIAN_DIGITS[Number(digit)]);
  }
  return (negative ? "−" : "") + result;
}
