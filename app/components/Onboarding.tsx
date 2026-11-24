"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE, apiRequest, setSession, createPasswordSalt, derivePasswordHash } from "../lib/api";
import { countries } from "../data/countries";
import { currencies } from "../data/currencies";
import { languages, languageByCode } from "../data/languages";
import { calendars } from "../data/calendars";
import { numberSystems } from "../data/number-systems";
import { weekdays } from "../data/weekdays";

type Language = (typeof languages)[number]["code"];
type User = { id: string; email: string; displayName: string; xp: number; gamesPlayed: number; role?: string };
type Props = { onComplete: (user: User | null, language: Language) => void; initialNotice?: string };
type Stage = "country" | "auth" | "profile" | "passwordSetup";
type Mode = "login" | "signup";

const copy: Partial<Record<Language, Record<string, string>>> = {
  en: {
    choose: "Choose your language", chooseSub: "A calm, seamless experience across every part of NOVYRA.",
    continue: "Continue", languageNote: "You can change this anytime in Settings.",
    welcome: "Welcome to NOVYRA", welcomeSub: "Your people. Your moments. Your world.",
    signIn: "Sign in", create: "Create account", loginTitle: "Welcome back", signupTitle: "Create your account",
    loginSub: "Sign in to continue to your space.", signupSub: "A few details and your space is ready.",
    google: "Continue with Google", apple: "Continue with Apple", or: "OR CONTINUE WITH EMAIL",
    name: "Full name", email: "Email address", password: "Password", confirm: "Confirm password",
    forgot: "Forgot password?", noAccount: "New to NOVYRA?", haveAccount: "Already have an account?",
    createLink: "Create account", loginLink: "Sign in", minPassword: "Use at least 10 characters.",
    profileTitle: "Make it yours", profileSub: "Choose an avatar or add your own photo. You can skip this for now.",
    readyAvatars: "Choose an avatar", upload: "Upload your photo", changePhoto: "Change photo",
    displayName: "Display name", finish: "Enter NOVYRA", skip: "Skip for now",
    emailSent: "If this email is registered, recovery instructions will be sent.", oauthUnavailable: "Google and Apple sign-in need provider credentials before they can be activated.",
    back: "Back", resetTitle: "Reset your password", sendReset: "Send recovery link", recoverySub: "Enter your account email and we will send a recovery link.", updatePassword: "Update password",
    passwordMismatch: "Passwords do not match.", authError: "Something went wrong. Please try again.",
    invalidEmail: "Enter a valid email address.", weakPassword: "Password must be at least 10 characters.",
    missingName: "Enter your name.", photoError: "Choose an image file smaller than 8 MB."
  },
  fa: {
    choose: "زبانت را انتخاب کن", chooseSub: "برای تجربه‌ای روان و یکپارچه در تمام بخش‌های NOVYRA.",
    continue: "ادامه", languageNote: "هر زمان بخواهی، می‌توانی زبان را از تنظیمات تغییر بدهی.",
    welcome: "به NOVYRA خوش آمدید", welcomeSub: "دوستان شما، لحظه‌های شما، دنیای شما.",
    signIn: "ورود", create: "ساخت حساب", loginTitle: "خوش برگشتید", signupTitle: "حساب خود را بسازید",
    loginSub: "برای ورود به فضای خود وارد حساب شوید.", signupSub: "چند اطلاعات ساده وارد کنید تا فضای شما آماده شود.",
    google: "ادامه با Google", apple: "ادامه با Apple", or: "یا با ایمیل ادامه دهید",
    name: "نام و نام خانوادگی", email: "آدرس ایمیل", password: "رمز عبور", confirm: "تکرار رمز عبور",
    forgot: "رمز عبور را فراموش کرده‌اید؟", noAccount: "تازه به NOVYRA آمده‌اید؟", haveAccount: "از قبل حساب دارید؟",
    createLink: "ساخت حساب", loginLink: "ورود", minPassword: "حداقل ۱۰ نویسه وارد کنید.",
    profileTitle: "پروفایل خود را بسازید", profileSub: "یک آواتار انتخاب کنید یا عکس خودتان را بارگذاری کنید. می‌توانید فعلاً رد کنید.",
    readyAvatars: "انتخاب آواتار", upload: "بارگذاری عکس شخصی", changePhoto: "تغییر عکس",
    displayName: "نام نمایشی", finish: "ورود به NOVYRA", skip: "فعلاً رد می‌کنم",
    emailSent: "اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی ارسال می‌شود.", oauthUnavailable: "برای فعال‌شدن ورود Google و Apple، اطلاعات اتصال رسمی این سرویس‌ها لازم است.",
    back: "بازگشت", resetTitle: "بازیابی رمز عبور", sendReset: "ارسال لینک بازیابی", recoverySub: "ایمیل حسابت را وارد کن تا لینک بازیابی برایت ارسال شود.", updatePassword: "تغییر رمز عبور",
    passwordMismatch: "رمزهای عبور یکسان نیستند.", authError: "مشکلی پیش آمد. دوباره تلاش کنید.",
    invalidEmail: "یک ایمیل معتبر وارد کنید.", weakPassword: "رمز عبور باید حداقل ۱۰ نویسه باشد.",
    missingName: "نام خود را وارد کنید.", photoError: "یک تصویر کوچک‌تر از ۸ مگابایت انتخاب کنید."
  },
  ar: {
    choose: "اختر لغتك", chooseSub: "تجربة هادئة وسلسة في جميع أقسام NOVYRA.",
    continue: "متابعة", languageNote: "يمكنك تغيير اللغة لاحقاً من الإعدادات.",
    welcome: "مرحباً بك في NOVYRA", welcomeSub: "أصدقاؤك، لحظاتك، عالمك.",
    signIn: "تسجيل الدخول", create: "إنشاء حساب", loginTitle: "مرحباً بعودتك", signupTitle: "أنشئ حسابك",
    loginSub: "سجّل الدخول للمتابعة إلى مساحتك.", signupSub: "أدخل بعض التفاصيل للبدء.",
    google: "المتابعة باستخدام Google", apple: "المتابعة باستخدام Apple", or: "أو المتابعة بالبريد الإلكتروني",
    name: "الاسم الكامل", email: "البريد الإلكتروني", password: "كلمة المرور", confirm: "تأكيد كلمة المرور",
    forgot: "هل نسيت كلمة المرور؟", noAccount: "جديد في NOVYRA؟", haveAccount: "لديك حساب بالفعل؟",
    createLink: "إنشاء حساب", loginLink: "تسجيل الدخول", minPassword: "استخدم ١٠ أحرف على الأقل.",
    profileTitle: "اجعل ملفك الشخصي مميزاً", profileSub: "اختر صورة رمزية أو أضف صورتك. يمكنك التخطي الآن.",
    readyAvatars: "اختر صورة رمزية", upload: "تحميل صورتك", changePhoto: "تغيير الصورة",
    displayName: "الاسم الظاهر", finish: "الدخول إلى NOVYRA", skip: "تخطي الآن",
    emailSent: "إذا كان البريد مسجلاً، فستصلك تعليمات الاستعادة.", oauthUnavailable: "يلزم إعداد بيانات Google وApple الرسمية لتفعيل تسجيل الدخول.",
    back: "رجوع", resetTitle: "إعادة تعيين كلمة المرور", sendReset: "إرسال رابط الاستعادة", recoverySub: "أدخل بريد حسابك لإرسال رابط الاستعادة.", updatePassword: "تحديث كلمة المرور",
    passwordMismatch: "كلمتا المرور غير متطابقتين.", authError: "حدث خطأ. حاول مرة أخرى.",
    invalidEmail: "أدخل بريداً إلكترونياً صالحاً.", weakPassword: "يجب أن تتكون كلمة المرور من ١٠ أحرف على الأقل.",
    missingName: "أدخل اسمك.", photoError: "اختر صورة يقل حجمها عن ٨ ميغابايت."
  },
  ckb: {
    choose: "زمانی خۆت هەڵبژێرە", chooseSub: "بۆ ئەزموونێکی ئارام و یەکگرتوو لە هەموو بەشەکانی NOVYRA.",
    continue: "بەردەوام بە", languageNote: "دەتوانیت دواتر لە ڕێکخستنەکان زمان بگۆڕیت.",
    welcome: "بەخێربێیت بۆ NOVYRA", welcomeSub: "هاوڕێکانت، ساتەکانت، جیهانی تۆ.",
    signIn: "چوونەژوورەوە", create: "دروستکردنی هەژمار", loginTitle: "بەخێرهاتیتەوە", signupTitle: "هەژمارەکەت دروست بکە",
    loginSub: "بۆ بەردەوامبوون بچۆ ژوورەوە.", signupSub: "چەند زانیارییەک بنووسە بۆ دەستپێکردن.",
    google: "بەردەوامبوون بە Google", apple: "بەردەوامبوون بە Apple", or: "یان بە ئیمەیڵ بەردەوام بە",
    name: "ناوی تەواو", email: "ناونیشانی ئیمەیڵ", password: "وشەی نهێنی", confirm: "دووبارەکردنەوەی وشەی نهێنی",
    forgot: "وشەی نهێنیت لەبیرچووە؟", noAccount: "تازە هاتوویتە NOVYRA؟", haveAccount: "پێشتر هەژمارت هەیە؟",
    createLink: "دروستکردنی هەژمار", loginLink: "چوونەژوورەوە", minPassword: "لانیکەم ١٠ پیت بەکاربهێنە.",
    profileTitle: "پرۆفایلەکەت تایبەت بکە", profileSub: "ئاوەتارێک هەڵبژێرە یان وێنەی خۆت باربکە. دەتوانیت ئێستا تێپەڕێنیت.",
    readyAvatars: "ئاوەتار هەڵبژێرە", upload: "بارکردنی وێنەی خۆت", changePhoto: "گۆڕینی وێنە",
    displayName: "ناوی پیشاندراو", finish: "چوونە ژوورەوەی NOVYRA", skip: "ئێستا تێپەڕێنە",
    emailSent: "ئەگەر ئەم ئیمەیڵە تۆمارکرابێت، ڕێنمایی گەڕاندنەوەی بۆ دەنێردرێت.", oauthUnavailable: "بۆ چالاککردنی چوونەژوورەوەی Google و Apple، زانیارییە فەرمییەکانی پێویستن.",
    back: "گەڕانەوە", resetTitle: "نوێکردنەوەی وشەی نهێنی", sendReset: "ناردنی بەستەری گەڕاندنەوە", recoverySub: "ئیمەیڵی هەژمارەکەت بنووسە بۆ ناردنی بەستەری گەڕاندنەوە.", updatePassword: "گۆڕینی وشەی نهێنی",
    passwordMismatch: "وشە نهێنییەکان یەکسان نین.", authError: "هەڵەیەک ڕوویدا. دووبارە هەوڵ بدەوە.",
    invalidEmail: "ئیمەیڵێکی دروست بنووسە.", weakPassword: "وشەی نهێنی دەبێت لانیکەم ١٠ پیت بێت.",
    missingName: "ناوەکەت بنووسە.", photoError: "وێنەیەک هەڵبژێرە کە لە ٨ مێگابایت بچووکتر بێت."
  }
};

