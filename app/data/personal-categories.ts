export const PERSONAL_CATEGORIES = [
  { key: "food", label: "خوراک", kind: "expense" },
  { key: "transport", label: "حمل‌ونقل", kind: "expense" },
  { key: "shopping", label: "خرید", kind: "expense" },
  { key: "home", label: "خانه", kind: "expense" },
  { key: "health", label: "سلامت", kind: "expense" },
  { key: "education", label: "آموزش", kind: "expense" },
  { key: "general", label: "عمومی", kind: "expense" },
  { key: "bills", label: "قبض", kind: "expense" },
  { key: "salary", label: "حقوق", kind: "income" },
  { key: "investment", label: "سرمایه‌گذاری", kind: "income" },
  { key: "other", label: "سایر", kind: "both" },
] as const;
export const PERSONAL_EXPENSE_CATEGORIES = PERSONAL_CATEGORIES.filter(item => item.kind === "expense" || item.kind === "both");
export const PERSONAL_INCOME_CATEGORIES = PERSONAL_CATEGORIES.filter(item => item.kind === "income" || item.kind === "both");
export const personalCategoryLabel = (keyOrLabel: string) => PERSONAL_CATEGORIES.find(item => item.key === keyOrLabel || item.label === keyOrLabel)?.label || keyOrLabel;

export const personalCategoryKey = (keyOrLabel: string) => {
  const found = PERSONAL_CATEGORIES.find(item => item.key === keyOrLabel || item.label === keyOrLabel);
  return found?.key || (keyOrLabel.trim() ? "custom:" + keyOrLabel.normalize("NFKC").trim().toLocaleLowerCase() : "all");
};
