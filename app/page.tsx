"use client";

import { useEffect, useState } from "react";
import NovyraSignupFlow from "./components/NovyraSignupFlow";
import NovyraLuxuryApp from "./components/NovyraLuxuryApp";
import AppLockScreen from "./components/AppLockScreen";
import { apiRequest, clearSession } from "./lib/api";
import { languages, languageByCode } from "./data/languages";
import {removeDeviceLock} from "./lib/device-lock";

type Language = (typeof languages)[number]["code"];
type Account = { id: string; email: string; displayName: string; xp?: number; gamesPlayed?: number; role?: string; profile?: { accountType?: "personal" | "business"; appLockType?: "none"|"pin"|"pattern"|"biometric" } };

const allowedLanguages = new Set(languages.map(item => item.code));

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [language, setLanguage] = useState<Language>("fa");
  const [directionOverride,setDirectionOverride] = useState<"rtl"|"ltr"|null>(null);
  const [startupReady, setStartupReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);


  useEffect(() => {
    let alive = true;
    const storedLanguage = localStorage.getItem("projectx-language");
    const savedLanguage = (storedLanguage === "ku" ? "ckb" : storedLanguage) as Language | null;
    if (storedLanguage === "ku") { localStorage.setItem("projectx-language-legacy", "ku"); localStorage.setItem("projectx-language", "ckb"); }
    const nextLanguage = savedLanguage && allowedLanguages.has(savedLanguage) ? savedLanguage : "fa";
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    const savedDirection=localStorage.getItem("novyra-text-direction");
    const direction=savedDirection==="rtl"||savedDirection==="ltr"?savedDirection:null;
    setDirectionOverride(direction);
    document.documentElement.dir = direction || (languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr");

    const currentUrl = new URL(window.location.href);
    const fragment = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const googleToken = fragment.get("google_token");
    if (googleToken) {
      localStorage.setItem("projectx-token", googleToken);
      currentUrl.hash = "";
      window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search);
      apiRequest<{user:Account}>("/auth/me").then(data => {
        if (!alive) return;
        setAccount(data.user);
        localStorage.setItem("projectx-account", JSON.stringify({name:data.user.displayName,email:data.user.email}));
        setStartupReady(true);
      }).catch(() => {
        if (!alive) return;
        clearSession(); setAccount(null); setNotice("Google sign-in could not be completed. Please try again."); setStartupReady(true);
      });
      return () => { alive = false; };
    }

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
      if ((deviceLock === "pin" || deviceLock === "pattern") && localStorage.getItem("projectx-app-lock-configured") === "1" && localStorage.getItem("projectx-app-lock-user") === data.user.id) setLocked(true);
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
    const savedDirection=localStorage.getItem("novyra-text-direction");
    const direction=savedDirection==="rtl"||savedDirection==="ltr"?savedDirection:null;
    setDirectionOverride(direction);
    document.documentElement.dir = direction || (languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr");
    if (user) {
      setAccount(user);
      const deviceLock = localStorage.getItem("projectx-app-lock-type");
      if ((deviceLock === "pin" || deviceLock === "pattern") && localStorage.getItem("projectx-app-lock-configured") === "1" && localStorage.getItem("projectx-app-lock-user") === user.id) setLocked(true);
      localStorage.setItem("projectx-account", JSON.stringify({ name: user.displayName, email: user.email }));
      setStartupReady(true);
      return;
    }
    const token = localStorage.getItem("projectx-token");
    if (token) {
      apiRequest<{ user: Account }>("/auth/me").then(data => { setAccount(data.user); const type=localStorage.getItem("projectx-app-lock-type"); if((type==="pin"||type==="pattern")&&localStorage.getItem("projectx-app-lock-user")===data.user.id&&localStorage.getItem("projectx-app-lock-configured")==="1") setLocked(true); }).catch(() => {
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
    localStorage.removeItem("novyra-text-direction");
    setDirectionOverride(null);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = languageByCode.get(nextLanguage)?.rtl ? "rtl" : "ltr";
  }




  useEffect(() => {
    if (!account) return;
    let hiddenAt = 0;
    const delay = () => {
      const value = localStorage.getItem("projectx-app-lock-delay") || "immediate";
      return value === "30s" ? 30000 : value === "1m" ? 60000 : value === "5m" ? 300000 : 0;
    };
    const lockIfConfigured = () => {
      const type = localStorage.getItem("projectx-app-lock-type") || "none";
      const owner = localStorage.getItem("projectx-app-lock-user");
      if ((type === "pin" || type === "pattern") && owner === account.id && localStorage.getItem("projectx-app-lock-configured") === "1") setLocked(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); document.documentElement.classList.add("novyra-app-obscured"); if (delay() === 0) lockIfConfigured(); }
      else if (hiddenAt) { if (Date.now() - hiddenAt >= delay()) lockIfConfigured(); else document.documentElement.classList.remove("novyra-app-obscured"); }
    };
    const onPageHide = () => { hiddenAt = Date.now(); document.documentElement.classList.add("novyra-app-obscured"); if (delay() === 0) lockIfConfigured(); };
    const onPageShow = () => { if (hiddenAt && Date.now() - hiddenAt >= delay()) lockIfConfigured(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [account?.id]);

  function logoutComplete() {
    clearSession();
    void removeDeviceLock();
    ["projectx-app-lock-type","projectx-app-lock-hash","projectx-app-lock-user","projectx-app-lock-configured","projectx-app-lock-credential","projectx-app-lock-biometric","projectx-app-lock-pin-length","novyra-lock-failures","novyra-lock-until"].forEach(key => localStorage.removeItem(key));
    setLocked(false);
    setAccount(null);
    setNotice("");
  }

  if (locked) return <AppLockScreen email={account?.email||""} name={account?.displayName||""} language={language} onUnlock={()=>{setLocked(false);document.documentElement.classList.remove("novyra-app-obscured");}} onLogout={logoutComplete}/>;

  if (!startupReady) return <main className="social-startup" aria-label="NOVYRA"><span className="social-startup-mark">N</span><span>NOVYRA</span></main>;

  if (!account) return <NovyraSignupFlow onComplete={completeOnboarding} initialNotice={notice} />;

  return <NovyraLuxuryApp
    account={account}
    language={language}
    notice={notice}
    onClearNotice={() => setNotice("")}
    onLanguageChange={changeLanguage}
    directionOverride={directionOverride}
    accountType={account?.profile?.accountType || (typeof window !== "undefined" ? localStorage.getItem("projectx-account-type") as "personal"|"business" : null) || "personal"}
    onAccountTypeChange={async (nextType) => { try { if(nextType==="business") { await apiRequest("/workspaces",{method:"POST",body:JSON.stringify({type:"business",companyName:localStorage.getItem("novyra-business-name")||"Business",currency:localStorage.getItem("novyra-finance-currency")||"USD"})}); } else { await apiRequest("/workspaces",{method:"POST",body:JSON.stringify({type:"personal",name:"Personal",currency:localStorage.getItem("novyra-finance-currency")||"USD"})}); } await apiRequest("/auth/profile",{method:"PATCH",body:JSON.stringify({accountType:nextType})}); localStorage.setItem("projectx-account-type",nextType); setAccount(current => current ? {...current,profile:{...current.profile,accountType:nextType}} : current); } catch(error) { setNotice(error instanceof Error?error.message:"Could not update account type."); } }}
    onLogout={logoutComplete}
  />;
}