const avatarChoices = ["✦", "🌙", "🦊", "🐼", "🐺", "🦁", "🐸", "🐙", "🪐", "⚡", "🌊", "🦋"];

function NovyraMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path d="M10 36V12c0-2 2.4-2.8 3.7-1.3L34 35V12" fill="none" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M34 35h4" fill="none" stroke="currentColor" strokeWidth="5.2" strokeLinecap="round"/>
  </svg>;
}
function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"/><path fill="#4CAF50" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z"/><path fill="#1976D2" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.2c1.6-4.8 6.1-8.3 11.4-8.3Z"/></svg>;
}
function AppleMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.2 8.9.8 1.1 1.7 2.3 2.9 2.2 1.1 0 1.6-.7 3-.7s1.9.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.8-1.1-2.8-3.5ZM14.4 6.4c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3Z"/></svg>;
}

function EyeMark({ visible }: { visible: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="px-eye-icon"><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6"/>{visible && <path d="m4 20 16-16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>}</svg>;
}

export default function Onboarding({ onComplete, initialNotice }: Props) {
  const [language, setLanguage] = useState<Language>("fa");
  const [countryCode, setCountryCode] = useState("IR");
  const [countrySearch, setCountrySearch] = useState("");
  const [regional, setRegional] = useState({ currency: "IRR", calendar: "persian", digits: "arabext", dateFormat: "YYYY/MM/DD", weekStart: "saturday" as "saturday" | "sunday" | "monday" });
  const [stage, setStage] = useState<Stage>("country");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileName, setProfileName] = useState("");
  const [avatar, setAvatar] = useState("✦");
  const [photo, setPhoto] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [resetTokenMode, setResetTokenMode] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const t = (key: string) => copy[language]?.[key] || copy.en?.[key] || key;
  const dir = languageByCode.get(language)?.rtl ? "rtl" : "ltr";
  const translationAvailable = Boolean(copy[language]);

  useEffect(() => { if (initialNotice) setNotice(initialNotice); }, [initialNotice]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const googleToken = hash.get("google_token");
    const googleError = hash.get("google_error");
    if (googleToken) {
      setSession(googleToken);
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      apiRequest<{user:User}>("/auth/me").then(data => {
        setUser(data.user);
        setEmail(data.user.email);
        onComplete(data.user, language);
      }).catch(() => { localStorage.removeItem("projectx-token"); setNotice("ورود با Google کامل نشد؛ دوباره تلاش کن."); });
    } else if (googleError) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      setNotice(googleError);
    }
  }, [onComplete]);

  useEffect(() => {
    const saved = localStorage.getItem("projectx-language") as Language | null;
    const savedCountry = localStorage.getItem("projectx-country") || "IR";
    const savedPrefs = (() => { try { return JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}"); } catch { return {}; } })();
    const selectedCountry = countries.find(item => item.code === savedCountry);
    if (saved && languageByCode.has(saved)) setLanguage(saved);
    setCountryCode(savedCountry);
    if (selectedCountry) {
      setRegional({
        currency: localStorage.getItem("novyra-finance-currency") || selectedCountry.defaultCurrency || "USD",
        calendar: savedPrefs.calendar || selectedCountry.defaultCalendar,
        digits: savedPrefs.digits || selectedCountry.defaultNumberSystem,
        dateFormat: savedPrefs.dateFormat || getDateFormat(selectedCountry.defaultLanguage, selectedCountry.code),
        weekStart: savedPrefs.firstDay || selectedCountry.weekStart
      });
      if (!saved) setLanguage(selectedCountry.defaultLanguage as Language);
    }
    const reset = new URLSearchParams(window.location.search).get("reset");
    if (reset) {
      localStorage.setItem("projectx-reset-token", reset);
      setStage("auth");
      setMode("login");
      setRecoveryMode(true);
      setResetTokenMode(true);
    }
    const activeLanguage = saved && languageByCode.has(saved) ? saved : (selectedCountry?.defaultLanguage || "en");
    document.documentElement.lang = activeLanguage;
    document.documentElement.dir = languageByCode.get(activeLanguage)?.rtl ? "rtl" : "ltr";
  }, []);

  function chooseLanguage(next: Language) {
    setLanguage(next);
  }
  function getDateFormat(locale: string, country: string) {
    if (country === "IR") return "YYYY/MM/DD";
    const parts = new Intl.DateTimeFormat(locale || "en", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(2025, 10, 24));
    return parts.map(part => part.type === "year" ? "YYYY" : part.type === "month" ? "MM" : part.type === "day" ? "DD" : part.value).join("");
  }
  function applyCountry(nextCode: string) {
    const selected = countries.find(item => item.code === nextCode);
    if (!selected) return;
    const nextLanguage = languageByCode.has(selected.defaultLanguage) ? selected.defaultLanguage as Language : "en";
    setCountryCode(nextCode);
    setLanguage(nextLanguage);
    setRegional({
      currency: selected.defaultCurrency || "USD",
      calendar: selected.defaultCalendar,
      digits: selected.defaultNumberSystem,
      dateFormat: getDateFormat(nextLanguage, selected.code),
      weekStart: selected.weekStart
    });
  }
  function persistRegionalPreferences() {
    localStorage.setItem("projectx-country", countryCode);
    localStorage.setItem("projectx-language", language);
    localStorage.setItem("novyra-finance-currency", regional.currency);
    localStorage.setItem("novyra-date-format", regional.dateFormat);
    const previous = (() => { try { return JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}"); } catch { return {}; } })();
    localStorage.setItem("novyra-preferences-v1", JSON.stringify({
      ...previous, country: countryCode, calendar: regional.calendar, digits: regional.digits,
      firstDay: regional.weekStart, dateFormat: regional.dateFormat
    }));
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }
  function continueCountry() {
    persistRegionalPreferences();
    localStorage.setItem("projectx-first-run-complete", "1");
    if (localStorage.getItem("projectx-token")) onComplete(null, language);
    else setStage("auth");
  }
  async function submitAuth() {
    if (busy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setNotice(t("invalidEmail")); return; }
    if (password.length < 10) { setNotice(t("weakPassword")); return; }
    if (mode === "signup" && !name.trim()) { setNotice(t("missingName")); return; }
    if (mode === "signup" && password !== confirmPassword) { setNotice(t("passwordMismatch")); return; }
    setBusy(true); setNotice("");
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      let credentials: Record<string, string>;
      if (mode === "signup") {
        const salt = createPasswordSalt();
        const passwordHash = await derivePasswordHash(password, salt);
        credentials = { email: cleanEmail, name: name.trim(), salt, passwordHash };
      } else {
        const challenge = await apiRequest<{salt:string}>(`/auth/password-salt?email=${encodeURIComponent(cleanEmail)}`);
        if (challenge.salt === "AAAAAAAAAAAAAAAAAAAAAA") {
          setNotice(language === "en" ? "No account found. Create an account first." : "حسابی با این ایمیل پیدا نشد؛ ابتدا ثبت‌نام کنید.");
          return;
        }
        const passwordHash = await derivePasswordHash(password, challenge.salt);
        credentials = { email: cleanEmail, passwordHash };
      }
      const data = await apiRequest<{token:string;user:User;verificationSent?:boolean;emailVerificationRequired?:boolean}>(endpoint, {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      setSession(data.token);
      localStorage.setItem("projectx-account", JSON.stringify({ name: data.user.displayName || name.trim(), email: data.user.email }));
      const signedInUser = { ...data.user, displayName: data.user.displayName || name.trim() };
      setUser(signedInUser);
      setProfileName(signedInUser.displayName);
      setEmail(signedInUser.email);
      setPassword(""); setConfirmPassword("");
      if (mode === "signup") {
        try { const key = "novyra-events:" + signedInUser.id; const events = JSON.parse(localStorage.getItem(key) || "[]"); events.push({ name: "signup", at: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(events.slice(-500))); } catch {}
        localStorage.setItem("projectx-profile-complete:" + signedInUser.id, "1");
        localStorage.setItem("projectx-account", JSON.stringify({ name: signedInUser.displayName, email: signedInUser.email }));
      } else {
        localStorage.setItem("projectx-profile-complete:" + signedInUser.id, "1");
      }
      onComplete(signedInUser, language);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("authError"));
    } finally {
      setBusy(false);
    }
  }
  async function saveGooglePassword() {
    if (password.length < 10) { setNotice(t("weakPassword")); return; }
    if (password !== confirmPassword) { setNotice(t("passwordMismatch")); return; }
    setBusy(true); setNotice("");
    try {
      const salt = createPasswordSalt();
      const passwordHash = await derivePasswordHash(password, salt);
      await apiRequest("/auth/set-password", { method: "POST", body: JSON.stringify({ salt, passwordHash }) });
      setPassword(""); setConfirmPassword("");
      if (user && localStorage.getItem("projectx-profile-complete:" + user.id) === "1") onComplete(user, language);
      else setStage("profile");
      setNotice(language === "en" ? "Password saved. You can now sign in with email and password." : "رمز عبور ذخیره شد؛ از این پس می‌توانی با ایمیل و رمز وارد شوی.");
    } catch (error) { setNotice(error instanceof Error ? error.message : t("authError")); }
    finally { setBusy(false); }
  }
  function skipGooglePassword() {
    if (user && localStorage.getItem("projectx-profile-complete:" + user.id) === "1") onComplete(user, language);
    else setStage("profile");
  }
  async function requestRecovery() {
    if (busy) return;
    const recoveryEmail = email.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) { setNotice(t("invalidEmail")); return; }
    setBusy(true); setNotice("");
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: recoveryEmail }) });
      setNotice(t("emailSent"));
    } catch (error) { setNotice(error instanceof Error ? error.message : t("authError")); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    const token = localStorage.getItem("projectx-reset-token") || "";
    if (password.length < 10) { setNotice(t("weakPassword")); return; }
    if (password !== confirmPassword) { setNotice(t("passwordMismatch")); return; }
    setBusy(true); setNotice("");
    try {
      const salt = createPasswordSalt();
      const passwordHash = await derivePasswordHash(password, salt);
      await apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, salt, passwordHash }) });
      localStorage.removeItem("projectx-reset-token");
      setRecoveryMode(false); setResetTokenMode(false); setPassword(""); setConfirmPassword("");
      setNotice(language === "en" ? "Password updated. Sign in with your new password." : "رمز عبور تغییر کرد. با رمز جدید وارد شوید.");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) { setNotice(error instanceof Error ? error.message : t("authError")); }
    finally { setBusy(false); }
  }
  function socialUnavailable() {
    window.location.assign(`${API_BASE}/auth/google/start`);
  }
  function appleUnavailable() {
    setNotice(language === "en" ? "Apple sign-in is not configured yet." : "ورود با Apple هنوز پیکربندی نشده است.");
  }
  function handlePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setNotice(t("photoError")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 512;
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return;
        const crop = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, size, size);
        setPhoto(canvas.toDataURL("image/jpeg", 0.82));
        setAvatar("");
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
  async function finishProfile(skip = false) {
    if (!user) return;
    const cleanName = profileName.trim() || user.displayName;
    setBusy(true);
    try {
      if (!skip && cleanName !== user.displayName) {
        await apiRequest("/auth/profile", { method: "PATCH", body: JSON.stringify({ name: cleanName }) });
      }
      if (photo) localStorage.setItem("projectx-avatar:" + user.id, photo);
      else if (avatar) localStorage.setItem("projectx-avatar:" + user.id, avatar);
      localStorage.setItem("projectx-profile-complete:" + user.id, "1");
      localStorage.setItem("projectx-account", JSON.stringify({ name: skip ? user.displayName : cleanName, email: user.email }));
      onComplete({ ...user, displayName: skip ? user.displayName : cleanName }, language);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("authError"));
    } finally { setBusy(false); }
  }

  return (
    <main className={"px-onboarding" + (stage === "language" ? " px-language-screen" : "")} dir={dir} lang={language}>
      <div className="px-ambient px-ambient-one" /><div className="px-ambient px-ambient-two" />
      <div className="px-glass-orbit px-orbit-one" /><div className="px-glass-orbit px-orbit-two" />
      <header className="px-onboarding-brand"><span className="px-logo"><NovyraMark /></span><span className="px-brand-wordmark">NOVYRA</span></header>
      <section className="px-onboarding-stage">
        {stage === "country" && <div className="px-glass-panel px-language-panel">
          <div className="px-eyebrow">NOVYRA / YOUR REGION</div>
          <h1>{language === "fa" ? "کشور خود را انتخاب کنید" : "Choose your country"}</h1>
          <p className="px-stage-subtitle">{language === "fa" ? "تنظیمات منطقه‌ای به‌صورت خودکار اعمال می‌شوند و می‌توانید پیش از ادامه آن‌ها را ویرایش کنید." : "Regional preferences apply instantly. Review and edit them before continuing."}</p>
          <input aria-label="Search countries" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder={language === "fa" ? "جست‌وجوی کشور..." : "Search countries..."} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(120,130,150,.28)",background:"rgba(255,255,255,.72)",marginBottom:10}} />
          <div role="listbox" aria-label="Countries" style={{maxHeight:190,overflowY:"auto",display:"grid",gap:6,textAlign:"start"}}>
            {countries.filter(item => [item.name,item.nativeName,item.code].some(value => value.toLowerCase().includes(countrySearch.trim().toLowerCase()))).map(item =>
              <button type="button" key={item.code} onClick={() => applyCountry(item.code)} aria-selected={countryCode===item.code} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:countryCode===item.code?"1px solid #5776a5":"1px solid rgba(120,130,150,.18)",background:countryCode===item.code?"rgba(87,118,165,.12)":"rgba(255,255,255,.35)",textAlign:"start",cursor:"pointer"}}>
                <span style={{fontSize:20}}>{item.flag}</span><span style={{flex:1}}>{item.name} · {item.code}</span>{countryCode===item.code?"✓":""}
              </button>
            )}
          </div>
          <div style={{marginTop:16,padding:14,borderRadius:14,border:"1px solid rgba(120,130,150,.24)",background:"rgba(255,255,255,.42)",display:"grid",gap:10}}>
            <strong>{language === "fa" ? "پیش‌نمایش تنظیمات" : "Editable preferences preview"}</strong>
            <label>{language === "fa" ? "زبان" : "Language"} <select value={language} onChange={e=>chooseLanguage(e.target.value as Language)} style={{width:"100%"}}>{languages.map(item=><option key={item.code} value={item.code}>{item.nativeName} · {item.name}</option>)}</select></label>
            <div>{language === "fa" ? "جهت نوشتار" : "Text direction"}: <b>{dir.toUpperCase()}</b></div>
            {!translationAvailable && <small role="status">Translation not available yet — English fallback is active.</small>}
            <label>{language === "fa" ? "واحد پول" : "Currency"} <select value={regional.currency} onChange={e=>setRegional(v=>({...v,currency:e.target.value}))} style={{width:"100%"}}>{currencies.map(item=><option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select></label>
            <label>{language === "fa" ? "تقویم" : "Calendar"} <select value={regional.calendar} onChange={e=>setRegional(v=>({...v,calendar:e.target.value}))} style={{width:"100%"}}>{calendars.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label>{language === "fa" ? "نمایش ارقام" : "Number system"} <select value={regional.digits} onChange={e=>setRegional(v=>({...v,digits:e.target.value}))} style={{width:"100%"}}>{numberSystems.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label>{language === "fa" ? "قالب تاریخ" : "Date format"} <select value={regional.dateFormat} onChange={e=>setRegional(v=>({...v,dateFormat:e.target.value}))} style={{width:"100%"}}>{["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","YYYY/MM/DD"].map(item=><option key={item}>{item}</option>)}</select></label>
            <label>{language === "fa" ? "اولین روز هفته" : "First day of week"} <select value={regional.weekStart} onChange={e=>setRegional(v=>({...v,weekStart:e.target.value as "saturday"|"sunday"|"monday"}))} style={{width:"100%"}}>{weekdays.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          </div>
          <button className="px-primary-action" onClick={continueCountry}>{language === "fa" ? "ادامه" : "Continue"} <span>↗</span></button>
          <p className="px-footnote">{language === "fa" ? "هر زمان می‌توانید این موارد را در تنظیمات تغییر دهید." : "You can change these preferences anytime in Settings."}</p>
        </div>}
        
        {stage === "auth" && <div className="px-glass-panel px-auth-panel">
          <div className="px-auth-emblem" aria-label="NOVYRA"><NovyraMark /></div>
          <div className="px-eyebrow">NOVYRA / {recoveryMode ? "ACCOUNT RECOVERY" : "YOUR SPACE"}</div>
          <h1>{recoveryMode ? t("resetTitle") : mode === "login" ? t("loginTitle") : t("signupTitle")}</h1>
          <p className="px-stage-subtitle">{recoveryMode ? (resetTokenMode ? t("minPassword") : t("recoverySub")) : mode === "login" ? t("loginSub") : t("signupSub")}</p>
          {!recoveryMode && <div className="px-social-stack">
            <button type="button" className="px-social-button px-google-button" onClick={socialUnavailable}><GoogleMark/><span>{t("google")}</span></button>
            
          </div>}
          {!recoveryMode && <div className="px-separator"><span>{t("or")}</span></div>}
          {!recoveryMode && mode === "signup" && <label className="px-field"><span>{t("name")}</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder={t("name")} /></label>}
          {(!recoveryMode || !resetTokenMode) && <label className="px-field"><span>{t("email")}</span><input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>}
          {(!recoveryMode || resetTokenMode) && <label className="px-field"><span>{t("password")}</span><span className="px-password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={recoveryMode ? "new-password" : mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("minPassword")} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeMark visible={showPassword}/></button></span></label>}
          {(resetTokenMode || (!recoveryMode && mode === "signup")) && <label className="px-field"><span>{t("confirm")}</span><span className="px-password-wrap"><input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirm")} /><button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Hide password" : "Show password"}><EyeMark visible={showConfirm}/></button></span></label>}
          {mode === "login" && !recoveryMode && <button type="button" className="px-forgot-link" onClick={() => { setRecoveryMode(true); setResetTokenMode(false); setNotice(""); }}>{t("forgot")}</button>}
          <button type="button" className="px-primary-action" disabled={busy} onClick={recoveryMode ? (resetTokenMode ? resetPassword : requestRecovery) : submitAuth}>{busy ? "..." : recoveryMode ? (resetTokenMode ? t("updatePassword") : t("sendReset")) : mode === "login" ? t("signIn") : t("create")} <span>↗</span></button>
          {!recoveryMode && <div className="px-switch-mode"><span>{mode === "login" ? t("noAccount") : t("haveAccount")}</span><button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(""); }}>{mode === "login" ? t("createLink") : t("loginLink")}</button></div>}
          {recoveryMode && <button className="px-switch-mode px-back-link" onClick={() => { setRecoveryMode(false); setResetTokenMode(false); setNotice(""); }}>{t("back")}</button>}
          <p className="px-auth-security">{language === "en" ? "SECURE ACCESS · NOVYRA" : language === "ckb" ? "چوونەژوورەوەی پارێزراو · NOVYRA" : language === "ar" ? "دخول آمن · NOVYRA" : "ورود امن · NOVYRA"}</p>
        </div>}

        {false && stage === "passwordSetup" && <div className="px-glass-panel px-auth-panel">
          <div className="px-eyebrow">NOVYRA / ACCOUNT SECURITY</div>
          <h1>{language === "en" ? "Create a password" : "تعیین رمز عبور"}</h1>
          <p className="px-stage-subtitle">{language === "en" ? "Your Google account is connected. Add a password so you can also sign in with email." : "حساب Google متصل شد. برای ورود با ایمیل نیز یک رمز عبور تعیین کن."}</p>
          <label className="px-field"><span>{t("password")}</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("minPassword")} /></label>
          <label className="px-field"><span>{t("confirm")}</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirm")} /></label>
          <button type="button" className="px-primary-action" disabled={busy} onClick={saveGooglePassword}>{busy ? "..." : (language === "en" ? "Save password" : "ذخیره رمز عبور")} <span>↗</span></button>
          <button type="button" className="px-skip-action" disabled={busy} onClick={skipGooglePassword}>{language === "en" ? "Skip for now" : "فعلاً رد می‌کنم"}</button>
        </div>}
        {false && stage === "profile" && <div className="px-glass-panel px-profile-panel">
          <div className="px-eyebrow">NOVYRA / PERSONAL PROFILE</div>
          <div className="px-profile-preview">{photo ? <img src={photo} alt="Profile preview" /> : <span>{avatar || (profileName || user?.displayName || "N").slice(0, 1)}</span>}</div>
          <h1>{t("profileTitle")}</h1><p className="px-stage-subtitle">{t("profileSub")}</p>
          <div className="px-avatar-heading">{t("readyAvatars")}</div>
          <div className="px-avatar-grid">{avatarChoices.map(item => <button key={item} className={"px-avatar-choice" + (avatar === item && !photo ? " is-selected" : "")} onClick={() => { setAvatar(item); setPhoto(""); }} aria-label={"Avatar " + item}>{item}</button>)}</div>
          <input ref={fileInput} className="px-file-input" type="file" accept="image/*" onChange={e => handlePhoto(e.target.files?.[0])} />
          <button className="px-upload-button" onClick={() => fileInput.current?.click()}>{photo ? t("changePhoto") : t("upload")} <span>↥</span></button>
          <label className="px-field"><span>{t("displayName")}</span><input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={32} /></label>
          <button className="px-primary-action" disabled={busy} onClick={() => finishProfile(false)}>{busy ? "..." : t("finish")} <span>↗</span></button>
          <button className="px-skip-action" disabled={busy} onClick={() => finishProfile(true)}>{t("skip")}</button>
        </div>}
      </section>
      {notice && <div className="px-onboarding-notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <footer className="px-onboarding-footer"><span>NOVYRA</span><i /> <span>BUILT FOR YOUR MOMENTS</span></footer>
    </main>
  );
}
