"use client";

import { useEffect, useState } from "react";

type NavKey = "home" | "search" | "create" | "reels" | "profile";

function HomeIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><path d="M3.5 11.4 13 3.8l9.5 7.6v10.1a1 1 0 0 1-1 1h-6v-7h-5v7h-6a1 1 0 0 1-1-1V11.4Z" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="11.5" cy="11.5" r="7.2" /><path d="m17 17 5.2 5.2" /></svg>;
}
function ReelsIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><rect x="2.8" y="5.2" width="20.4" height="15.6" rx="2.2" /><path d="m9.2 5.2 4.1 5.1m3.7-5.1 4.1 5.1M2.8 10.3h20.4" /><path d="m11 13.1 5.1 2.4-5.1 2.4z" className="novyra-reels-play" /></svg>;
}

export default function MobileBottomNav() {
  const [active, setActive] = useState<NavKey>("reels");
  const [avatar, setAvatar] = useState("");
  const [initial, setInitial] = useState("N");

  useEffect(() => {
    try {
      const account = JSON.parse(localStorage.getItem("projectx-account") || "{}");
      const userId = localStorage.getItem("projectx-user-id");
      const savedAvatar = userId ? localStorage.getItem("projectx-avatar:" + userId) : null;
      if (savedAvatar) setAvatar(savedAvatar);
      if (account?.name) setInitial(String(account.name).trim().slice(0, 1) || "N");
    } catch { /* Keep the neutral NOVYRA avatar fallback. */ }
  }, []);

  const choose = (key: NavKey) => setActive(key);

  return (
    <nav className="novyra-bottom-nav" aria-label="Main navigation">
      <div className="novyra-bottom-items">
        <button type="button" className={`novyra-nav-item ${active === "home" ? "is-active" : ""}`} onClick={() => choose("home")} aria-label="Home" aria-current={active === "home" ? "page" : undefined}>
          <HomeIcon />
          {active === "home" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-nav-item ${active === "search" ? "is-active" : ""}`} onClick={() => choose("search")} aria-label="Search" aria-current={active === "search" ? "page" : undefined}>
          <SearchIcon />
          {active === "search" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-create-button ${active === "create" ? "is-active" : ""}`} onClick={() => choose("create")} aria-label="Create">
          <span aria-hidden="true">+</span>
          <span className="novyra-new-badge">NEW</span>
        </button>
        <button type="button" className={`novyra-nav-item novyra-reels-item ${active === "reels" ? "is-active" : ""}`} onClick={() => choose("reels")} aria-label="Reels" aria-current={active === "reels" ? "page" : undefined}>
          <ReelsIcon />
          {active === "reels" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-profile-button ${active === "profile" ? "is-active" : ""}`} onClick={() => choose("profile")} aria-label="Profile" aria-current={active === "profile" ? "page" : undefined}>
          {avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}
          {active === "profile" && <i className="novyra-active-dot" />}
        </button>
      </div>
      <div className="novyra-home-indicator" aria-hidden="true"><span /></div>
    </nav>
  );
}
