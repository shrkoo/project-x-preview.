"use client";

import { House, SquarePlay, Send, UserRound, Search } from "lucide-react";
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
  const tabs = [
    { key: "home" as const, label: labels.home, icon: House },
    { key: "reels" as const, label: labels.reels, icon: SquarePlay },
    { key: "inbox" as const, label: labels.message, icon: Send },
    { key: "search" as const, label: labels.search, icon: Search },
  ];

  return (
    <nav className="novyra-bottom-nav" aria-label="Main navigation" dir="rtl">
      <div className="novyra-bottom-items">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            className={`novyra-bottom-tab ${active === key ? "is-active" : ""} ${key === "inbox" ? "novyra-inbox-tab" : ""}`}
            onClick={() => onNavigate(key)}
            aria-label={label}
            aria-current={active === key ? "page" : undefined}
          >
            <AppIcon icon={icon} />
            {key === "inbox" && hasUnreadMessages && <i className="novyra-unread-dot" aria-label="Unread messages" />}
          </button>
        ))}
        <button
          type="button"
          className={`novyra-bottom-tab novyra-profile-tab ${active === "profile" ? "is-active" : ""}`}
          onClick={() => onNavigate("profile")}
          aria-label={labels.profile}
          aria-current={active === "profile" ? "page" : undefined}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span className="novyra-profile-fallback"><AppIcon icon={UserRound} /></span>
          )}
          <span className="novyra-profile-accessible-name">{displayName}</span>
        </button>
      </div>
    </nav>
  );
}
