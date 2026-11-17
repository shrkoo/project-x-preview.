"use client";

import { useState } from "react";

type Tab = "home" | "games" | "friends" | "profile";
type Game = { title: string; category: string; players: string; time: string; tone: string; symbol: string };

const games: Game[] = [
  { title: "حقیقت یا چالش", category: "جمع‌های دوستانه", players: "۲ تا ۱۲ نفر", time: "۱۰ دقیقه", tone: "violet", symbol: "✳" },
  { title: "چقدر منو می‌شناسی؟", category: "شناخت دوستان", players: "۲ تا ۸ نفر", time: "۵ دقیقه", tone: "orange", symbol: "♡" },
  { title: "نبرد اطلاعات", category: "دانستنی‌ها", players: "۲ تا ۱۰ نفر", time: "۸ دقیقه", tone: "blue", symbol: "✦" },
  { title: "انتخاب غیرممکن", category: "چالش سریع", players: "۲ تا ۱۲ نفر", time: "۳ دقیقه", tone: "green", symbol: "⇄" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [auth, setAuth] = useState<"login" | "signup" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Game | null>(null);

  function submitAuth() {
    setNotice("این فرم فعلاً نمایشی است؛ برای ساخت حساب واقعی باید سرویس احراز هویت متصل شود.");
  }

  function createRoom() {
    if (!room.trim()) { setNotice("اول یک نام برای دورهمی انتخاب کن."); return; }
    setNotice("اتاق نمایشی ساخته شد. اتصال دوستان از دستگاه‌های دیگر در نسخه بعدی فعال می‌شود.");
  }

  return (
    <main className="app-shell" dir="rtl">
      <aside className="side-rail">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab("home"); }}><span className="brand-mark">x</span><span>project<span className="brand-x">x</span></span></a>
        <div className="rail-label">فضای شما</div>
        <button className={tab === "home" ? "rail-link active" : "rail-link"} onClick={() => setTab("home")}><span>⌂</span> خانه</button>
        <button className={tab === "games" ? "rail-link active" : "rail-link"} onClick={() => setTab("games")}><span>▦</span> بازی‌ها</button>
        <button className={tab === "friends" ? "rail-link active" : "rail-link"} onClick={() => setTab("friends")}><span>♧</span> دوستان</button>
        <button className={tab === "profile" ? "rail-link active" : "rail-link"} onClick={() => setTab("profile")}><span>◉</span> پروفایل</button>
        <div className="rail-bottom"><div className="rail-avatar">{name ? name.slice(0,1) : "م"}</div><div><strong>{name || "مهمان"}</strong><small>حساب کاربری</small></div><button onClick={() => setAuth("login")} aria-label="ورود">↗</button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">x</span><b>project<span className="brand-x">x</span></b></div>
          <div className="breadcrumb">فضای شخصی <span>/</span> {tab === "home" ? "خانه" : tab === "games" ? "بازی‌ها" : tab === "friends" ? "دوستان" : "پروفایل"}</div>
          <div className="top-actions"><button className="icon-button" onClick={() => setNotice("هنوز اعلان تازه‌ای نداری.")}>♧</button><button className="login-button" onClick={() => setAuth("login")}>ورود</button><button className="signup-button" onClick={() => setAuth("signup")}>ساخت حساب <span>←</span></button></div>
        </header>

        {tab === "home" && <div className="content">
          <section className="welcome-row"><div><div className="overline"><i /> فضای بازی شما</div><h1>سلام، {name || "رفیق"} <span className="wave">✳</span></h1><p>آماده‌ای یک خاطره تازه با دوستات بسازی؟</p></div><button className="outline-button" onClick={() => setTab("profile")}>تکمیل پروفایل <span>↗</span></button></section>
          <section className="hero-banner"><div className="banner-copy"><span className="banner-tag">با هم بهتره</span><h2>دورهمی بعدی،<br/>شروع یک خاطره‌ست.</h2><p>اتاقت رو بساز، دوستات رو دعوت کن و بازی رو شروع کن.</p><button className="light-button" onClick={() => document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"})}>ساخت دورهمی جدید <span>←</span></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-center">X</div><span className="art-chip chip-one">PLAY</span><span className="art-chip chip-two">TOGETHER</span><span className="art-star">✳</span></div></section>
          <div className="section-title"><div><span className="overline">منتخب برای تو</span><h2>بازی‌های محبوب</h2></div><button className="text-button" onClick={() => setTab("games")}>همه بازی‌ها <span>←</span></button></div>
          <div className="game-grid">{games.slice(0,3).map((g) => <button className="game-card" key={g.title} onClick={() => {setSelected(g); setNotice("بازی انتخاب شد؛ برای شروع، یک اتاق بساز.")}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div>
          <section className="lower-grid" id="create-room"><div className="panel-card create-panel"><div className="section-title compact"><div><span className="overline">شروع کن</span><h2>اتاق جدید بساز</h2></div><span className="panel-icon">＋</span></div><p>یک اسم برای جمع‌تان انتخاب کن. بقیه‌اش با هم ساخته می‌شود.</p><div className="room-input-row"><input value={room} onChange={e=>setRoom(e.target.value)} placeholder="مثلاً دورهمی جمعه‌شب" maxLength={36}/><button onClick={createRoom}>ساخت اتاق <span>←</span></button></div></div><div className="panel-card invite-panel"><span className="invite-icon">♧</span><div><span className="overline">تنها بازی نکن</span><h3>آدم‌های خودت رو بیار</h3><p>دوستانت را دعوت کن تا جمع کامل شود.</p><button className="text-button" onClick={()=>setTab("friends")}>رفتن به دوستان ←</button></div></div></section>
        </div>}

        {tab === "games" && <div className="content"><div className="page-heading"><span className="overline">کتابخانه سرگرمی</span><h1>بازی‌ای برای هر جمع</h1><p>از یک چالش کوتاه تا رقابت‌های دوستانه؛ انتخاب با شماست.</p></div><div className="game-grid all-games">{games.map(g=><button className="game-card" key={g.title} onClick={()=>{setSelected(g);setNotice("این بازی انتخاب شد. برای تجربه گروهی، ابتدا اتاق بساز.")}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div></div>}

        {tab === "friends" && <div className="content"><div className="page-heading"><span className="overline">دایره آدم‌های تو</span><h1>بازی با دوستات بهتره.</h1><p>فضای دوستانت اینجاست؛ دعوت و بازی گروهی به‌زودی با اتصال حساب‌ها فعال می‌شود.</p></div><div className="empty-state"><div className="empty-symbol">♧</div><h2>هنوز کسی اینجا نیست</h2><p>وقتی قابلیت حساب کاربری و دعوت آنلاین متصل شود، دوستانت را اینجا می‌بینی.</p><button className="signup-button" onClick={()=>setAuth("signup")}>ساخت حساب کاربری <span>←</span></button></div></div>}

        {tab === "profile" && <div className="content"><div className="page-heading"><span className="overline">هویت تو در Project X</span><h1>پروفایل کاربری</h1><p>اطلاعاتت را برای تجربه شخصی‌تر آماده کن.</p></div><div className="profile-card"><div className="profile-avatar">{name ? name.slice(0,1) : "م"}</div><div className="profile-fields"><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نامی که دوستانت می‌بینند"/><label>ایمیل</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" type="email"/><button className="signup-button" onClick={()=>setNotice("پروفایل در این پیش‌نمایش فقط روی همین صفحه نگهداری می‌شود.")}>ذخیره تغییرات <span>←</span></button></div></div></div>}

        {notice && <div className="toast" role="status"><span>✦</span>{notice}<button onClick={()=>setNotice("")}>×</button></div>}
        {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className={"game-art modal-art "+selected.tone}><span>{selected.symbol}</span><small>PROJECT X / GAME</small></div><span className="overline">{selected.category}</span><h2>{selected.title}</h2><p>یک تجربه گروهی برای ساختن لحظه‌های متفاوت.</p><button className="signup-button" onClick={()=>{setSelected(null);setTab("home");document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"})}}>ساخت اتاق برای این بازی ←</button></div></div>}
      </section>

      <nav className="mobile-nav"><button className={tab==="home"?"chosen":""} onClick={()=>setTab("home")}><span>⌂</span>خانه</button><button className={tab==="games"?"chosen":""} onClick={()=>setTab("games")}><span>▦</span>بازی‌ها</button><button className={tab==="friends"?"chosen":""} onClick={()=>setTab("friends")}><span>♧</span>دوستان</button><button className={tab==="profile"?"chosen":""} onClick={()=>setTab("profile")}><span>◉</span>پروفایل</button></nav>

      {auth && <div className="modal-backdrop" onClick={()=>{setAuth(null);setNotice("")}}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>{setAuth(null);setNotice("")}}>×</button><div className="brand auth-brand"><span className="brand-mark">x</span><span>project<span className="brand-x">x</span></span></div><span className="overline">{auth==="signup"?"به جمع ما اضافه شو":"خوش برگشتی"}</span><h2>{auth==="signup"?"ساخت حساب کاربری":"ورود به حساب"}</h2><p>برای شروع تجربه شخصی Project X</p>{auth==="signup" && <><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما"/></>}<label>ایمیل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/><label>رمز عبور</label><input type="password" placeholder="حداقل ۸ کاراکتر"/><button className="signup-button auth-submit" onClick={submitAuth}>{auth==="signup"?"ساخت حساب":"ورود"} <span>←</span></button><button className="switch-auth" onClick={()=>{setAuth(auth==="signup"?"login":"signup");setNotice("")}}>{auth==="signup"?"حساب داری؟ وارد شو":"حساب نداری؟ ثبت‌نام کن"}</button>{notice && <p className="auth-note">{notice}</p>}<small className="demo-note">نسخه نمایشی · اتصال احراز هویت هنوز انجام نشده</small></div></div>}
    </main>
  );
}
