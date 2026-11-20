"use client";

import { House, Clapperboard, MessageCircle, Search, UserRound } from "lucide-react";
import AppIcon from "./AppIcon";

export type NavKey = "home" | "search" | "create" | "reels" | "profile" | "friends" | "inbox";

type Props = { active: NavKey; labels?: { home: string; reels: string; message: string; search: string; profile: string }; userId?: string; displayName?: string; onNavigate: (key: NavKey) => void; onOpenAI: () => void; onOpenGame?: () => void };

export default function MobileBottomNav({ active, onNavigate, labels = { home: "Home", reels: "Videos", message: "Message", search: "Explore", profile: "Profile" } }: Props) {
  const isActive = (key: NavKey) => active === key;
  return <nav className="novyra-bottom-nav" aria-label="Main navigation"><div className="novyra-bottom-items">
    <button type="button" className={`novyra-bottom-tab ${isActive("home") ? "is-active" : ""}`} onClick={() => onNavigate("home")}><AppIcon icon={House}/><span>{labels.home}</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("reels") ? "is-active" : ""}`} onClick={() => onNavigate("reels")}><AppIcon icon={Clapperboard}/><span>{labels.reels}</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("inbox") ? "is-active" : ""}`} onClick={() => onNavigate("inbox")}><span className="novyra-inbox-icon"><AppIcon icon={MessageCircle}/><i/></span><span>{labels.message}</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("search") ? "is-active" : ""}`} onClick={() => onNavigate("search")}><AppIcon icon={Search}/><span>{labels.search}</span></button>
    <button type="button" className={`novyra-bottom-tab ${isActive("profile") ? "is-active" : ""}`} onClick={() => onNavigate("profile")}><AppIcon icon={UserRound}/><span>{labels.profile}</span></button>
  </div></nav>;
}
