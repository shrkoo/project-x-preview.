"use client";

import { Heart, Plus, MoreHorizontal, MessageCircle, Send, Bookmark } from "lucide-react";

const stories = [
  { name: "داستان شما", kind: "own", mark: "ش" },
  { name: "arian_tech", kind: "arian", mark: "A" },
  { name: "nordic_lens", kind: "nordic", mark: "N" },
  { name: "sara_design", kind: "sara", mark: "S" },
];

export default function InstagramHomeReplica({ onCreate, onNotifications }: { onCreate: () => void; onNotifications: () => void }) {
  return <section className="nv-instagram-home" aria-label="صفحه خانه NOVYRA">
    <header className="nv-ig-header" dir="ltr">
      <button type="button" className="nv-ig-notifications" aria-label="اعلان‌ها" onClick={onNotifications}><Heart/><i/></button>
      <div className="nv-ig-wordmark">NOVYRA</div>
      <button type="button" aria-label="ساخت محتوا" onClick={onCreate}><Plus/></button>
    </header>
    <section className="nv-ig-stories" dir="rtl" aria-label="داستان‌ها">
      {stories.map(story => <div className="nv-ig-story" key={story.kind}>
        <span className={`nv-ig-story-ring ${story.kind === "own" ? "own" : ""}`}>
          <span className={`nv-ig-story-image nv-story-${story.kind}`} aria-hidden="true">{story.mark}</span>
          {story.kind === "own" && <span className="nv-ig-add">+</span>}
        </span>
        <small>{story.name}</small>
      </div>)}
    </section>
    <article className="nv-ig-feature-post" dir="rtl" aria-label="پست پیشنهادی digiato.ai">
      <header className="nv-ig-post-head">
        <span className="nv-ig-digiato-avatar" aria-hidden="true"><span>د</span></span>
        <div className="nv-ig-post-account"><strong dir="ltr">digiato.ai</strong><small>پیشنهادشده برای شما</small></div>
        <div className="nv-ig-post-actions">
          <button type="button" className="nv-ig-follow">دنبال کردن</button>
          <button type="button" className="nv-ig-more" aria-label="گزینه‌های بیشتر"><MoreHorizontal/></button>
        </div>
      </header>
      <div className="nv-ig-post-media" role="img" aria-label="طرح گرافیکی مدرن درباره نسل تازه هوش مصنوعی">
        <div className="nv-ig-art-orbit orbit-one"/><div className="nv-ig-art-orbit orbit-two"/>
        <div className="nv-ig-art-core"><span>AI</span><i/><b/><em/></div>
        <div className="nv-ig-art-grid"/>
        <div className="nv-ig-art-copy"><span>FUTURE / 2026</span><strong>هوش مصنوعی،<br/>یک قدم جلوتر</strong><small>فناوری، خلاقیت و آینده‌ای که همین حالا آغاز شده</small></div>
        <div className="nv-ig-art-brand">DIGIATO <i/></div>
      </div>
      <footer className="nv-ig-post-engagement" dir="rtl">
        <div className="nv-ig-engage-actions"><Heart/><MessageCircle/><Send/></div><Bookmark/>
      </footer>
    </article>
  </section>;
}
