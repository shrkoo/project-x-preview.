"use client";

import { Heart, Plus, Menu, MessageCircle, Send, Bookmark, House, Search, SquarePlay } from "lucide-react";

const stories = [
  { name: "داستان شما", kind: "own", mark: "" },
  { name: "charlesdobronxs", kind: "charles", mark: "" },
  { name: "ufc", kind: "ufc", mark: "UFC" },
  { name: "parsardasht", kind: "parsardasht", mark: "" },
];

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/></button>
      <div className="nv-ig-wordmark">Instagram</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>
    <section className="nv-ig-stories" dir="rtl" aria-label="داستان‌ها">
      {stories.map(story => <div className="nv-ig-story" key={story.kind}>
        <span className={`nv-ig-story-ring ${story.kind === "own" ? "own" : ""}`}>
          <span className={`nv-ig-story-image nv-story-${story.kind}`} aria-hidden="true">{story.mark}</span>
          {story.kind === "own" && <span className="nv-ig-add">+</span>}
          {story.kind === "charles" && <span className="nv-ig-story-glasses">✦</span>}
        </span>
        <small dir="ltr">{story.name}</small>
      </div>)}
    </section>
    <article className="nv-ig-feature-post" dir="rtl" aria-label="پست پیشنهادی digiato.ai">
      <header className="nv-ig-post-head">
        <span className="nv-ig-digiato-avatar" aria-hidden="true"><span className="nv-digiato-symbol">d</span></span>
        <div className="nv-ig-post-account"><strong dir="ltr">digiato.ai</strong><small>پیشنهادشده برای شما</small></div>
        <div className="nv-ig-post-actions">
          <button type="button" className="nv-ig-follow">دنبال کردن</button>
          <button type="button" className="nv-ig-more" aria-label="گزینه‌های بیشتر"><Menu/></button>
        </div>
      </header>
      <div className="nv-ig-post-media" role="img" aria-label="پرچم کره شمالی و رابط گفت‌وگوی چت‌بات هوش مصنوعی چشمه خرد">
        <div className="nv-ig-post-topline"><span>AI NEWS</span><span>TECH / WORLD</span></div>
        <div className="nv-ig-north-korea-flag"><i/><b>★</b></div>
        <div className="nv-ig-chat-window">
          <div className="nv-ig-chat-title"><span className="nv-ig-chat-orb">✳</span><span>چشمه خرد</span><small>هوش مصنوعی</small></div>
          <div className="nv-ig-chat-bubble user">درباره فناوری امروز توضیح بده</div>
          <div className="nv-ig-chat-bubble assistant">سلام! من چشمه خرد هستم؛ دستیار هوشمند شما.</div>
          <div className="nv-ig-chat-bubble user short">چه قابلیت‌هایی داری؟</div>
          <div className="nv-ig-chat-input">پیامت را بنویس… <span>↑</span></div>
        </div>
        <div className="nv-ig-news-title">کره شمالی از چت‌بات هوش مصنوعی خود با نام «چشمه خرد» رونمایی کرد</div>
        <div className="nv-ig-digiato-mark"><b>d</b><span>DIGIATO AI</span></div>
      </div>
      <footer className="nv-ig-post-engagement" dir="rtl">
        <div className="nv-ig-engage-actions"><Heart/><MessageCircle/><Send/></div><Bookmark/>
      </footer>
    </article>
  </section>;
}
