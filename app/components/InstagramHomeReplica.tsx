"use client";

import { Heart, Plus, Search, Send, SquarePlay, House, UserRound, MoreHorizontal } from "lucide-react";

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/><i/></button>
      <div className="nv-ig-wordmark">NOVYRA</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>

    <div className="nv-ig-stories" dir="rtl">
      <div className="nv-ig-story nv-ig-own-story"><div className="nv-ig-story-ring own"><span className="nv-ig-story-image nv-story-photo-own"/><b className="nv-ig-add">+</b></div><small>داستان شما</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring nv-ring-live"><span className="nv-ig-story-image nv-story-charles"/><b className="nv-ig-live-badge">••</b></div><small>charlesdobronxs</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring"><span className="nv-ig-story-image nv-story-ufc"><b>UFC</b></span></div><small>ufc</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring"><span className="nv-ig-story-image nv-story-pars"><b>اخبار<br/>سردشت</b></span></div><small>parsardasht</small></div>
    </div>

    <article className="nv-ig-feature-post" dir="ltr">
      <header className="nv-ig-post-head">
        <div className="nv-ig-post-actions"><button type="button" className="nv-ig-more" aria-label="گزینه‌های بیشتر"><MoreHorizontal/></button><button type="button" className="nv-ig-follow">دنبال کردن</button></div>
        <div className="nv-ig-post-account" dir="rtl"><strong>digiato.ai</strong><small>پیشنهادشده برای شما</small></div>
        <span className="nv-ig-digiato-avatar" aria-hidden="true"><span>✦</span></span>
      </header>
      <div className="nv-ig-post-engagement" dir="rtl"><span>♡　◯　↗</span><span>⌑</span></div>
    </article>

    <nav className="nv-ig-bottom-nav" aria-label="ناوبری اصلی" dir="ltr">
      <span className="nv-ig-profile-icon"><UserRound/></span>
      <Search/>
      <span className="nv-ig-message-icon"><Send/><i/></span>
      <SquarePlay/>
      <span className="nv-ig-home-active"><House/></span>
    </nav>
    <div className="nv-android-navigation" aria-hidden="true"><span className="nv-android-back"/><span className="nv-android-home"/><span className="nv-android-recents"/></div>
  </section>;
}
