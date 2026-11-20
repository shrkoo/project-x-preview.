"use client";

import { House, Search, MessageCircle, UserRound } from "lucide-react";
import AppIcon from "./AppIcon";

export type NavKey = "home" | "search" | "create" | "reels" | "profile" | "friends" | "inbox";

type Props = { active: NavKey; userId?: string; displayName?: string; onNavigate: (key: NavKey) => void; onOpenAI: () => void; onOpenGame?: () => void };

export default function MobileBottomNav({ active, onNavigate }: Props) {
  const isActive = (key: NavKey) => active === key;
  return <nav className="novyra-bottom-nav" aria-label="Main navigation"><div className="novyra-bottom-items">
    <button type="button" className={`novyra-bottom-tab ${isActive("home") ? "is-active" : ""}`} onClick={() => onNavigate("home")}><AppIcon icon={House} /><span>Home</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("search") ? "is-active" : ""}`} onClick={() => onNavigate("search")}><AppIcon icon={Search}/><span>Search</span></button>
    <button type="button" className="novyra-create-button" onClick={() => onNavigate("create")} aria-label="Create"><span>+</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("inbox") ? "is-active" : ""}`} onClick={() => onNavigate("inbox")}><span className="novyra-inbox-icon"><AppIcon icon={MessageCircle}/><i/></span><span>Message</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("profile") ? "is-active" : ""}`} onClick={() => onNavigate("profile")}><AppIcon icon={UserRound}/><span>Profile</span></button>
  </div></nav>;
}
