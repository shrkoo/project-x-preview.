"use client";

import { useEffect, useState } from "react";
import Onboarding from "./components/Onboarding";
import SocialApp from "./components/SocialApp";
import { apiRequest, clearSession } from "./lib/api";

type Language = "en" | "fa" | "ar" | "ku";
type Account = { id: string; email: string; displayName: string; xp?: number; gamesPlayed?: number; role?: string };

const allowedLanguages: Language[] = ["fa", "en", "ar", "ku"];

export default function Home() {
  const [account, setAccount] = useState<Account | null>(null);
  const [language, setLanguage] = useState<Language>("fa");
  const [startupReady, setStartupReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    const savedLanguage = localStorage.getItem("projectx-language") as Language | null;
    const nextLanguage = savedLanguage && allowedLanguages.includes(savedLanguage) ? savedLanguage : "fa";
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "en" ? "ltr" : "rtl";

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
    document.documentElement.dir = nextLanguage === "en" ? "ltr" : "rtl";
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

  function logoutComplete() {
    setAccount(null);
    setNotice("");
  }

  if (!startupReady) return <main className="social-startup" aria-label="NOVYRA"><span className="social-startup-mark">N</span><span>NOVYRA</span></main>;

  if (!account) return <Onboarding onComplete={completeOnboarding} initialNotice={notice} />;

  return <SocialApp
    account={account}
    language={language}
    notice={notice}
    onClearNotice={() => setNotice("")}
    onLanguageChange={setLanguage}
    onLogout={logoutComplete}
  />;
}
