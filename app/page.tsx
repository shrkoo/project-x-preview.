"use client";

import { useEffect, useState } from "react";
import Onboarding from "./components/Onboarding";
import NovyraLuxuryApp from "./components/NovyraLuxuryApp";
import { apiRequest, clearSession } from "./lib/api";
import { languages, languageByCode } from "./data/languages";

type Language = (typeof languages)[number]["code"];
type Account = { id: string; email: string; displayName: string; xp?: number; gamesPlayed?: number; role?: string };

const allowedLanguages = new Set(languages.map(item => item.code));

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [language, setLanguage] = useState<Language>("fa");
  const [startupReady, setStartupReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    const savedLanguage = localStorage.getItem("projectx-language") as Language | null;
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
    document.documentElement.dir = nextLanguage === "en" ? "ltr" : "rtl";
  }

  function logoutComplete() {
    clearSession();
    setAccount(null);
    setNotice("");
  }

  if (!startupReady) return <main className="social-startup" aria-label="NOVYRA"><span className="social-startup-mark">N</span><span>NOVYRA</span></main>;

  if (!account) return <Onboarding onComplete={completeOnboarding} initialNotice={notice} />;

  return <NovyraLuxuryApp
    account={account}
    language={language}
    notice={notice}
    onClearNotice={() => setNotice("")}
    onLanguageChange={changeLanguage}
    onLogout={logoutComplete}
  />;
}
