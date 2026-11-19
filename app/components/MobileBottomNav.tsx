"use client";

import { useEffect, useState } from "react";

export type NavKey = "home" | "search" | "create" | "reels" | "profile" | "friends" | "inbox";

type Props = {
  active: NavKey;
  userId?: string;
  displayName?: string;
  onNavigate: (key: NavKey) => void;
  onOpenAI: () => void;
  onOpenGame?: () => void;
};

function Icon({ name, filled = false }: { name: "home" | "friends" | "inbox" | "profile"; filled?: boolean }) {
  const common = { fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "home") return <svg viewBox="0 0 24 24" {...common}><path d="M3 10.8 12 3l9 7.8V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
  if (name === "friends") return <svg viewBox="0 0 24 24" {...common}><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c.3-3.6 2.4-5.5 6.2-5.5s5.9 1.9 6.2 5.5M16 5.2a3 3 0 0 1 0 5.8M17 14.7c2.6.4 3.9 2.1 4.2 5.3" /></svg>;
  if (name === "inbox") return <svg viewBox="0 0 24 24" {...common}><path d="M4 5.5h16v13H4zM4 14h4l1.5 2h5L16 14h4" /></svg>;
  return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21c.6-4.3 3-6.5 7.5-6.5s6.9 2.2 7.5 6.5" /></svg>;
}

export default function MobileBottomNav({ active, userId, displayName, onNavigate }: Props) {
  const [avatar, setAvatar] = useState("");
  const [initial, setInitial] = useState("N");
  useEffect(() => {
    try {
      const saved = userId ? localStorage.getItem("projectx-avatar:" + userId) : null;
      if (saved) setAvatar(saved);
      const account = JSON.parse(localStorage.getItem("projectx-account") || "{}");
      const label = displayName || account?.name;
      if (label) setInitial(String(label).trim().slice(0, 1) || "N");
    } catch { /* neutral avatar fallback */ }
  }, [userId, displayName]);

  return <nav className="novyra-bottom-nav" aria-label="Main navigation">
    <div className="novyra-bottom-items">
      <button type="button" className={`novyra-bottom-tab ${active === "home" ? "is-active" : ""}`} onClick={() => onNavigate("home")}>
        <Icon name="home" filled={active === "home"} /><span>Home</span>
      </button>
      <button type="button" className={`novyra-bottom-tab ${active === "friends" ? "is-active" : ""}`} onClick={() => onNavigate("friends")}>
        <Icon name="friends" filled={active === "friends"} /><span>Friends</span>
      </button>
      <button type="button" className="novyra-create-button" onClick={() => onNavigate("create")} aria-label="Create"><span>+</span></button>
      <button type="button" className={`novyra-bottom-tab ${active === "inbox" ? "is-active" : ""}`} onClick={() => onNavigate("inbox")}>
        <span className="novyra-inbox-icon"><Icon name="inbox" filled={active === "inbox"} /><i /></span><span>Inbox</span>
      </button>
      <button type="button" className={`novyra-bottom-tab novyra-profile-tab ${active === "profile" ? "is-active" : ""}`} onClick={() => onNavigate("profile")}>
        {avatar.startsWith("data:image/") || avatar.startsWith("https://") ? <img src={avatar} alt="" /> : <span className="novyra-profile-initial">{initial}</span>}
        <span>Profile</span>
      </button>
    </div>
  </nav>;
}
