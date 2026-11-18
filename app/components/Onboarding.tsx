"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest, setSession, createPasswordSalt, derivePasswordHash } from "../lib/api";

type Language = "en" | "fa" | "ar" | "ku";
type User = { id: string; email: string; displayName: string; xp: number; gamesPlayed: number; role?: string };
type Props = { onComplete: (user: User | null, language: Language) => void };
type Stage = "language" | "auth" | "profile" | "passwordSetup";
type Mode = "login" | "signup";

const copy: Record<Language, Record<string, string>> = {
  en: {
    choose: "Choose your language", chooseSub: "Select the language you want to use across NOVYRA.",
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
    back: "Back", resetTitle: "Reset your password", sendReset: "Send recovery link",
    passwordMismatch: "Passwords do not match.", authError: "Something went wrong. Please try again.",
    invalidEmail: "Enter a valid email address.", weakPassword: "Password must be at least 10 characters.",
    missingName: "Enter your name.", photoError: "Choose an image file smaller than 8 MB."
  },
  fa: {
    choose: "زبان خود را انتخاب کنید", chooseSub: "زبان مورد نظرتان را برای تمام بخش‌های NOVYRA انتخاب کنید.",
    continue: "ادامه", languageNote: "هر زمان بخواهید می‌توانید از تنظیمات زبان را تغییر دهید.",
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
    back: "بازگشت", resetTitle: "بازیابی رمز عبور", sendReset: "ارسال لینک بازیابی",
    passwordMismatch: "رمزهای عبور یکسان نیستند.", authError: "مشکلی پیش آمد. دوباره تلاش کنید.",
    invalidEmail: "یک ایمیل معتبر وارد کنید.", weakPassword: "رمز عبور باید حداقل ۱۰ نویسه باشد.",
    missingName: "نام خود را وارد کنید.", photoError: "یک تصویر کوچک‌تر از ۸ مگابایت انتخاب کنید."
  },
  ar: {
    choose: "اختر لغتك", chooseSub: "اختر اللغة التي تريد استخدامها في جميع أنحاء NOVYRA.",
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
    back: "رجوع", resetTitle: "إعادة تعيين كلمة المرور", sendReset: "إرسال رابط الاستعادة",
    passwordMismatch: "كلمتا المرور غير متطابقتين.", authError: "حدث خطأ. حاول مرة أخرى.",
    invalidEmail: "أدخل بريداً إلكترونياً صالحاً.", weakPassword: "يجب أن تتكون كلمة المرور من ١٠ أحرف على الأقل.",
    missingName: "أدخل اسمك.", photoError: "اختر صورة يقل حجمها عن ٨ ميغابايت."
  },
  ku: {
    choose: "زمانی خۆت هەڵبژێرە", chooseSub: "زمانی بەکارهێنانی هەموو بەشەکانی NOVYRA هەڵبژێرە.",
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
    back: "گەڕانەوە", resetTitle: "نوێکردنەوەی وشەی نهێنی", sendReset: "ناردنی بەستەری گەڕاندنەوە",
    passwordMismatch: "وشە نهێنییەکان یەکسان نین.", authError: "هەڵەیەک ڕوویدا. دووبارە هەوڵ بدەوە.",
    invalidEmail: "ئیمەیڵێکی دروست بنووسە.", weakPassword: "وشەی نهێنی دەبێت لانیکەم ١٠ پیت بێت.",
    missingName: "ناوەکەت بنووسە.", photoError: "وێنەیەک هەڵبژێرە کە لە ٨ مێگابایت بچووکتر بێت."
  }
};

const avatarChoices = ["✦", "🌙", "🦊", "🐼", "🐺", "🦁", "🐸", "🐙", "🪐", "⚡", "🌊", "🦋"];

