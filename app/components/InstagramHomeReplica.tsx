"use client";

import { Heart, Plus, MessageCircle, Send, Bookmark, Repeat2 } from "lucide-react";

const stories = [
  { name: "داستان شما", kind: "own" },
  { name: "charlesdobronxs", kind: "charles" },
  { name: "ufc", kind: "ufc" },
  { name: "parsardasht", kind: "parsardasht" },
];

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/></button>
      <div className="nv-ig-wordmark" aria-label="Instagram">Instagram</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>

    <section className="nv-ig-stories" dir="rtl" aria-label="داستان‌ها">
      {stories.map(story => <div className="nv-ig-story" key={story.kind}>
        <span className={`nv-ig-story-ring ${story.kind === "own" ? "own" : ""}`}>
          <span className={`nv-ig-story-image nv-story-${story.kind}`} aria-hidden="true">
            {story.kind === "ufc" ? <b className="nv-ig-ufc-logo">UFC</b> : null}
            {story.kind === "parsardasht" ? <span className="nv-ig-earth">🌍</span> : null}
          </span>
          {story.kind === "own" && <span className="nv-ig-add">+</span>}
          {story.kind === "charles" && <span className="nv-ig-story-glasses" aria-label="نشان ویژه">🕶</span>}
        </span>
        <small dir="ltr">{story.name}</small>
      </div>)}
    </section>

    <article className="nv-ig-feature-post" dir="rtl" aria-label="پست پیشنهادی digiato.ai">
      <header className="nv-ig-post-head">
        <span className="nv-ig-digiato-avatar" aria-hidden="true"><span className="nv-digiato-symbol" aria-hidden="true"><i/><i/><i/></span></span>
        <div className="nv-ig-post-account"><strong dir="ltr">digiato.ai</strong><small>پیشنهادشده برای شما</small></div>
        <div className="nv-ig-post-actions">
          <button type="button" className="nv-ig-follow">دنبال کردن</button>
          <button type="button" className="nv-ig-more" aria-label="گزینه‌های بیشتر"><span/><span/></button>
        </div>
      </header>

      <div className="nv-ig-post-media" role="img" aria-label="پرچم کره شمالی، مانیتور گفت‌وگوی چت‌بات چشمه خرد و تیتر خبر">
        <div className="nv-ig-art-grid" aria-hidden="true"/>
        <div className="nv-ig-north-korea-flag"><i/><b>★</b></div>
        <div className="nv-ig-chat-window">
          <div className="nv-ig-chat-title"><span className="nv-ig-chat-orb">✳</span><span>چشمه خرد</span><small>هوش مصنوعی</small></div>
          <div className="nv-ig-chat-bubble user">درباره فناوری امروز توضیح بده</div>
          <div className="nv-ig-chat-bubble assistant">سلام! من چشمه خرد هستم؛ دستیار هوشمند شما.</div>
          <div className="nv-ig-chat-bubble user short">چه قابلیت‌هایی داری؟</div>
        </div>
        <div className="nv-ig-news-title">کره شمالی از چت‌بات هوش مصنوعی خود با نام «چشمه خرد» رونمایی کرد</div>
        <div className="nv-ig-digiato-mark"><b>d</b><span>DIGIATO AI</span></div>
      </div>

      <footer className="nv-ig-post-engagement" dir="rtl" aria-label="واکنش‌ها">
        <div className="nv-ig-engage-actions"><Heart/><MessageCircle/><Repeat2/><Send/></div>
        <Bookmark/>
      </footer>
    </article>
  </section>;
}
