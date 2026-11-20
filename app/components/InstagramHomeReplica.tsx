"use client";

import { Heart, Plus, ChevronDown, Search, Send, SquarePlay, House } from "lucide-react";

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <div className="nv-android-status" dir="ltr">
      <div className="nv-status-left"><span className="nv-battery">23</span><b>4G</b><span className="nv-signal"><i/><i/><i/><i/></span><span className="nv-vpn">VPN</span></div>
      <div className="nv-status-right"><b>···</b><span className="nv-mini-instagram">◎</span><span className="nv-mini-ai">✳</span><span className="nv-mini-instagram">◎</span><strong>۲۱:۴۶</strong></div>
    </div>
    <header className="nv-ig-header" dir="ltr">
      <button type="button" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/></button>
      <div className="nv-ig-wordmark"><ChevronDown/><span>Instagram</span></div>
      <button type="button" aria-label="ساخت پست" onClick={onCreate}><Plus/></button>
    </header>
    <div className="nv-ig-stories" dir="ltr">
      <div className="nv-ig-story nv-story-first"><div className="nv-ig-story-ring"><span className="nv-ig-story-image nv-story-photo-one"/></div><small>r.__.200cc</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring"><span className="nv-ig-story-image nv-story-photo-two"/></div><small>raha._cc250</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring dashed"><span className="nv-ig-story-image nv-story-photo-three"/></div><small>l_the_kami_l</small></div>
      <div className="nv-ig-story"><div className="nv-ig-story-ring own"><span className="nv-ig-story-image nv-story-photo-own"/><b className="nv-ig-add">+</b></div><small dir="rtl">داستان شما</small></div>
    </div>
    <article className="nv-ig-feature-post" dir="ltr">
      <header className="nv-ig-post-head">
        <span className="nv-ig-more"><i/><i/></span>
        <div className="nv-ig-post-account"><strong dir="rtl">akhbarsardasht و digikala_rayegan</strong><small dir="rtl">♫ digikala_rayegan · صدای اصلی</small></div>
        <div className="nv-ig-post-avatars"><i/><i/></div>
      </header>
      <div className="nv-ig-post-media" role="img" aria-label="جای تصویر پست"/>
    </article>
    <div className="nv-android-navigation" aria-hidden="true"><span className="nv-android-back"/><span className="nv-android-home"/><span className="nv-android-recents"/></div>
  </section>;
}
