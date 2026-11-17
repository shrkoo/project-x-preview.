"use client";

import { useMemo, useState } from "react";

type Mode = "quick" | "friends" | "trivia";
type Stage = "home" | "room" | "play" | "result";
type Player = { id: number; name: string; score: number };

const modes: { id: Mode; number: string; title: string; description: string; duration: string }[] = [
  { id: "quick", number: "01", title: "چالش‌های سریع", description: "انتخاب‌های غیرمنتظره و لحظه‌های بامزه", duration: "۳ دقیقه" },
  { id: "friends", number: "02", title: "چقدر همدیگر را می‌شناسید؟", description: "حدس بزنید دوستانتان چه جوابی می‌دهند", duration: "۵ دقیقه" },
  { id: "trivia", number: "03", title: "دانستنی‌ها", description: "دانشتان را در یک رقابت دوستانه بسنجید", duration: "۴ دقیقه" },
];

const rounds: Record<Mode, { question: string; answers: string[]; correct: number }[]> = {
  quick: [
    { question: "اگر همین حالا می‌توانستی هر جایی باشی، کجا را انتخاب می‌کردی؟", answers: ["یک کافه دنج در شهر", "کنار دریا، دور از شلوغی", "وسط یک ماجراجویی تازه", "خانه، با آدم‌های موردعلاقه‌ام"], correct: 2 },
    { question: "برای یک روز کاملاً آزاد، کدام را انتخاب می‌کنی؟", answers: ["کشف یک جای جدید", "فیلم و استراحت", "بازی با دوستان", "یاد گرفتن چیزی تازه"], correct: 2 },
    { question: "کدام توانایی را انتخاب می‌کنی؟", answers: ["توقف زمان", "پرواز", "تله‌پورت", "صحبت با حیوانات"], correct: 2 },
  ],
  friends: [
    { question: "بهترین ویژگی یک دوست از نظر تو چیست؟", answers: ["صداقت", "شوخ‌طبعی", "وفاداری", "ماجراجویی"], correct: 2 },
    { question: "در سفر گروهی معمولاً چه نقشی داری؟", answers: ["برنامه‌ریز", "عکاس گروه", "ماجراجو", "مسئول خوراکی‌ها"], correct: 0 },
    { question: "کدام هدیه بیشتر خوشحالت می‌کند؟", answers: ["یک کتاب خوب", "وسیله‌ای کاربردی", "تجربه‌ای تازه", "یک سورپرایز شخصی"], correct: 2 },
  ],
  trivia: [
    { question: "کدام سیاره به سیاره سرخ معروف است؟", answers: ["زهره", "مریخ", "مشتری", "عطارد"], correct: 1 },
    { question: "بزرگ‌ترین اقیانوس جهان کدام است؟", answers: ["اطلس", "هند", "آرام", "منجمد شمالی"], correct: 2 },
    { question: "عدد پی تقریباً برابر با چیست؟", answers: ["۲٫۱۴", "۳٫۱۴", "۴٫۱۳", "۳٫۴۱"], correct: 1 },
  ],
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("home");
  const [mode, setMode] = useState<Mode>("quick");
  const [host, setHost] = useState("");
  const [roomName, setRoomName] = useState("دورهمی دوستان");
  const [players, setPlayers] = useState<Player[]>([]);
  const [guest, setGuest] = useState("");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const questionSet = rounds[mode];
  const current = questionSet[index];
  const ranking = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);

  function createRoom() {
    if (!host.trim()) { setFeedback("برای ساخت اتاق، یک نام نمایشی وارد کن."); return; }
    setPlayers([{ id: 1, name: host.trim(), score: 0 }]);
    setCode(Math.random().toString(36).slice(2, 7).toUpperCase());
    setFeedback("");
    setStage("room");
  }

  function addPlayer() {
    const name = guest.trim();
    if (!name) { setFeedback("نام بازیکن را وارد کن."); return; }
    if (players.some((player) => player.name.toLowerCase() === name.toLowerCase())) { setFeedback("این نام قبلاً اضافه شده است."); return; }
    setPlayers((old) => [...old, { id: Date.now(), name, score: 0 }]);
    setGuest("");
    setFeedback("بازیکن آزمایشی اضافه شد.");
  }

  function answer() {
    if (choice === null) return;
    const correct = mode !== "trivia" || choice === current.correct;
    setPlayers((old) => old.map((player, i) => i === 0 ? { ...player, score: player.score + (correct ? 10 : 0) } : player));
    setFeedback(mode === "trivia" ? (correct ? "پاسخ درست بود. ۱۰ امتیاز گرفتی." : "این بار نه؛ سؤال بعدی در راه است.") : "انتخابت ثبت شد. ۱۰ امتیاز مشارکت گرفتی.");
  }

  function next() {
    if (index + 1 === questionSet.length) { setStage("result"); setFeedback(""); return; }
    setIndex((n) => n + 1); setChoice(null); setFeedback("");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFeedback("کد اتاق کپی شد. دعوت چنددستگاهی هنوز در نسخه آزمایشی فعال نیست.");
    } catch {
      setFeedback("کد اتاق: " + code);
    }
  }

  function reset() {
    setStage("home"); setPlayers([]); setFeedback(""); setChoice(null); setIndex(0); setCopied(false);
  }

  return (
    <main className="site">
      <header className="nav wrap">
        <a className="wordmark" href="#" onClick={(e) => { e.preventDefault(); reset(); }}>
          <span className="mark">x</span><span>project<span className="wordmark-light">x</span></span>
        </a>
        <div className="nav-center"><span className="nav-dot" /> تجربه‌های گروهی، در یک جا</div>
        <span className="nav-status"><i /> پیش‌نمایش محصول</span>
      </header>

      {stage === "home" && (
        <>
          <section className="hero wrap">
            <div className="hero-copy">
              <div className="kicker"><span className="kicker-line" /> برای جمع‌هایی که معمولی نیستند</div>
              <h1>لحظه‌های خوب،<br /><em>اتفاقی نیستند.</em></h1>
              <p className="hero-text">یک اتاق بسازید، دوستانتان را دعوت کنید و با چالش‌هایی که هر جمع را به خاطره تبدیل می‌کنند، کنار هم بازی کنید.</p>
              <div className="hero-actions">
                <a className="button button-dark" href="#create">شروع یک دورهمی <span>←</span></a>
                <span className="action-note">بدون نصب · شروع در چند ثانیه</span>
              </div>
              <div className="hero-proof"><div className="proof-avatars"><b>م</b><b>آ</b><b>ر</b><b>+</b></div><span>برای بازی با آدم‌های خودتان ساخته شده</span></div>
            </div>

            <div className="visual-wrap" aria-label="پیش‌نمایش یک اتاق بازی">
              <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
              <div className="floating-note note-top"><span className="note-icon">✳</span><span><strong>یک جمع، یک بازی</strong><small>همه در جریان‌اند</small></span></div>
              <div className="game-preview">
                <div className="preview-top"><span className="preview-label">اتاق خصوصی</span><span className="live"><i /> در حال آماده‌سازی</span></div>
                <div className="preview-title">دورهمی جمعه‌شب</div>
                <div className="preview-sub">یک چالش کوتاه برای شروع</div>
                <div className="preview-question">کدام مقصد را برای سفر گروهی انتخاب می‌کنید؟</div>
                <div className="preview-options"><div><span>01</span> یک کلبه وسط جنگل <b>↗</b></div><div className="preview-selected"><span>02</span> خانه‌ای کنار دریا <b>✓</b></div><div><span>03</span> گشت‌وگذار در شهر <b>↗</b></div></div>
                <div className="preview-bottom"><div className="mini-people"><b>س</b><b>م</b><b>آ</b><b>+</b></div><span>۴ نفر در این اتاق</span><span className="preview-step">۱ / ۳</span></div>
              </div>
              <div className="floating-note note-bottom"><span className="spark">✦</span><span><strong>هر بار متفاوت</strong><small>خاطره‌ای برای تکرار</small></span></div>
            </div>
          </section>

          <section className="create-section wrap" id="create">
            <div className="section-heading"><div><div className="eyebrow">شروع ساده است</div><h2>جمع شما، قوانین شما.</h2></div><p>نوع بازی را انتخاب کنید.<br />بقیه‌اش را با هم می‌سازید.</p></div>
            <div className="create-card">
              <div className="mode-list">
                {modes.map((item) => (
                  <button key={item.id} className={mode === item.id ? "mode-row active" : "mode-row"} onClick={() => setMode(item.id)}>
                    <span className="mode-number">{item.number}</span><span className="mode-copy"><strong>{item.title}</strong><small>{item.description}</small></span><span className="mode-time">{item.duration}</span><span className="mode-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="create-form">
                <div className="form-top"><span className="form-index">01 / ساخت اتاق</span><span className="form-lock">◈ فضای خصوصی</span></div>
                <label htmlFor="roomName">اسم دورهمی</label><input id="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={32} />
                <label htmlFor="hostName">اسم شما</label><input id="hostName" value={host} onChange={(e) => setHost(e.target.value)} placeholder="چطور صدایتان کنیم؟" maxLength={18} />
                <button className="button button-dark button-full" onClick={createRoom}>ساخت اتاق <span>←</span></button>
                {feedback && <p className="feedback" role="status">{feedback}</p>}
                <p className="form-foot">رایگان برای شروع · بدون نیاز به نصب</p>
              </div>
            </div>
          </section>

          <section className="values wrap">
            <div><span>01</span><strong>شروع بی‌دردسر</strong><p>بدون پیچیدگی و بدون معطلی، مستقیم وارد بازی شوید.</p></div>
            <div><span>02</span><strong>برای همه‌ی جمع</strong><p>تجربه‌ای که با حضور دوستان معنا پیدا می‌کند.</p></div>
            <div><span>03</span><strong>هر بار یک خاطره</strong><p>چالش‌های کوتاه، انتخاب‌های تازه و نتیجه‌ای مشترک.</p></div>
          </section>
        </>
      )}

      {stage === "room" && <section className="stage-card wrap">
        <div className="stage-kicker">اتاق شما آماده است</div><div className="stage-head"><div><h1 className="stage-title">{roomName || "دورهمی دوستان"}</h1><p>دوستانتان را اضافه کنید و بازی را شروع کنید.</p></div><div className="room-code"><small>کد اتاق</small><strong>{code}</strong></div></div>
        <div className="member-list">{players.map((p, i) => <div className="member" key={p.id}><span className="member-avatar">{p.name.slice(0,1)}</span><strong>{p.name}</strong><small>{i === 0 ? "میزبان" : "بازیکن آزمایشی"}</small></div>)}</div>
        <div className="add-member"><label htmlFor="guest">افزودن بازیکن آزمایشی</label><div><input id="guest" value={guest} onChange={(e) => setGuest(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="نام بازیکن" maxLength={18}/><button className="button button-outline" onClick={addPlayer}>افزودن</button></div></div>
        <div className="stage-actions"><button className="button button-dark" onClick={() => { setIndex(0); setChoice(null); setFeedback(""); setStage("play"); }}>شروع بازی <span>←</span></button><button className="button button-outline" onClick={copyCode}>{copied ? "کپی شد" : "کپی کد اتاق"}</button></div>
        {feedback && <p className="feedback">{feedback}</p>}<p className="fine-print">این پیش‌نمایش با داده آزمایشی و روی همین دستگاه اجرا می‌شود؛ دعوت چنددستگاهی هنوز فعال نیست.</p>
      </section>}

      {stage === "play" && <section className="stage-card game-card wrap">
        <div className="game-meta"><span>{modes.find((m) => m.id === mode)?.title}</span><span>سؤال {index + 1} از {questionSet.length}</span></div><div className="progress"><i style={{ width: ((index + 1) / questionSet.length * 100) + "%" }} /></div>
        <h1 className="question-title">{current.question}</h1><div className="answer-list">{current.answers.map((a, i) => <button key={a} disabled={!!feedback} className={choice === i ? "answer selected" : "answer"} onClick={() => setChoice(i)}><span>0{i + 1}</span>{a}<b>{choice === i ? "✓" : "＋"}</b></button>)}</div>
        {feedback ? <><p className="feedback">{feedback}</p><button className="button button-dark button-full" onClick={next}>{index + 1 === questionSet.length ? "دیدن نتیجه" : "سؤال بعدی"} <span>←</span></button></> : <button className="button button-dark button-full" disabled={choice === null} onClick={answer}>ثبت پاسخ <span>←</span></button>}
      </section>}

      {stage === "result" && <section className="stage-card result-card wrap"><div className="stage-kicker">پایان این دورهمی</div><div className="result-symbol">✳</div><h1 className="stage-title">این تازه شروع ماجراست.</h1><p>نتیجه‌ی این اجرای آزمایشی</p><div className="result-score">{players[0]?.score ?? 0}<small>امتیاز</small></div><div className="member-list">{ranking.map((p, i) => <div className="member" key={p.id}><span className="member-avatar">{i + 1}</span><strong>{p.name}</strong><small>{p.score} امتیاز</small></div>)}</div><button className="button button-dark button-full" onClick={reset}>ساخت دورهمی جدید <span>←</span></button><p className="fine-print">نتیجه فقط در همین اجرای آزمایشی نگهداری شده است.</p></section>}

      <footer className="footer wrap"><a className="wordmark" href="#" onClick={(e) => { e.preventDefault(); reset(); }}><span className="mark">x</span><span>project<span className="wordmark-light">x</span></span></a><span>برای لحظه‌هایی که با هم ساخته می‌شوند.</span><span>© 2026 Project X · پیش‌نمایش مفهومی</span></footer>
    </main>
  );
}