function NovyraMark() {
  // Match the exact X monogram used by the live NOVYRA app navigation.
  return <span className="px-real-brand-mark" aria-hidden="true">N</span>;
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

export default function Onboarding({ onComplete }: Props) {
  const [language, setLanguage] = useState<Language>("en");
  const [stage, setStage] = useState<Stage>("language");
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
  const fileInput = useRef<HTMLInputElement>(null);
  const t = (key: string) => copy[language][key] || key;
  const dir = language === "en" ? "ltr" : "rtl";

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const googleToken = hash.get("google_token");
    const googleError = hash.get("google_error");
    if (googleToken) {
      setSession(googleToken);
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      apiRequest<{user:User}>("/auth/me").then(data => {
        setUser(data.user);
        setProfileName(data.user.displayName || "");
        setEmail(data.user.email);
        const savedLanguage=(localStorage.getItem("projectx-language") as Language) || "en";
        setStage("passwordSetup");
      }).catch(() => { localStorage.removeItem("projectx-token"); setNotice("ورود با Google کامل نشد؛ دوباره تلاش کن."); });
    } else if (googleError) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      setNotice(googleError);
    }
  }, [onComplete]);

  useEffect(() => {
    const saved = localStorage.getItem("projectx-language") as Language | null;
    if (saved && copy[saved]) {
      setLanguage(saved);
      // Language selection is always the first screen for a signed-out visitor.
      // Do not auto-advance merely because a language was saved previously.
      if (!localStorage.getItem("projectx-token")) setStage("language");
    }
    const reset = new URLSearchParams(window.location.search).get("reset");
    if (reset) {
      localStorage.setItem("projectx-reset-token", reset);
      setStage("auth");
      setMode("login");
      setRecoveryMode(true);
    }
    document.documentElement.lang = saved || "en";
    document.documentElement.dir = saved === "en" ? "ltr" : "rtl";
  }, []);

  function chooseLanguage(next: Language) {
    setLanguage(next);
  }
  function continueLanguage() {
    localStorage.setItem("projectx-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
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
      setUser(data.user);
      setProfileName(data.user.displayName || name);
      setEmail(data.user.email);
      setPassword(""); setConfirmPassword("");
      if (mode === "signup") {
        setStage("profile");
        if (data.verificationSent) setNotice(language === "en" ? "Check your email to verify your account." : "لینک تأیید ایمیل را بررسی کنید.");
        else if (data.emailVerificationRequired) setNotice(language === "en" ? "Email verification is required, but email delivery is not configured yet." : "تأیید ایمیل لازم است؛ سرویس ارسال ایمیل هنوز تنظیم نشده است.");
      } else {
        localStorage.setItem("projectx-profile-complete:" + data.user.id, "1");
        onComplete(data.user, language);
      }
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
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setNotice(t("invalidEmail")); return; }
    setBusy(true); setNotice("");
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
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
      setRecoveryMode(false); setPassword(""); setConfirmPassword("");
      setNotice(language === "en" ? "Password updated. Sign in with your new password." : "رمز عبور تغییر کرد. با رمز جدید وارد شوید.");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) { setNotice(error instanceof Error ? error.message : t("authError")); }
    finally { setBusy(false); }
  }
  function socialUnavailable() {
    window.location.assign("https://project-x-api.projectx-novyratam.workers.dev/auth/google/start");
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
      onComplete({ ...user, displayName: skip ? user.displayName : cleanName }, language);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("authError"));
    } finally { setBusy(false); }
  }

  return (
    <main className="px-onboarding" dir={dir} lang={language}>
      <div className="px-ambient px-ambient-one" /><div className="px-ambient px-ambient-two" />
      <div className="px-glass-orbit px-orbit-one" /><div className="px-glass-orbit px-orbit-two" />
      <header className="px-onboarding-brand"><span className="px-logo"><NovyraMark /></span><span className="px-brand-wordmark">NOVYRA</span></header>
      <section className="px-onboarding-stage">
        {stage === "language" && <div className="px-glass-panel px-language-panel">
          <div className="px-eyebrow">NOVYRA / YOUR EXPERIENCE</div>
          <div className="px-language-brand-emblem" aria-label="NOVYRA"><span className="px-language-brand-x"><NovyraMark /></span><span className="px-language-brand-name">PROJECT <b>X</b></span></div>
          <h1>{t("choose")}</h1><p className="px-stage-subtitle">{t("chooseSub")}</p>
          <div className="px-language-grid">
            {([
              ["en", "English"],
              ["fa", "فارسی"],
              ["ar", "العربية"],
              ["ku", "کوردی"]
            ] as [Language, string][]).map(([code, label]) => <button type="button" key={code} className={"px-language-option" + (language === code ? " is-selected" : "")} onClick={() => chooseLanguage(code)} aria-pressed={language === code}>
              <span className="px-language-label">{label}</span><span className="px-radio">{language === code ? "✓" : ""}</span>
            </button>)}
          </div>
          <button className="px-primary-action" onClick={continueLanguage}>{t("continue")} <span>↗</span></button>
          <p className="px-footnote">{t("languageNote")}</p>
        </div>}

        {stage === "auth" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-button" onClick={() => setStage("language")} aria-label={t("back")}>←</button>
          <div className="px-auth-emblem"><span>N</span><i /><b /></div>
          <div className="px-eyebrow">NOVYRA / {recoveryMode ? "ACCOUNT RECOVERY" : "YOUR SPACE"}</div>
          <h1>{recoveryMode ? t("resetTitle") : mode === "login" ? t("loginTitle") : t("signupTitle")}</h1>
          <p className="px-stage-subtitle">{recoveryMode ? t("minPassword") : mode === "login" ? t("loginSub") : t("signupSub")}</p>
          {!recoveryMode && <div className="px-social-stack">
            <button type="button" className="px-social-button px-google-button" onClick={socialUnavailable}><GoogleMark/><span>{t("google")}</span></button>
            <button type="button" className="px-social-button px-apple-button" onClick={appleUnavailable}><AppleMark/><span>{t("apple")}</span></button>
          </div>}
          {!recoveryMode && <div className="px-separator"><span>{t("or")}</span></div>}
          {!recoveryMode && mode === "signup" && <label className="px-field"><span>{t("name")}</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder={t("name")} /></label>}
          {!recoveryMode && <label className="px-field"><span>{t("email")}</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>}
          <label className="px-field"><span>{recoveryMode ? t("password") : t("password")}</span><span className="px-password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={recoveryMode ? "new-password" : mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("minPassword")} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeMark visible={showPassword}/></button></span></label>
          {(recoveryMode || mode === "signup") && <label className="px-field"><span>{t("confirm")}</span><span className="px-password-wrap"><input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirm")} /><button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Hide password" : "Show password"}><EyeMark visible={showConfirm}/></button></span></label>}
          {mode === "login" && !recoveryMode && <button type="button" className="px-forgot-link" onClick={requestRecovery}>{t("forgot")}</button>}
          <button type="button" className="px-primary-action" disabled={busy} onClick={recoveryMode ? resetPassword : submitAuth}>{busy ? "..." : recoveryMode ? t("sendReset") : mode === "login" ? t("signIn") : t("create")} <span>↗</span></button>
          {!recoveryMode && <div className="px-switch-mode"><span>{mode === "login" ? t("noAccount") : t("haveAccount")}</span><button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setNotice(""); }}>{mode === "login" ? t("createLink") : t("loginLink")}</button></div>}
          {recoveryMode && <button className="px-switch-mode px-back-link" onClick={() => setRecoveryMode(false)}>{t("back")}</button>}
          <p className="px-auth-security">SECURE ACCESS · NOVYRA</p>
        </div>}

        {stage === "passwordSetup" && <div className="px-glass-panel px-auth-panel">
          <div className="px-eyebrow">NOVYRA / ACCOUNT SECURITY</div>
          <h1>{language === "en" ? "Create a password" : "تعیین رمز عبور"}</h1>
          <p className="px-stage-subtitle">{language === "en" ? "Your Google account is connected. Add a password so you can also sign in with email." : "حساب Google متصل شد. برای ورود با ایمیل نیز یک رمز عبور تعیین کن."}</p>
          <label className="px-field"><span>{t("password")}</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t("minPassword")} /></label>
          <label className="px-field"><span>{t("confirm")}</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirm")} /></label>
          <button type="button" className="px-primary-action" disabled={busy} onClick={saveGooglePassword}>{busy ? "..." : (language === "en" ? "Save password" : "ذخیره رمز عبور")} <span>↗</span></button>
          <button type="button" className="px-skip-action" disabled={busy} onClick={skipGooglePassword}>{language === "en" ? "Skip for now" : "فعلاً رد می‌کنم"}</button>
        </div>}
        {stage === "profile" && <div className="px-glass-panel px-profile-panel">
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
