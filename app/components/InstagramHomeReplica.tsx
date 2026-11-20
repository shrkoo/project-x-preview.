"use client";

import { Heart, Plus, ChevronDown } from "lucide-react";

function Virus({ small = false }: { small?: boolean }) {
  return <svg className={small ? "nv-virus nv-virus-small" : "nv-virus"} viewBox="0 0 120 120" aria-hidden="true">
    <g stroke="#1E5FB4" strokeWidth="7" strokeLinecap="round">
      <path d="M60 2v17M60 101v17M2 60h17M101 60h17M19 19l13 13M88 88l13 13M101 19 88 32M32 88l-13 13M35 5l7 17M78 98l7 17M5 35l17 7M98 78l17 7M85 5l-7 17M42 98l-7 17M115 35l-17 7M22 78l-17 7"/>
    </g>
    <circle cx="60" cy="60" r="39" fill="#2675CE" stroke="#164D9A" strokeWidth="5"/>
    <g fill="#76B5F0"><circle cx="45" cy="42" r="7"/><circle cx="73" cy="38" r="5"/><circle cx="78" cy="68" r="8"/><circle cx="48" cy="76" r="5"/></g>
  </svg>;
}

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
      {[
        ["r.__.200cc",""],
        ["raha._cc250",""],
        ["l_the_kami_l","dashed"],
        ["داستان شما","own"]
      ].map(([name,kind],index)=><div className="nv-ig-story" key={name}>
        <div className={`nv-ig-story-ring ${kind}`}><span className="nv-ig-story-image">{index===3?"":""}</span>{kind==="own"&&<b className="nv-ig-add">+</b>}</div>
        <small dir={index===3?"rtl":"ltr"}>{name}</small>
      </div>)}
    </div>
    <article className="nv-ig-feature-post" dir="ltr">
      <header className="nv-ig-post-head">
        <span className="nv-ig-more">☰</span>
        <div className="nv-ig-post-account"><strong dir="rtl">akhbarsardasht و digikala_rayegan</strong><small dir="rtl">♫ digikala_rayegan · صدای اصلی</small></div>
        <div className="nv-ig-post-avatars"><i/><i/></div>
      </header>
      <div className="nv-ig-poster">
        <div className="nv-ig-poster-dots"/>
        <div className="nv-ig-virus-area"><Virus/><Virus small/><span className="nv-ig-virus-tiny"><Virus small/></span></div>
        <div className="nv-ig-school-scene">
          <div className="nv-ig-school"><b>مدرسه</b><i/></div>
          <div className="nv-ig-no-school"><span className="nv-ig-bag"/></div>
          <svg className="nv-ig-warning" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 94 87H6Z" fill="#fff" stroke="#ddd" strokeWidth="4"/><path d="M50 32v27" stroke="#171717" strokeWidth="9" strokeLinecap="round"/><circle cx="50" cy="72" r="5" fill="#171717"/></svg>
        </div>
        <div className="nv-ig-banner nv-ig-banner-red"><span>تعطیلی مدارس</span></div>
        <div className="nv-ig-banner nv-ig-banner-gray"><span>مدارس ابتدایی</span></div>
        <div className="nv-ig-banner nv-ig-banner-white"><span>بوکان فردا</span></div>
        <div className="nv-ig-banner nv-ig-banner-yellow"><span>به دلیل شیوع ویروس آنفولانزا</span></div>
        <div className="nv-ig-banner nv-ig-banner-red nv-ig-banner-last"><span>تعطیل شد</span></div>
      </div>
    </article>
  </section>;
}
