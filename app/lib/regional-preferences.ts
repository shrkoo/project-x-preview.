export type RegionalPreferences = {
  country: string;
  language: string;
  direction: "rtl" | "ltr";
  currency: string;
  calendar: string;
  dateFormat: string;
  numberSystem: string;
  firstDay: "saturday" | "sunday" | "monday";
  tomanDisplay?: boolean;
};

const STORAGE_KEY = "novyra-preferences-v1";
const LOCALE_FALLBACK: Record<string,string> = { fa:"fa-IR", ar:"ar-SA", ckb:"ckb-IQ", en:"en-US", de:"de-DE", ja:"ja-JP", hi:"hi-IN" };

export function localeForPreferences(prefs: Pick<RegionalPreferences,"language"|"calendar"|"numberSystem">): string {
  const base = LOCALE_FALLBACK[prefs.language] || prefs.language || "en-US";
  const locale = base.includes("-") ? base : base;
  const calendar = prefs.calendar || "gregory";
  const numberingSystem = prefs.numberSystem || "latn";
  try { return new Intl.Locale(locale, { calendar, numberingSystem }).toString(); }
  catch { return locale; }
}

export function readRegionalPreferences(fallback: RegionalPreferences): RegionalPreferences {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...fallback, ...saved, numberSystem: saved.numberSystem || saved.digits || fallback.numberSystem };
  } catch { return fallback; }
}

export function saveRegionalPreferences(preferences: RegionalPreferences): RegionalPreferences {
  if (typeof window === "undefined") return preferences;
  const normalized = { ...preferences, numberSystem: preferences.numberSystem || "latn", digits: preferences.numberSystem || "latn", firstDay: preferences.firstDay };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.localStorage.setItem("projectx-country", normalized.country);
  window.localStorage.setItem("projectx-language", normalized.language);
  window.localStorage.setItem("novyra-finance-currency", normalized.currency);
  window.localStorage.setItem("novyra-date-format", normalized.dateFormat);
  window.document.documentElement.lang = normalized.language;
  window.document.documentElement.dir = normalized.direction;
  window.dispatchEvent(new CustomEvent("novyra:preferences-change", { detail: normalized }));
  return normalized;
}

export function formatNumber(value: number, prefs: RegionalPreferences, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(localeForPreferences(prefs), options).format(value);
}

export function formatMoney(value: number, prefs: RegionalPreferences, options: Intl.NumberFormatOptions = {}): string {
  const amount = Number.isFinite(value) ? value : 0;
  const digits = prefs.numberSystem || "latn";
  const locale = localeForPreferences(prefs);
  if (prefs.currency === "IRT" || prefs.tomanDisplay) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...options }).format(amount) + " تومان";
  }
  if (prefs.currency === "IRR") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...options }).format(amount) + " ریال";
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency: prefs.currency || "USD", ...options }).format(amount);
}

export function formatDate(value: Date | string | number, prefs: RegionalPreferences, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const formatter = new Intl.DateTimeFormat(localeForPreferences(prefs), { year: "numeric", month: "2-digit", day: "2-digit", ...options });
  if (options.day === undefined && Object.keys(options).length > 0) return formatter.format(date);
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const pattern = prefs.dateFormat || "YYYY-MM-DD";
  return pattern.replace(/YYYY|MM|DD/g, token => token === "YYYY" ? (parts.year || "") : token === "MM" ? (parts.month || "") : (parts.day || ""));
}

export function weekStart(value: Date | string | number, firstDay: RegionalPreferences["firstDay"]): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const day = date.getDay();
  const target = firstDay === "sunday" ? 0 : firstDay === "monday" ? 1 : 6;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((day - target + 7) % 7));
  return date;
}
