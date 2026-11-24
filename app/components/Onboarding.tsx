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
type User = { id: string; email: string; displayName: string; xp: number; gamesPlayed: number; role?: string; profile?: { firstName?:string; lastName?:string; country?:string; currency?:string; calendar?:string; numberFormat?:string; weekStart?:"saturday"|"sunday"|"monday"; language?:Language; accountType?:"personal"|"business"; appLockType?:"none"|"pin"|"pattern"|"biometric"; onboardingCompleted?:boolean } };
type Props = { onComplete: (user: User | null, language: Language) => void; initialNotice?: string };
type Stage = "welcome" | "firstName" | "lastName" | "email" | "country" | "password" | "appLock" | "accountType" | "login" | "profile" | "passwordSetup";
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

const flowCopy: Partial<Record<Language, Record<string,string>>> = {
en:{welcomeTitle:"Welcome to NOVYRA",welcomeSub:"Your space, your way.",noAccountFound:"No account found. Create an account first.",googleFailed:"Google sign-in did not complete. Please try again.",showPassword:"Show password",hidePassword:"Hide password",clearPattern:"Clear pattern",countrySub:"Regional preferences apply instantly. Review and edit them before continuing.",languageNote:"You can change these preferences anytime in Settings.",signUp:"Sign up",logIn:"Log in",firstName:"First name",lastName:"Last name",next:"Continue",searchCountry:"Search countries",language:"UI language",direction:"Direction",currency:"Currency",calendar:"Calendar",dateFormat:"Date format",numberSystem:"Number system",weekStart:"First day of week",lockTitle:"Protect your app",lockExplain:"An app lock helps protect private information when family or others use your phone. Change it later in Settings > Security.",noLock:"No app lock",pin:"PIN",pattern:"Pattern",biometric:"Fingerprint / Face ID",lockSecret:"Create PIN or pattern",accountType:"Choose account type",personal:"Personal",business:"Business",createAccount:"Create account",emailUsed:"This email is already registered. Log in or use Google.",emailCheck:"Checking email…",back:"Back",weak:"Weak",medium:"Medium",strong:"Strong",emailInvalid:"Enter a valid email address.",firstRequired:"Enter your first name.",lastRequired:"Enter your last name.",lockRequired:"Enter a PIN or pattern, or skip app lock.",biometricUnsupported:"Biometric lock is not supported by this browser or device. Choose PIN, pattern, or skip.",translationMissing:"Translation not available yet — English fallback is active."},
fa:{welcomeTitle:"به نوویرا خوش آمدید",welcomeSub:"فضای شما، به روش شما.",noAccountFound:"حسابی با این ایمیل پیدا نشد؛ ابتدا ثبت‌نام کنید.",googleFailed:"ورود با Google کامل نشد؛ دوباره تلاش کنید.",showPassword:"نمایش رمز",hidePassword:"پنهان‌کردن رمز",clearPattern:"پاک‌کردن الگو",countrySub:"تنظیمات منطقه‌ای فوراً اعمال می‌شوند و پیش از ادامه می‌توانید آن‌ها را ویرایش کنید.",languageNote:"هر زمان می‌توانید این تنظیمات را در بخش تنظیمات تغییر دهید.",signUp:"ثبت‌نام",logIn:"ورود",firstName:"نام",lastName:"نام خانوادگی",next:"ادامه",searchCountry:"جست‌وجوی کشور",language:"زبان برنامه",direction:"جهت نوشتار",currency:"واحد پول",calendar:"تقویم",dateFormat:"قالب تاریخ",numberSystem:"سیستم ارقام",weekStart:"اولین روز هفته",lockTitle:"از برنامه محافظت کنید",lockExplain:"قفل برنامه هنگام استفاده خانواده یا دیگران از تلفن، به محافظت از اطلاعات خصوصی کمک می‌کند. بعداً از تنظیمات > امنیت قابل تغییر است.",noLock:"بدون قفل",pin:"رمز عددی",pattern:"الگو",biometric:"اثر انگشت / تشخیص چهره",lockSecret:"ساخت رمز یا الگو",accountType:"نوع حساب را انتخاب کنید",personal:"شخصی",business:"تجاری",createAccount:"ایجاد حساب",emailUsed:"این ایمیل قبلاً ثبت شده است. وارد شوید یا از Google استفاده کنید.",emailCheck:"در حال بررسی ایمیل…",back:"بازگشت",weak:"ضعیف",medium:"متوسط",strong:"قوی",emailInvalid:"ایمیل معتبر وارد کنید.",firstRequired:"نام را وارد کنید.",lastRequired:"نام خانوادگی را وارد کنید.",lockRequired:"رمز یا الگو را وارد کنید یا قفل را رد کنید.",biometricUnsupported:"قفل زیست‌سنجی در این مرورگر یا دستگاه پشتیبانی نمی‌شود. رمز، الگو یا ردکردن را انتخاب کنید.",translationMissing:"ترجمه هنوز آماده نیست؛ زبان انگلیسی نمایش داده می‌شود."},
ar:{welcomeTitle:"مرحباً بك في NOVYRA",welcomeSub:"مساحتك، بطريقتك.",noAccountFound:"لم يتم العثور على حساب بهذا البريد. أنشئ حساباً أولاً.",googleFailed:"لم يكتمل تسجيل الدخول عبر Google. حاول مرة أخرى.",showPassword:"إظهار كلمة المرور",hidePassword:"إخفاء كلمة المرور",clearPattern:"مسح النمط",countrySub:"تُطبّق الإعدادات الإقليمية فوراً ويمكنك تعديلها قبل المتابعة.",languageNote:"يمكنك تغيير هذه الإعدادات في أي وقت من الإعدادات.",signUp:"إنشاء حساب",logIn:"تسجيل الدخول",firstName:"الاسم الأول",lastName:"اسم العائلة",next:"متابعة",searchCountry:"ابحث عن دولة",language:"لغة التطبيق",direction:"اتجاه الكتابة",currency:"العملة",calendar:"التقويم",dateFormat:"تنسيق التاريخ",numberSystem:"نظام الأرقام",weekStart:"أول يوم في الأسبوع",lockTitle:"احمِ التطبيق",lockExplain:"يساعد قفل التطبيق في حماية معلوماتك الخاصة عندما يستخدم أفراد العائلة أو غيرهم هاتفك. يمكنك تغييره لاحقاً من الإعدادات > الأمان.",noLock:"بدون قفل",pin:"رمز PIN",pattern:"نمط",biometric:"بصمة / Face ID",lockSecret:"أنشئ رمزاً أو نمطاً",accountType:"اختر نوع الحساب",personal:"شخصي",business:"تجاري",createAccount:"إنشاء الحساب",emailUsed:"هذا البريد مسجل بالفعل. سجّل الدخول أو استخدم Google.",emailCheck:"جارٍ التحقق من البريد…",back:"رجوع",weak:"ضعيفة",medium:"متوسطة",strong:"قوية",emailInvalid:"أدخل بريداً صالحاً.",firstRequired:"أدخل الاسم الأول.",lastRequired:"أدخل اسم العائلة.",lockRequired:"أدخل رمزاً أو نمطاً، أو تخطَّ القفل.",biometricUnsupported:"قفل القياسات الحيوية غير مدعوم هنا. اختر PIN أو نمطاً أو تخطَّ.",translationMissing:"الترجمة غير متاحة بعد — يتم عرض الإنجليزية."},
ckb:{welcomeTitle:"بەخێربێیت بۆ NOVYRA",welcomeSub:"شوێنی تۆ، بە شێوازی تۆ.",noAccountFound:"هەژمارێک بەو ئیمەیڵە نەدۆزرایەوە؛ سەرەتا هەژمار دروست بکە.",googleFailed:"چوونەژوورەوە بە Google تەواو نەبوو؛ دووبارە هەوڵ بدەوە.",showPassword:"پیشاندانی وشەی نهێنی",hidePassword:"شاردنەوەی وشەی نهێنی",clearPattern:"پاککردنەوەی شێوە",countrySub:"ڕێکخستنە ناوچەییەکان دەستبەجێ جێبەجێ دەبن و پێش بەردەوامبوون دەتوانیت بیانگۆڕیت.",languageNote:"هەر کاتێک دەتوانیت ئەم ڕێکخستنانە لە ڕێکخستنەکان بگۆڕیت.",signUp:"تۆمارکردن",logIn:"چوونەژوورەوە",firstName:"ناو",lastName:"ناوی خێزان",next:"بەردەوام بە",searchCountry:"گەڕان بەدوای وڵات",language:"زمانی ئەپ",direction:"ئاڕاستەی نووسین",currency:"دراو",calendar:"ساڵژمێر",dateFormat:"شێوازی بەروار",numberSystem:"سیستەمی ژمارە",weekStart:"یەکەم ڕۆژی هەفتە",lockTitle:"پاراستنی ئەپ",lockExplain:"قوفڵی ئەپ یارمەتیدەرە بۆ پاراستنی زانیارییە تایبەتییەکانت کاتێک کەسانی تر مۆبایلەکەت بەکاردەهێنن. دواتر لە ڕێکخستنەکان > ئاسایش دەگۆڕدرێت.",noLock:"بێ قوفڵ",pin:"PIN",pattern:"شێوە",biometric:"پەنجەمۆر / Face ID",lockSecret:"PIN یان شێوە دروست بکە",accountType:"جۆری هەژمار هەڵبژێرە",personal:"کەسی",business:"بازرگانی",createAccount:"دروستکردنی هەژمار",emailUsed:"ئەم ئیمەیڵە پێشتر تۆمارکراوە. بچۆ ژوورەوە یان Google بەکاربهێنە.",emailCheck:"پشکنینی ئیمەیڵ…",back:"گەڕانەوە",weak:"لاواز",medium:"مامناوەند",strong:"بەهێز",emailInvalid:"ئیمەیڵێکی دروست بنووسە.",firstRequired:"ناوەکەت بنووسە.",lastRequired:"ناوی خێزان بنووسە.",lockRequired:"PIN یان شێوە بنووسە یان قوفڵەکە تێپەڕێنە.",biometricUnsupported:"قوفڵی زیست‌پێوانەیی لەم ئامێرەدا پشتگیری ناکرێت. PIN یان شێوە هەڵبژێرە یان تێپەڕێنە.",translationMissing:"وەرگێڕان ئامادە نییە؛ ئینگلیزی پیشان دەدرێت."}
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
  const [directionOverride,setDirectionOverride] = useState<"rtl"|"ltr"|null>(null);
  const [countryCode, setCountryCode] = useState("IR");
  const [countrySearch, setCountrySearch] = useState("");
  const [regional, setRegional] = useState({ currency: "IRR", calendar: "persian", digits: "arabext", dateFormat: "YYYY/MM/DD", weekStart: "saturday" as "saturday" | "sunday" | "monday" });
  const [stage, setStage] = useState<Stage>("welcome");
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountType, setAccountType] = useState<"personal"|"business">("personal");
  const [lockType, setLockType] = useState<"none"|"pin"|"pattern"|"biometric">("none");
  const [lockSecret, setLockSecret] = useState("");
  const [lockTouched,setLockTouched]=useState(false);
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
  const [googlePending,setGooglePending]=useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [resetTokenMode, setResetTokenMode] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const t = (key: string) => flowCopy[language]?.[key] || flowCopy.en?.[key] || copy[language]?.[key] || copy.en?.[key] || key;
  const dir = directionOverride || (languageByCode.get(language)?.rtl ? "rtl" : "ltr");
  const translationAvailable = Boolean(copy[language]);
  const passwordStrengthScore = [password.length>=10,/^[\s\S]*[a-z]/i.test(password),/[A-Z]/.test(password),/[0-9]/.test(password),/[^a-zA-Z0-9]/.test(password)].filter(Boolean).length;

  useEffect(() => { if (initialNotice) setNotice(initialNotice); }, [initialNotice]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const googleToken = hash.get("google_token");
    const googleError = hash.get("google_error");
    const googleNew = hash.get("google_new");
    if (googleToken) {
      setSession(googleToken);
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      apiRequest<{user:User}>("/auth/me").then(data => {
        setUser(data.user);
        setEmail(data.user.email);
        if (googleNew === "1") {
          const savedLanguage=(localStorage.getItem("projectx-language") || data.user.profile?.language || "en") as Language;
          if(languageByCode.has(savedLanguage)){setLanguage(savedLanguage);document.documentElement.lang=savedLanguage;document.documentElement.dir=languageByCode.get(savedLanguage)?.rtl?"rtl":"ltr";}
          const names=(data.user.displayName||"").trim().split(/\s+/);
          setFirstName(data.user.profile?.firstName || names[0] || "");
          setLastName(data.user.profile?.lastName || names.slice(1).join(" "));
          const savedCountry=localStorage.getItem("projectx-country") || data.user.profile?.country || "US";
          const savedPrefs=(()=>{try{return JSON.parse(localStorage.getItem("novyra-preferences-v1")||"{}");}catch{return {};}})();
          const selectedCountry=countries.find(item=>item.code===savedCountry);
          setCountryCode(savedCountry);
          setAccountType((localStorage.getItem("projectx-account-type") as "personal"|"business"|null) || data.user.profile?.accountType || "personal");
          setRegional({
            currency:localStorage.getItem("novyra-finance-currency") || data.user.profile?.currency || selectedCountry?.defaultCurrency || "USD",
            calendar:savedPrefs.calendar || data.user.profile?.calendar || selectedCountry?.defaultCalendar || "gregory",
            digits:savedPrefs.digits || selectedCountry?.defaultNumberSystem || "latn",
            dateFormat:localStorage.getItem("novyra-date-format") || savedPrefs.dateFormat || getDateFormat(savedLanguage,savedCountry),
            weekStart:savedPrefs.firstDay || data.user.profile?.weekStart || selectedCountry?.weekStart || "monday"
          });
          setGooglePending(true);
          setMode("signup");
          setStage("firstName");
          return;
        }
        const preferredLanguage = (localStorage.getItem("projectx-language") || data.user.profile?.language || language) as Language;
        onComplete(data.user, languageByCode.has(preferredLanguage) ? preferredLanguage : language);
      }).catch(() => { localStorage.removeItem("projectx-token"); setNotice(t("googleFailed")); });
    } else if (googleError) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      setNotice(googleError);
    }
  }, [onComplete]);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("projectx-language");
    const saved = (storedLanguage === "ku" ? "ckb" : storedLanguage) as Language | null;
    if (storedLanguage === "ku") { localStorage.setItem("projectx-language-legacy", "ku"); localStorage.setItem("projectx-language", "ckb"); }
    const savedCountry = localStorage.getItem("projectx-country") || "IR";
    const savedPrefs = (() => { try { return JSON.parse(localStorage.getItem("novyra-preferences-v1") || "{}"); } catch { return {}; } })();
    const selectedCountry = countries.find(item => item.code === savedCountry);
    if (saved && languageByCode.has(saved)) setLanguage(saved);
    const savedDirection=localStorage.getItem("novyra-text-direction");
    if(savedDirection==="rtl"||savedDirection==="ltr")setDirectionOverride(savedDirection);
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
      setStage("login");
      setMode("login");
      setRecoveryMode(true);
      setResetTokenMode(true);
    }
    const activeLanguage = saved && languageByCode.has(saved) ? saved : (selectedCountry?.defaultLanguage || "en");
    document.documentElement.lang = activeLanguage;
    document.documentElement.dir = languageByCode.get(activeLanguage)?.rtl ? "rtl" : "ltr";
  }, []);

  async function registerBiometric() {
    if (!window.PublicKeyCredential || !navigator.credentials?.create) { setNotice(t("biometricUnsupported")); return; }
    setBusy(true);setNotice("");
    try {
      const challenge=crypto.getRandomValues(new Uint8Array(32));
      const userId=crypto.getRandomValues(new Uint8Array(16));
      const credential=await navigator.credentials.create({publicKey:{
        challenge,rp:{name:"NOVYRA",id:window.location.hostname},
        user:{id:userId,name:email,displayName:firstName+" "+lastName},
        pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
        authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required"},
        timeout:60000,attestation:"none"
      }});
      if (!credential) throw new Error("Biometric enrollment was cancelled.");
      setLockSecret(credential.id);
      setLockTouched(true);
      localStorage.setItem("projectx-app-lock-credential",credential.id);
      setNotice("");
    } catch(error) { setNotice(error instanceof Error?error.message:t("biometricUnsupported")); }
    finally { setBusy(false); }
  }

  function chooseLanguage(next: Language) { setLanguage(next); setDirectionOverride(null); document.documentElement.lang=next; document.documentElement.dir=languageByCode.get(next)?.rtl?"rtl":"ltr"; }
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
    setDirectionOverride(null);
    document.documentElement.lang=nextLanguage;
    document.documentElement.dir=languageByCode.get(nextLanguage)?.rtl?"rtl":"ltr";
    const nextRegional = {
      currency: selected.defaultCurrency || "USD",
      calendar: selected.defaultCalendar,
      digits: selected.defaultNumberSystem,
      dateFormat: getDateFormat(nextLanguage, selected.code),
      weekStart: selected.weekStart
    };
    setRegional(nextRegional);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr";
  }
  function persistRegionalPreferences() {
    localStorage.setItem("projectx-country", countryCode);
    localStorage.setItem("projectx-language", language);
    if(directionOverride)localStorage.setItem("novyra-text-direction",directionOverride);else localStorage.removeItem("novyra-text-direction");
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
  function continueCountry() { setStage(googlePending ? "appLock" : "password"); }
  async function submitAuth() {
    if (busy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setNotice(t("invalidEmail")); return; }
    if (mode === "signup" && password.length < 10) { setNotice(t("weakPassword")); return; }
    if (mode === "login" && !password) { setNotice(t("weakPassword")); return; }
    if (mode === "signup" && (!firstName.trim() || !lastName.trim())) { setNotice(t("missingName")); return; }
    if (mode === "signup" && password !== confirmPassword) { setNotice(t("passwordMismatch")); return; }
    setBusy(true); setNotice("");
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      let credentials: Record<string, string>;
      let lockHash: string | null = null;
      if (mode === "signup") {
        const salt = createPasswordSalt();
        const passwordHash = await derivePasswordHash(password, salt);
        lockHash = lockType === "none" ? null : await derivePasswordHash(lockSecret, cleanEmail);
        const country = countries.find(item => item.code === countryCode);
        credentials = { email: cleanEmail, name: [firstName.trim(),lastName.trim()].join(" "), firstName:firstName.trim(), lastName:lastName.trim(), country:countryCode, currency:regional.currency, calendar:regional.calendar, numberFormat:country?.defaultNumberFormat || "1,234.56", weekStart:regional.weekStart, language, accountType, appLockType:lockType, appLockHash:lockHash, salt, passwordHash };
      } else {
        const challenge = await apiRequest<{salt:string}>(`/auth/password-salt?email=${encodeURIComponent(cleanEmail)}`);
        if (challenge.salt === "AAAAAAAAAAAAAAAAAAAAAA") {
          setNotice(t("noAccountFound"));
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
      if (mode === "signup") persistRegionalPreferences();
      const signedInUser = { ...data.user, displayName: data.user.displayName || [firstName,lastName].filter(Boolean).join(" ") };
      if (mode === "signup") {
        localStorage.setItem("projectx-app-lock-type",lockType);
        localStorage.setItem("projectx-app-lock-user",signedInUser.id);
        if (lockHash) localStorage.setItem("projectx-app-lock-hash",lockHash);
        else { localStorage.removeItem("projectx-app-lock-hash"); localStorage.removeItem("projectx-app-lock-credential"); }
        localStorage.setItem("projectx-account-type",accountType);
      } else if (signedInUser.profile?.accountType) {
        localStorage.setItem("projectx-account-type",signedInUser.profile.accountType);
      }
      localStorage.setItem("projectx-account", JSON.stringify({ name: signedInUser.displayName, email: signedInUser.email }));
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
      localStorage.setItem("projectx-first-run-complete", "1");
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
  async function finishGoogleOnboarding() {
    if(!user)return;
    if(!firstName.trim()||!lastName.trim()){setNotice(t("missingName"));return;}
    setBusy(true);setNotice("");
    try {
      const lockHash=lockType==="none"?null:await derivePasswordHash(lockSecret,email.trim().toLowerCase());
      const profilePatch:Record<string,unknown>={
        firstName:firstName.trim(),lastName:lastName.trim(),country:countryCode,currency:regional.currency,
        calendar:regional.calendar,numberFormat:countries.find(item=>item.code===countryCode)?.defaultNumberFormat||"1,234.56",
        weekStart:regional.weekStart,language,accountType
      };
      if(lockTouched){profilePatch.appLockType=lockType;profilePatch.appLockHash=lockHash;}
      await apiRequest("/auth/profile",{method:"PATCH",body:JSON.stringify(profilePatch)});
      persistRegionalPreferences();
      localStorage.setItem("projectx-account-type",accountType);
      if(lockTouched){
        localStorage.setItem("projectx-app-lock-type",lockType);
        localStorage.setItem("projectx-app-lock-user",user.id);
        if(lockHash)localStorage.setItem("projectx-app-lock-hash",lockHash);
        else{localStorage.removeItem("projectx-app-lock-hash");localStorage.removeItem("projectx-app-lock-credential");}
      }
      const refreshed=await apiRequest<{user:User}>("/auth/me");
      localStorage.setItem("projectx-first-run-complete","1");
      localStorage.setItem("projectx-account",JSON.stringify({name:refreshed.user.displayName,email:refreshed.user.email}));
      onComplete(refreshed.user,language);
    }catch(error){setNotice(error instanceof Error?error.message:t("authError"));}
    finally{setBusy(false);}
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
    <main className={"px-onboarding" + (stage === "welcome" ? " px-language-screen" : "")} dir={dir} lang={language}>
      <div className="px-ambient px-ambient-one" /><div className="px-ambient px-ambient-two" />
      <div className="px-glass-orbit px-orbit-one" /><div className="px-glass-orbit px-orbit-two" />
      <header className="px-onboarding-brand"><span className="px-logo"><NovyraMark /></span><span className="px-brand-wordmark">NOVYRA</span></header>
      <section className="px-onboarding-stage">
        {!translationAvailable&&<p role="status" className="px-translation-note">{t("translationMissing")}</p>}

        {stage === "welcome" && <div className="px-glass-panel px-auth-panel">
          <div className="px-auth-emblem"><NovyraMark /></div><div className="px-eyebrow">NOVYRA / WELCOME</div>
          <h1>{t("welcomeTitle")}</h1><p className="px-stage-subtitle">{t("welcomeSub")}</p>
          <button type="button" className="px-primary-action" onClick={()=>{setMode("signup");setStage("firstName");setNotice("");}}>{t("signUp")} <span>↗</span></button>
          <button type="button" className="px-social-button" onClick={()=>{setMode("login");setStage("login");setNotice("");}}>{t("logIn")}</button>
          <button type="button" className="px-social-button px-google-button" onClick={socialUnavailable}><GoogleMark/><span>{t("google")}</span></button>
        </div>}
        {stage === "firstName" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("welcome")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 1/7</div>
          <h1>{t("firstName")}</h1><label className="px-field"><span>{t("firstName")}</span><input autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} /></label>
          <button className="px-primary-action" onClick={()=>{if(!firstName.trim()){setNotice(t("firstRequired"));return;}setNotice("");setStage("lastName");}}>{t("next")} ↗</button>
        </div>}
        {stage === "lastName" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("firstName")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 2/7</div>
          <h1>{t("lastName")}</h1><label className="px-field"><span>{t("lastName")}</span><input autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} /></label>
          <button className="px-primary-action" onClick={()=>{if(!lastName.trim()){setNotice(t("lastRequired"));return;}setNotice("");setStage("email");}}>{t("next")} ↗</button>
        </div>}
        {stage === "email" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("lastName")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 3/7</div>
          <h1>{t("email")}</h1><label className="px-field"><span>{t("email")}</span><input type="email" autoComplete="email" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <button className="px-primary-action" disabled={busy} onClick={async()=>{const value=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(value)){setNotice(t("emailInvalid"));return;}setBusy(true);setNotice(t("emailCheck"));try{const result=await apiRequest<{salt:string;exists?:boolean}>("/auth/password-salt?email="+encodeURIComponent(value));if(result.exists){setNotice(t("emailUsed"));return;}setNotice("");setStage("country");}catch(error){setNotice(error instanceof Error?error.message:t("authError"));}finally{setBusy(false);}}}>{busy?t("emailCheck"):t("next")} ↗</button>
        </div>}
        {stage === "country" && <div className="px-glass-panel px-language-panel">
          <div className="px-eyebrow">NOVYRA / YOUR REGION</div>
          <button className="px-back-link" onClick={()=>setStage("email")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 4/7</div><h1>{t("country")}</h1>
          <p className="px-stage-subtitle">{t("countrySub")}</p>
          <input aria-label={t("searchCountry")} value={countrySearch} onChange={e => setCountrySearch(e.target.value)} placeholder={t("searchCountry")} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid rgba(120,130,150,.28)",background:"rgba(255,255,255,.72)",marginBottom:10}} />
          <div role="listbox" aria-label={t("country")} style={{maxHeight:190,overflowY:"auto",display:"grid",gap:6,textAlign:"start"}}>
            {countries.filter(item => [item.name,item.nativeName,item.code].some(value => value.toLowerCase().includes(countrySearch.trim().toLowerCase()))).map(item =>
              <button type="button" key={item.code} onClick={() => applyCountry(item.code)} aria-selected={countryCode===item.code} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:countryCode===item.code?"1px solid #5776a5":"1px solid rgba(120,130,150,.18)",background:countryCode===item.code?"rgba(87,118,165,.12)":"rgba(255,255,255,.35)",textAlign:"start",cursor:"pointer"}}>
                <span style={{fontSize:20}}>{item.flag}</span><span style={{flex:1}}>{item.name} · {item.code}</span>{countryCode===item.code?"✓":""}
              </button>
            )}
          </div>
          <div style={{marginTop:16,padding:14,borderRadius:14,border:"1px solid rgba(120,130,150,.24)",background:"rgba(255,255,255,.42)",display:"grid",gap:10}}>
            <strong>{language === "fa" ? "پیش‌نمایش تنظیمات" : "Editable preferences preview"}</strong>
            <label>{t("language")} <select value={language} onChange={e=>chooseLanguage(e.target.value as Language)} style={{width:"100%"}}>{languages.map(item=><option key={item.code} value={item.code}>{item.nativeName} · {item.name}</option>)}</select></label>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{t("direction")}: <b>{dir.toUpperCase()}</b></span><button type="button" onClick={()=>setDirectionOverride(dir==="rtl"?"ltr":"rtl")} aria-label={t("direction")}>RTL ↔ LTR</button></div>
            
            <label>{t("currency")} <select value={regional.currency} onChange={e=>setRegional(v=>({...v,currency:e.target.value}))} style={{width:"100%"}}>{currencies.map(item=><option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select></label>
            <label>{t("calendar")} <select value={regional.calendar} onChange={e=>setRegional(v=>({...v,calendar:e.target.value}))} style={{width:"100%"}}>{calendars.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label>{t("numberSystem")} <select value={regional.digits} onChange={e=>setRegional(v=>({...v,digits:e.target.value}))} style={{width:"100%"}}>{numberSystems.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label>{t("dateFormat")} <select value={regional.dateFormat} onChange={e=>setRegional(v=>({...v,dateFormat:e.target.value}))} style={{width:"100%"}}>{["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","YYYY/MM/DD"].map(item=><option key={item}>{item}</option>)}</select></label>
            <label>{t("weekStart")} <select value={regional.weekStart} onChange={e=>setRegional(v=>({...v,weekStart:e.target.value as "saturday"|"sunday"|"monday"}))} style={{width:"100%"}}>{weekdays.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          </div>
          <button className="px-primary-action" onClick={continueCountry}>{t("next")} <span>↗</span></button>
          <p className="px-footnote">{t("languageNote")}</p>
        </div>}
        

        {stage === "password" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("country")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 5/7</div>
          <h1>{t("password")}</h1>
          <label className="px-field"><span>{t("password")}</span><span className="px-password-wrap"><input type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}><EyeMark visible={showPassword}/></button></span></label>
          <div className="px-password-strength"><span>{t("passwordStrength")}: </span><b>{passwordStrengthScore<3?t("weak"):passwordStrengthScore<4?t("medium"):t("strong")}</b><div style={{height:5,borderRadius:8,background:"rgba(120,130,150,.22)",overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:(passwordStrengthScore*20)+"%",background:passwordStrengthScore<3?"#c45d5d":passwordStrengthScore<4?"#c39a42":"#39956b",transition:"width .2s"}}/></div></div>
          <label className="px-field"><span>{t("confirm")}</span><span className="px-password-wrap"><input type={showConfirm?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /><button type="button" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?"Hide password":"Show password"}><EyeMark visible={showConfirm}/></button></span></label>
          {confirmPassword&&password!==confirmPassword&&<small role="alert">{t("passwordMismatch")}</small>}
          <button className="px-primary-action" onClick={()=>{if(password.length<10){setNotice(t("weakPassword"));return;}if(password!==confirmPassword){setNotice(t("passwordMismatch"));return;}setNotice("");setStage("appLock");}}>{t("next")} ↗</button>
        </div>}
        {stage === "appLock" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("password")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 6/7</div>
          <h1>{t("lockTitle")}</h1><p className="px-stage-subtitle">{t("lockExplain")}</p>
          <div className="px-lock-options">{(["none","pin","pattern","biometric"] as const).map(value=><button type="button" key={value} className={lockType===value?"is-selected":""} onClick={()=>{setLockType(value);setLockSecret("");setLockTouched(true);}}>{t(value==="none"?"noLock":value)}</button>)}</div>
          {lockType==="pin"&&<label className="px-field"><span>{t("lockSecret")}</span><input type="password" inputMode="numeric" value={lockSecret} onChange={e=>setLockSecret(e.target.value.replace(/[^0-9]/g,"").slice(0,12))} autoComplete="off" /></label>}{lockType==="pattern"&&<div className="px-lock-grid" role="group" aria-label={t("pattern")}>{Array.from({length:9},(_,i)=>String(i+1)).map(point=><button type="button" key={point} aria-pressed={lockSecret.includes(point)} className={lockSecret.includes(point)?"is-selected":""} onClick={()=>setLockSecret(value=>value.includes(point)?value:value+point)}>{lockSecret.includes(point)?"●":"○"}</button>)}<button type="button" className="px-pattern-clear" onClick={()=>setLockSecret("")}>{t("clearPattern")}</button></div>}
          {lockType==="biometric"&&<><p role="status">{lockSecret?t("biometric"):t("biometricUnsupported")}</p><button type="button" className="px-skip-action" disabled={busy} onClick={registerBiometric}>{busy?"…":t("biometric")}</button></>}
          <button className="px-primary-action" onClick={()=>{if(lockType==="biometric"&&!lockSecret){setNotice(t("biometricUnsupported"));return;}if(lockType==="pin"&&lockSecret.length<6){setNotice(t("lockRequired"));return;}if(lockType==="pattern"&&lockSecret.length<4){setNotice(t("lockRequired"));return;}setNotice("");setStage("accountType");}}>{t("next")} ↗</button>
          <button className="px-skip-action" onClick={()=>{setLockType("none");setLockSecret("");setLockTouched(true);setStage("accountType");}}>{t("skip")}</button>
        </div>}
        {stage === "accountType" && <div className="px-glass-panel px-auth-panel">
          <button className="px-back-link" onClick={()=>setStage("appLock")}>{t("back")}</button><div className="px-eyebrow">NOVYRA / SIGN UP · 7/7</div>
          <h1>{t("accountType")}</h1>
          <div className="px-lock-options"><button type="button" className={accountType==="personal"?"is-selected":""} onClick={()=>setAccountType("personal")}>{t("personal")}</button><button type="button" className={accountType==="business"?"is-selected":""} onClick={()=>setAccountType("business")}>{t("business")}</button></div>
          <button className="px-primary-action" disabled={busy} onClick={googlePending?finishGoogleOnboarding:submitAuth}>{busy?t("emailCheck"):t("createAccount")} ↗</button>
        </div>}
        {stage === "login" && <div className="px-glass-panel px-auth-panel">
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
          {(!recoveryMode || resetTokenMode) && <label className="px-field"><span>{t("password")}</span><span className="px-password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={recoveryMode ? "new-password" : mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("minPassword")} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? t("hidePassword") : t("showPassword")}><EyeMark visible={showPassword}/></button></span></label>}
          {(resetTokenMode || (!recoveryMode && mode === "signup")) && <label className="px-field"><span>{t("confirm")}</span><span className="px-password-wrap"><input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t("confirm")} /><button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? t("hidePassword") : t("showPassword")}><EyeMark visible={showConfirm}/></button></span></label>}
          {mode === "login" && !recoveryMode && <button type="button" className="px-forgot-link" onClick={() => { setRecoveryMode(true); setResetTokenMode(false); setNotice(""); }}>{t("forgot")}</button>}
          <button type="button" className="px-primary-action" disabled={busy} onClick={recoveryMode ? (resetTokenMode ? resetPassword : requestRecovery) : submitAuth}>{busy ? "..." : recoveryMode ? (resetTokenMode ? t("updatePassword") : t("sendReset")) : mode === "login" ? t("signIn") : t("create")} <span>↗</span></button>
          {!recoveryMode && <div className="px-switch-mode"><span>{mode === "login" ? t("noAccount") : t("haveAccount")}</span><button onClick={() => { setMode("login"); setStage("welcome"); setNotice(""); }}>{mode === "login" ? t("createLink") : t("loginLink")}</button></div>}
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
