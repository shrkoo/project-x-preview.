"use client";

import { useEffect, useState } from "react";
import { House, SquarePlay, Send, Plus } from "lucide-react";
import AppIcon from "./AppIcon";

export type NavKey = "home" | "search" | "create" | "reels" | "profile" | "friends" | "inbox";

type Props = {
  active: NavKey;
  labels?: { home: string; reels: string; message: string; search: string; profile: string };
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  hasUnreadMessages?: boolean;
  onNavigate: (key: NavKey) => void;
  onOpenAI: () => void;
  onOpenGame?: () => void;
};

export default function MobileBottomNav({
  active,
  onNavigate,
  labels = { home: "Home", reels: "Videos", message: "Messages", search: "Explore", profile: "Profile" },
  displayName = "Profile",
  avatarUrl,
  hasUnreadMessages = false,
}: Props) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [avatarUrl]);
  const initial = displayName.trim().charAt(0).toLocaleUpperCase() || "N";
  const showAvatar = Boolean(avatarUrl) && !avatarFailed;
  const tabs = [
    { key: "home" as const, label: labels.home, icon: House },
    { key: "reels" as const, label: labels.reels, icon: SquarePlay },
    { key: "create" as const, label: "ساخت پست", icon: Plus },
    { key: "inbox" as const, label: labels.message, icon: Send },
    { key: "profile" as const, label: labels.profile, icon: null },
  ];
  return (
    <nav className="novyra-bottom-nav" aria-label="Main navigation" dir="rtl">
      <div className="novyra-bottom-items">
        {tabs.map(({ key, label, icon }) => (
          <button key={key} type="button"
            className={`novyra-bottom-tab ${key === "profile" ? "novyra-profile-tab" : ""} ${key === "create" ? "novyra-create-button" : ""} ${key === "inbox" ? "novyra-inbox-tab" : ""} ${active === key ? "is-active" : ""}`}
            onClick={() => onNavigate(key)} aria-label={label}
            aria-current={active === key ? "page" : undefined}>
            {key === "create" ? <AppIcon icon={Plus}/> : key === "profile" ? (
              showAvatar ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)}/> :
                <span className="novyra-profile-fallback" aria-hidden="true">{initial}</span>
            ) : icon ? <AppIcon icon={icon}/> : null}
            {key === "inbox" && hasUnreadMessages && <i className="novyra-unread-dot" aria-label="Unread messages"/>}
            {key === "profile" && <span className="novyra-profile-accessible-name">{label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
