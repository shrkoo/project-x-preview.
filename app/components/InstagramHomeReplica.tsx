"use client";

import { Heart, Plus, Search, Send, SquarePlay, House, UserRound } from "lucide-react";

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/><i/></button>
      <div className="nv-ig-wordmark">NOVYRA</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>

    <div className="nv-ig-stories" dir="ltr">
      <div className="nv-ig-story nv-story-first"><div className="nv-ig-story-ring"><span className="nv-ig-story-image"/></div><small>akhbarsardasht</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring"><span className="nv-ig-story-image"/></div><small>ufc</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring"><span className="nv-ig-story-image"/><b className="nv-ig-glasses">⌕</b></div><small>charlesdobronxs</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring own"><span className="nv-ig-story-image"/><b className="nv-ig-add">+</b></div><small dir="rtl">داستان شما</small></div>
    </div>

    <article className="nv-ig-feature-post" dir="ltr">
      <header className="nv-ig-post-head">
        <div className="nv-ig-post-actions"><span className="nv-ig-more"><i/><i/></span><span className="nv-ig-follow">دنبال کردن</span></div>
        <div className="nv-ig-post-account" dir="rtl"><strong>digiato.ai</strong><small>پیشنهادشده برای شما</small></div>
        <span className="nv-ig-digiato-avatar"/>
      </header>
      <div className="nv-ig-post-media" role="img" aria-label="جای تصویر پست">
        <div className="nv-ig-post-copy" dir="rtl">
          <strong>کره شمالی از چت‌بات هوش مصنوعی<br/>خود با نام «چشمه خرد» رونمایی کرد</strong>
        </div>
        <div className="nv-ig-digiato-mark" dir="ltr"><i/>DIGIATO AI</div>
      </div>
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
