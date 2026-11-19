"use client";

import { useEffect, useRef, useState } from "react";

export type NavKey = "home" | "search" | "create" | "reels" | "profile";

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 3.5l8 7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /></svg>;
}
function ReelsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M3 11a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M10.1 6.4a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0 M10.1 15.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0 M5.5 11a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0 M14.7 11a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0 M10.5 11a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0" /><path d="M16 18l4.5 3.5-6.5-.5z" /></svg>;
}

type Props = {
  active: NavKey;
  userId?: string;
  displayName?: string;
  onNavigate: (key: NavKey) => void;
  onOpenAI: () => void;
  onOpenGame?: () => void;
};

export default function MobileBottomNav({ active, userId, displayName, onNavigate, onOpenAI, onOpenGame }: Props) {
  const [avatar, setAvatar] = useState("");
  const [initial, setInitial] = useState("N");
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const homeTimer = useRef<number | null>(null);
  const homeClicked = useRef(false);

  useEffect(() => {
    try {
      const savedAvatar = userId ? localStorage.getItem("projectx-avatar:" + userId) : null;
      if (savedAvatar) setAvatar(savedAvatar);
      const account = JSON.parse(localStorage.getItem("projectx-account") || "{}");
      const label = displayName || account?.name;
      if (label) setInitial(String(label).trim().slice(0, 1) || "N");
    } catch { /* Keep the neutral NOVYRA avatar fallback. */ }
  }, [userId, displayName]);

  useEffect(() => () => {
    if (homeTimer.current !== null) window.clearTimeout(homeTimer.current);
  }, []);

  function handleHomePress() {
    if (homeTimer.current !== null) window.clearTimeout(homeTimer.current);
    homeClicked.current = true;
    setHomeMenuOpen(false);
    onNavigate("home");
    homeTimer.current = window.setTimeout(() => {
      setHomeMenuOpen(true);
      homeTimer.current = null;
    }, 1000);
  }

  function closeMenu() {
    if (homeTimer.current !== null) window.clearTimeout(homeTimer.current);
    homeTimer.current = null;
    setHomeMenuOpen(false);
  }

  return (
    <nav className="novyra-bottom-nav" aria-label="Main navigation">
      {homeMenuOpen && <button className="novyra-menu-dismiss" aria-label="Close menu" onClick={closeMenu} />}
      <div className="novyra-bottom-items">
        <div className="novyra-home-wrap">
          {homeMenuOpen && <div className="novyra-home-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { closeMenu(); onOpenAI(); }}>
              <span className="novyra-menu-glyph">✦</span><span>هوش مصنوعی</span>
            </button>
            <button type="button" role="menuitem" onClick={() => { closeMenu(); onOpenGame?.(); }}>
              <span className="novyra-menu-glyph">◈</span><span>بازی</span>
            </button>
          </div>}
          <button type="button" className={`novyra-nav-item ${active === "home" ? "is-active" : ""}`} onClick={handleHomePress} aria-label="Home" aria-current={active === "home" ? "page" : undefined}>
            <HomeIcon />{active === "home" && <i className="novyra-active-dot" />}
          </button>
        </div>
        <button type="button" className={`novyra-nav-item ${active === "search" ? "is-active" : ""}`} onClick={() => { closeMenu(); onNavigate("search"); }} aria-label="Search" aria-current={active === "search" ? "page" : undefined}>
          <SearchIcon />{active === "search" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-create-button ${active === "create" ? "is-active" : ""}`} onClick={() => { closeMenu(); onNavigate("create"); }} aria-label="Create">
          <span aria-hidden="true">+</span><span className="novyra-new-badge">NEW</span>
        </button>
        <button type="button" className={`novyra-nav-item novyra-reels-item ${active === "reels" ? "is-active" : ""}`} onClick={() => { closeMenu(); onNavigate("reels"); }} aria-label="Reels" aria-current={active === "reels" ? "page" : undefined}>
          <ReelsIcon />{active === "reels" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-profile-button ${active === "profile" ? "is-active" : ""}`} onClick={() => { closeMenu(); onNavigate("profile"); }} aria-label="Profile" aria-current={active === "profile" ? "page" : undefined}>
          {avatar.startsWith("data:image/") || avatar.startsWith("https://") ? <img src={avatar} alt="" /> : <span>{avatar || initial}</span>}
          {active === "profile" && <i className="novyra-active-dot" />}
        </button>
      </div>
      <div className="novyra-home-indicator" aria-hidden="true"><span /></div>
    </nav>
  );
}
