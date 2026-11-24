"use client";

import { useEffect, useState } from "react";
import Onboarding from "./components/Onboarding";
import NovyraLuxuryApp from "./components/NovyraLuxuryApp";
import { apiRequest, clearSession, derivePasswordHash } from "./lib/api";
import { languages, languageByCode } from "./data/languages";

type Language = (typeof languages)[number]["code"];
type Account = { id: string; email: string; displayName: string; xp?: number; gamesPlayed?: number; role?: string; profile?: { accountType?: "personal" | "business"; appLockType?: "none"|"pin"|"pattern"|"biometric" } };

const allowedLanguages = new Set(languages.map(item => item.code));

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [language, setLanguage] = useState<Language>("fa");
  const [startupReady, setStartupReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockInput, setLockInput] = useState("");
  const [lockError, setLockError] = useState("");

  useEffect(() => {
    let alive = true;
    const storedLanguage = localStorage.getItem("projectx-language");
    const savedLanguage = (storedLanguage === "ku" ? "ckb" : storedLanguage) as Language | null;
    if (storedLanguage === "ku") localStorage.setItem("projectx-language", "ckb");
    const nextLanguage = savedLanguage && allowedLanguages.has(savedLanguage) ? savedLanguage : "fa";
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr";

    const currentUrl = new URL(window.location.href);
    const verificationToken = currentUrl.searchParams.get("verify");
    if (verificationToken) {
      apiRequest<{ message?: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: verificationToken })
      }).then(result => {
        if (alive) setNotice(result.message || "ایمیل با موفقیت تأیید شد.");
      }).catch(error => {
        if (alive) setNotice(error instanceof Error ? error.message : "تأیید ایمیل ناموفق بود.");
      });
      currentUrl.searchParams.delete("verify");
      window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
    }

    const token = localStorage.getItem("projectx-token");
    if (!token) {
      setStartupReady(true);
      return () => { alive = false; };
    }

    apiRequest<{ user: Account }>("/auth/me").then(data => {
      if (!alive) return;
      setAccount(data.user);
      const deviceLock = localStorage.getItem("projectx-app-lock-type");
      if (deviceLock && deviceLock !== "none" && localStorage.getItem("projectx-app-lock-hash") && localStorage.getItem("projectx-app-lock-user") === data.user.id) setLocked(true);
      localStorage.setItem("projectx-account", JSON.stringify({ name: data.user.displayName, email: data.user.email }));
      setStartupReady(true);
    }).catch(() => {
      if (!alive) return;
      clearSession();
      setAccount(null);
      setStartupReady(true);
    });

    return () => { alive = false; };
  }, []);

  function completeOnboarding(user: Account | null, nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem("projectx-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr";
    if (user) {
      setAccount(user);
      const deviceLock = localStorage.getItem("projectx-app-lock-type");
      if (deviceLock && deviceLock !== "none" && localStorage.getItem("projectx-app-lock-hash") && localStorage.getItem("projectx-app-lock-user") === user.id) setLocked(true);
      localStorage.setItem("projectx-account", JSON.stringify({ name: user.displayName, email: user.email }));
      setStartupReady(true);
      return;
    }
    const token = localStorage.getItem("projectx-token");
    if (token) {
      apiRequest<{ user: Account }>("/auth/me").then(data => setAccount(data.user)).catch(() => {
        clearSession();
        setAccount(null);
      }).finally(() => setStartupReady(true));
    } else {
      setAccount(null);
      setStartupReady(true);
    }
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem("projectx-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr";
  }

  async function unlockApp() {
    try {
      const method = localStorage.getItem("projectx-app-lock-type") || "none";
      if (method === "pin" || method === "pattern") {
        const actual = await derivePasswordHash(lockInput, account?.email || "");
        if (actual !== localStorage.getItem("projectx-app-lock-hash")) throw new Error("Incorrect app lock.");
      } else if (method === "biometric") {
        const encoded = localStorage.getItem("projectx-app-lock-credential") || "";
        const padded = encoded.replace(/-/g,"+").replace(/_/g,"/") + "=".repeat((4-encoded.length%4)%4);
        const id = Uint8Array.from(atob(padded), c=>c.charCodeAt(0));
        const credential = await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:"public-key",id}],userVerification:"required",timeout:60000}});
        if (!credential || (credential as PublicKeyCredential).id !== encoded) throw new Error("Biometric verification failed.");
      }
      setLocked(false);setLockInput("");setLockError("");
    } catch (error) { setLockError(error instanceof Error ? error.message : "Unlock failed."); }
  }

  function logoutComplete() {
    clearSession();
    setAccount(null);
    setNotice("");
  }

  if (locked) return <main className="px-onboarding" dir={languageByCode.get(language)?.rtl?"rtl":"ltr"} lang={language}>
    <section className="px-onboarding-stage"><div className="px-glass-panel px-auth-panel">
      <div className="px-auth-emblem">🔒</div><h1>{language==="fa"?"قفل برنامه":"App locked"}</h1>
      <p className="px-stage-subtitle">{language==="fa"?"برای محافظت از اطلاعات خصوصی، قفل را باز کنید.":"Unlock to protect your private information."}</p>
      {(localStorage.getItem("projectx-app-lock-type")==="pin"||localStorage.getItem("projectx-app-lock-type")==="pattern")&&<input type="password" autoComplete="off" value={lockInput} onChange={e=>setLockInput(e.target.value)} placeholder={language==="fa"?"رمز یا الگو":"PIN or pattern"} />}
      {lockError&&<p role="alert">{lockError}</p>}
      <button className="px-primary-action" onClick={unlockApp}>{localStorage.getItem("projectx-app-lock-type")==="biometric"?(language==="fa"?"تأیید با زیست‌سنجی":"Verify with biometrics"):(language==="fa"?"بازکردن قفل":"Unlock")}</button>
    </div></section>
  </main>;

  if (!startupReady) return <main className="social-startup" aria-label="NOVYRA"><span className="social-startup-mark">N</span><span>NOVYRA</span></main>;

  if (!account) return <Onboarding onComplete={completeOnboarding} initialNotice={notice} />;

  return <NovyraLuxuryApp
    account={account}
    language={language}
    notice={notice}
    onClearNotice={() => setNotice("")}
    onLanguageChange={changeLanguage}
    accountType={account?.profile?.accountType || (typeof window !== "undefined" ? localStorage.getItem("projectx-account-type") as "personal"|"business" : null) || "personal"}
    onAccountTypeChange={async (nextType) => { try { await apiRequest("/auth/profile",{method:"PATCH",body:JSON.stringify({accountType:nextType})}); localStorage.setItem("projectx-account-type",nextType); setAccount(current => current ? {...current,profile:{...current.profile,accountType:nextType}} : current); } catch(error) { setNotice(error instanceof Error?error.message:"Could not update account type."); } }}
    onLogout={logoutComplete}
  />;
}
