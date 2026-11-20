"use client";

import { House, Users, MessageSquare, User } from "lucide-react";
import { useEffect, useState } from "react";

export type NavKey = "home" | "search" | "create" | "reels" | "profile" | "friends" | "inbox";

type Props = { active: NavKey; userId?: string; displayName?: string; onNavigate: (key: NavKey) => void; onOpenAI: () => void; onOpenGame?: () => void };

export default function MobileBottomNav({ active, userId, onNavigate }: Props) {
  const [hasUnread, setHasUnread] = useState(false);
  useEffect(() => {
    try { setHasUnread(Boolean(localStorage.getItem("novyra-unread"))); } catch { setHasUnread(false); }
  }, [userId]);
  const iconProps = { size: 24, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <nav className="novyra-bottom-nav" aria-label="Main navigation"><div className="novyra-bottom-items">
    <button type="button" className={`novyra-bottom-tab ${active === "home" ? "is-active" : ""}`} onClick={() => onNavigate("home")}><House {...iconProps} fill={active === "home" ? "currentColor" : "none"} /><span>Home</span></button>
    <button type="button" className={`novyra-bottom-tab ${active === "friends" ? "is-active" : ""}`} onClick={() => onNavigate("friends")}><Users {...iconProps} fill={active === "friends" ? "currentColor" : "none"} /><span>Friends</span></button>
    <button type="button" className="novyra-create-button" onClick={() => onNavigate("create")} aria-label="Create"><span>+</span></button>
    <button type="button" className={`novyra-bottom-tab ${active === "inbox" ? "is-active" : ""}`} onClick={() => onNavigate("inbox")}><span className="novyra-inbox-icon"><MessageSquare {...iconProps} fill={active === "inbox" ? "currentColor" : "none"} />{hasUnread && <i />}</span><span>Inbox</span></button>
    <button type="button" className={`novyra-bottom-tab ${active === "profile" ? "is-active" : ""}`} onClick={() => onNavigate("profile")}><User {...iconProps} fill={active === "profile" ? "currentColor" : "none"} /><span>Profile</span></button>
  </div></nav>;
}
