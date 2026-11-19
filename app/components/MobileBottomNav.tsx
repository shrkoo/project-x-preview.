"use client";

import { useEffect, useRef, useState } from "react";

export type NavKey = "home" | "search" | "create" | "reels" | "profile";

function HomeIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><path d="M3.5 11.4 13 3.8l9.5 7.6v10.1a1 1 0 0 1-1 1h-6v-7h-5v7h-6a1 1 0 0 1-1-1V11.4Z" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="11.5" cy="11.5" r="7.2" /><path d="m17 17 5.2 5.2" /></svg>;
}
function ReelsIcon() {
  return <svg viewBox="0 0 26 26" aria-hidden="true"><rect x="2.8" y="5.2" width="20.4" height="15.6" rx="2.2" /><path d="m9.2 5.2 4.1 5.1m3.7-5.1 4.1 5.1M2.8 10.3h20.4" /><path d="m11 13.1 5.1 2.4-5.1 2.4z" className="novyra-reels-play" /></svg>;
}

type Props = {
  active: NavKey;
  userId?: string;
  displayName?: string;
  onNavigate: (key: NavKey) => void;
  onOpenAI: () => void;
};

export default function MobileBottomNav({ active, userId, displayName, onNavigate, onOpenAI }: Props) {
  const [avatar, setAvatar] = useState("");
  const [initial, setInitial] = useState("N");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

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
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
  }, []);

  function startProfilePress() {
    longPressTriggered.current = false;
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setAiMenuOpen(true);
    }, 500);
  }

  function endProfilePress() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleProfileClick() {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setAiMenuOpen(false);
    onNavigate("profile");
  }

  return (
    <nav className="novyra-bottom-nav" aria-label="Main navigation">
      <div className="novyra-bottom-items">
        <button type="button" className={`novyra-nav-item ${active === "home" ? "is-active" : ""}`} onClick={() => onNavigate("home")} aria-label="Home" aria-current={active === "home" ? "page" : undefined}>
          <HomeIcon />
          {active === "home" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-nav-item ${active === "search" ? "is-active" : ""}`} onClick={() => onNavigate("search")} aria-label="Search" aria-current={active === "search" ? "page" : undefined}>
          <SearchIcon />
          {active === "search" && <i className="novyra-active-dot" />}
        </button>
        <button type="button" className={`novyra-create-button ${active === "create" ? "is-active" : ""}`} onClick={() => { setAiMenuOpen(false); onNavigate("create"); }} aria-label="Create">
          <span aria-hidden="true">+</span>
          <span className="novyra-new-badge">NEW</span>
        </button>
        <button type="button" className={`novyra-nav-item novyra-reels-item ${active === "reels" ? "is-active" : ""}`} onClick={() => onNavigate("reels")} aria-label="Reels" aria-current={active === "reels" ? "page" : undefined}>
          <ReelsIcon />
          {active === "reels" && <i className="novyra-active-dot" />}
        </button>
        <div className="novyra-profile-wrap">
          {aiMenuOpen && <div className="novyra-ai-shortcut" role="menu">
            <button type="button" role="menuitem" onClick={() => { setAiMenuOpen(false); onOpenAI(); }}>
              <span className="novyra-ai-spark">✦</span>
              <span>هوش مصنوعی</span>
            </button>
          </div>}
          <button
            type="button"
            className={`novyra-profile-button ${active === "profile" ? "is-active" : ""}`}
            onPointerDown={startProfilePress}
            onPointerUp={endProfilePress}
            onPointerLeave={endProfilePress}
            onPointerCancel={endProfilePress}
            onContextMenu={event => event.preventDefault()}
            onClick={handleProfileClick}
            aria-label="Profile — نگه‌دار برای هوش مصنوعی"
            aria-current={active === "profile" ? "page" : undefined}
          >
            {avatar.startsWith("data:image/") || avatar.startsWith("https://") ? <img src={avatar} alt="" /> : <span>{avatar || initial}</span>}
            {active === "profile" && <i className="novyra-active-dot" />}
          </button>
        </div>
      </div>
      <div className="novyra-home-indicator" aria-hidden="true"><span /></div>
    </nav>
  );
}
