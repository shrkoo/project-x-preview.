"use client";

import { useEffect, useState } from "react";

type Tab = "home" | "games" | "friends" | "profile";
type Game = { title: string; category: string; players: string; time: string; tone: string; symbol: string };
type Room = { id: string; name: string; game: string; createdAt: string };
type LocalAccount = { name: string; email: string };
const games: Game[] = [
  { title: "حقیقت یا چالش", category: "جمع‌های دوستانه", players: "۲ تا ۱۲ نفر", time: "۱۰ دقیقه", tone: "violet", symbol: "✳" },
  { title: "چقدر منو می‌شناسی؟", category: "شناخت دوستان", players: "۲ تا ۸ نفر", time: "۵ دقیقه", tone: "orange", symbol: "♡" },
  { title: "نبرد اطلاعات", category: "دانستنی‌ها", players: "۲ تا ۱۰ نفر", time: "۸ دقیقه", tone: "blue", symbol: "✦" },
  { title: "انتخاب غیرممکن", category: "چالش سریع", players: "۲ تا ۱۲ نفر", time: "۳ دقیقه", tone: "green", symbol: "⇄" },
];
const prompts: Record<string, string[]> = {
  "حقیقت یا چالش": ["آخرین باری که از ته دل خندیدی کی بود؟", "یک خاطره خنده‌دار از جمع تعریف کن.", "به یکی از افراد جمع یک تعریف واقعی بگو."],
  "چقدر منو می‌شناسی؟": ["غذای مورد علاقه من چیست؟", "اگر سفر رایگان داشته باشم کجا می‌روم؟", "بزرگ‌ترین ترس من چیست؟"],
  "نبرد اطلاعات": ["کدام سیاره به سیاره سرخ معروف است؟", "بزرگ‌ترین اقیانوس جهان کدام است؟", "عدد پی تقریباً چند است؟"],
  "انتخاب غیرممکن": ["یک سال بدون موسیقی یا یک سال بدون فیلم؟", "سفر به گذشته یا آینده؟", "همیشه تابستان یا همیشه زمستان؟"],
};
const readStore = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [auth, setAuth] = useState<"login" | "signup" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Game | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [round, setRound] = useState("");
  const [account, setAccount] = useState<LocalAccount | null>(null);

  useEffect(() => {
    const savedAccount = readStore<LocalAccount | null>("projectx-account", null);
    setAccount(savedAccount);
    if (savedAccount) { setName(savedAccount.name); setEmail(savedAccount.email); }
    setRooms(readStore<Room[]>("projectx-rooms", []));
  }, []);

  function notify(message: string) { setNotice(message); }
  function createRoom() {
    const cleanName = roomName.trim();
    if (!cleanName) { notify("برای اتاقت یک اسم انتخاب کن."); return; }
    const room: Room = { id: Math.random().toString(36).slice(2, 8).toUpperCase(), name: cleanName, game: selected?.title || "انتخاب نشده", createdAt: new Date().toISOString() };
    const next = [room, ...rooms].slice(0, 10);
    setRooms(next);
    localStorage.setItem("projectx-rooms", JSON.stringify(next));
    setActiveRoom(room);
    setRoomName("");
    setSelected(null);
    notify("اتاق روی همین دستگاه ساخته و ذخیره شد.");
  }
  function saveProfile() {
    const cleanName = name.trim();
    if (!cleanName) { notify("لطفاً نام نمایشی را وارد کن."); return; }
    const next = { name: cleanName, email: email.trim() };
    setAccount(next);
    localStorage.setItem("projectx-account", JSON.stringify(next));
    notify("تغییرات پروفایل روی همین دستگاه ذخیره شد.");
  }
  function submitAuth() {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { notify("یک ایمیل معتبر وارد کن."); return; }
    if (password.length < 8) { notify("رمز عبور باید حداقل ۸ کاراکتر باشد."); return; }
    if (auth === "signup") {
      if (!name.trim()) { notify("نام نمایشی را وارد کن."); return; }
      const next = { name: name.trim(), email: cleanEmail };
      localStorage.setItem("projectx-account", JSON.stringify(next));
      setAccount(next); setName(next.name); setEmail(next.email);
      setAuth(null); setPassword(""); notify("حساب نمایشی روی همین دستگاه ساخته شد.");
    } else {
      if (!account || account.email.toLowerCase() !== cleanEmail) { notify("حسابی با این ایمیل روی این دستگاه پیدا نشد؛ اول ثبت‌نام کن."); return; }
      setName(account.name); setAuth(null); setPassword(""); notify("وارد حساب محلی خودت شدی.");
    }
  }
  function logout() {
    localStorage.removeItem("projectx-account"); setAccount(null); setName(""); setEmail(""); setPassword(""); notify("از حساب محلی خارج شدی.");
  }
  async function shareRoom(room: Room) {
    const invite = `به دورهمی «${room.name}» در Project X بیا! کد اتاق: ${room.id}\n${window.location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: "دعوت به Project X", text: invite });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(invite); notify("متن دعوت کپی شد؛ برای دوستت بفرست."); }
      else notify(invite);
    } catch { notify("اشتراک‌گذاری لغو شد."); }
  }
  function startGame(game: Game) {
    const choices = prompts[game.title] || ["آماده‌ای؟ نوبت توست!"];
    setRound(choices[Math.floor(Math.random() * choices.length)]);
  }

  return (
    <main className="app-shell" dir="rtl">
      <aside className="side-rail">
        <button className="brand brand-button" onClick={() => setTab("home")}><span className="brand-mark">x</span><span>project<span className="brand-x">x</span></span></button>
        <div className="rail-label">فضای شما</div>
        <button className={tab === "home" ? "rail-link active" : "rail-link"} onClick={() => setTab("home")}><span>⌂</span> خانه</button>
        <button className={tab === "games" ? "rail-link active" : "rail-link"} onClick={() => setTab("games")}><span>▦</span> بازی‌ها</button>
        <button className={tab === "friends" ? "rail-link active" : "rail-link"} onClick={() => setTab("friends")}><span>♧</span> دوستان</button>
        <button className={tab === "profile" ? "rail-link active" : "rail-link"} onClick={() => setTab("profile")}><span>◉</span> پروفایل</button>
        <div className="rail-bottom"><div className="rail-avatar">{name ? name.slice(0,1) : "م"}</div><div><strong>{name || "مهمان"}</strong><small>{account ? "حساب محلی" : "حساب کاربری"}</small></div><button onClick={() => account ? logout() : setAuth("login")} aria-label={account ? "خروج" : "ورود"}>{account ? "↙" : "↗"}</button></div>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">x</span><b>project<span className="brand-x">x</span></b></div>
          <div className="breadcrumb">فضای شخصی <span>/</span> {tab === "home" ? "خانه" : tab === "games" ? "بازی‌ها" : tab === "friends" ? "دوستان" : "پروفایل"}</div>
          <div className="top-actions"><button className="icon-button" onClick={() => notify(rooms.length ? `تو ${rooms.length} اتاق ذخیره‌شده داری.` : "هنوز اتاقی نساختی.")}>♧</button>{account ? <button className="login-button" onClick={logout}>خروج</button> : <button className="login-button" onClick={() => setAuth("login")}>ورود</button>}<button className="signup-button" onClick={() => account ? setTab("profile") : setAuth("signup")}>{account ? "پروفایل من" : "ساخت حساب"} <span>←</span></button></div>
        </header>
        {tab === "home" && <div className="content">
          <section className="welcome-row"><div><div className="overline"><i /> فضای بازی شما</div><h1>سلام، {name || "رفیق"} <span className="wave">✳</span></h1><p>آماده‌ای یک خاطره تازه با دوستات بسازی؟</p></div><button className="outline-button" onClick={() => setTab("profile")}>تکمیل پروفایل <span>↗</span></button></section>
          <section className="hero-banner"><div className="banner-copy"><span className="banner-tag">با هم بهتره</span><h2>دورهمی بعدی،<br/>شروع یک خاطره‌ست.</h2><p>اتاقت رو بساز، دوستات رو دعوت کن و بازی رو شروع کن.</p><button className="light-button" onClick={() => document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"})}>ساخت دورهمی جدید <span>←</span></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-center">X</div><span className="art-chip chip-one">PLAY</span><span className="art-chip chip-two">TOGETHER</span><span className="art-star">✳</span></div></section>
          <div className="section-title"><div><span className="overline">منتخب برای تو</span><h2>بازی‌های محبوب</h2></div><button className="text-button" onClick={() => setTab("games")}>همه بازی‌ها <span>←</span></button></div>
          <div className="game-grid">{games.slice(0,3).map(g => <button className="game-card" key={g.title} onClick={() => {setSelected(g);setRound("");}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div>
          <section className="lower-grid" id="create-room"><div className="panel-card create-panel"><div className="section-title compact"><div><span className="overline">شروع کن</span><h2>اتاق جدید بساز</h2></div><span className="panel-icon">＋</span></div><p>یک اسم برای جمع‌تان انتخاب کن. بقیه‌اش با هم ساخته می‌شود.</p><div className="room-input-row"><input value={roomName} onChange={e=>setRoomName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createRoom();}} placeholder="مثلاً دورهمی جمعه‌شب" maxLength={36}/><button onClick={createRoom}>ساخت اتاق <span>←</span></button></div></div><div className="panel-card invite-panel"><span className="invite-icon">♧</span><div><span className="overline">تنها بازی نکن</span><h3>آدم‌های خودت رو بیار</h3><p>دعوت‌نامه را با دوستانت به اشتراک بگذار.</p><button className="text-button" onClick={()=>setTab("friends")}>رفتن به دوستان ←</button></div></div></section>
          {rooms.length > 0 && <section className="rooms-section"><div className="section-title"><div><span className="overline">اتاق‌های این دستگاه</span><h2>دورهمی‌های اخیر</h2></div></div><div className="room-list">{rooms.map(r=><div className="room-row" key={r.id}><div><strong>{r.name}</strong><small>کد {r.id} · {r.game}</small></div><button className="text-button" onClick={()=>setActiveRoom(r)}>باز کردن</button><button className="text-button" onClick={()=>shareRoom(r)}>دعوت ↗</button></div>)}</div></section>}
        </div>}
        {tab === "games" && <div className="content"><div className="page-heading"><span className="overline">کتابخانه سرگرمی</span><h1>بازی‌ای برای هر جمع</h1><p>یک بازی انتخاب کن تا نمونه قابل‌بازی آن را همین‌جا امتحان کنی.</p></div><div className="game-grid all-games">{games.map(g=><button className="game-card" key={g.title} onClick={()=>{setSelected(g);setRound("");}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div></div>}
        {tab === "friends" && <div className="content"><div className="page-heading"><span className="overline">دایره آدم‌های تو</span><h1>بازی با دوستات بهتره.</h1><p>فعلاً می‌توانی دعوت‌نامه اتاق‌ها را از همین دستگاه برای دوستانت بفرستی.</p></div><div className="empty-state"><div className="empty-symbol">♧</div><h2>دعوت دوستان</h2><p>اول یک اتاق بساز؛ بعد کد و لینک دعوتش را با پیام‌رسان دلخواهت به اشتراک بگذار.</p><button className="signup-button" onClick={()=>{setTab("home");document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"});}}>ساخت اولین اتاق <span>←</span></button></div>{rooms.length>0 && <div className="room-list friend-rooms">{rooms.map(r=><div className="room-row" key={r.id}><div><strong>{r.name}</strong><small>کد دعوت: {r.id}</small></div><button className="signup-button" onClick={()=>shareRoom(r)}>ارسال دعوت ↗</button></div>)}</div>}</div>}
        {tab === "profile" && <div className="content"><div className="page-heading"><span className="overline">هویت تو در Project X</span><h1>پروفایل کاربری</h1><p>اطلاعاتت را ذخیره کن تا دفعه بعد هم روی همین دستگاه بماند.</p></div><div className="profile-card"><div className="profile-avatar">{name ? name.slice(0,1) : "م"}</div><div className="profile-fields"><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نامی که دوستانت می‌بینند"/><label>ایمیل</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" type="email"/><button className="signup-button" onClick={saveProfile}>ذخیره تغییرات <span>←</span></button>{account && <button className="text-button" onClick={logout}>خروج از حساب محلی</button>}</div></div></div>}
        {notice && <div className="toast" role="status"><span>✦</span>{notice}<button onClick={()=>setNotice("")} aria-label="بستن">×</button></div>}
        {activeRoom && <div className="modal-backdrop" onClick={()=>setActiveRoom(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveRoom(null)}>×</button><div className="overline">اتاق دورهمی</div><h2>{activeRoom.name}</h2><p>کد دعوت: <b>{activeRoom.id}</b></p><p>بازی انتخاب‌شده: {activeRoom.game}</p><button className="signup-button" onClick={()=>shareRoom(activeRoom)}>اشتراک‌گذاری دعوت ↗</button></div></div>}
        {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className={"game-art modal-art "+selected.tone}><span>{selected.symbol}</span><small>PROJECT X / GAME</small></div><span className="overline">{selected.category}</span><h2>{selected.title}</h2>{round ? <div className="round-prompt"><p>{round}</p><button className="outline-button" onClick={()=>startGame(selected)}>سؤال بعدی ↻</button></div> : <p>یک تجربه گروهی برای ساختن لحظه‌های متفاوت. برای شروع، یک سؤال یا چالش بگیر.</p>}<div className="modal-actions"><button className="signup-button" onClick={()=>startGame(selected)}>شروع بازی ←</button><button className="outline-button" onClick={()=>{setRoomName(selected.title);setSelected(null);setTab("home");setTimeout(()=>document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"}),50);}}>ساخت اتاق این بازی</button></div></div></div>}
      </section>
      <nav className="mobile-nav"><button className={tab==="home"?"chosen":""} onClick={()=>setTab("home")}><span>⌂</span>خانه</button><button className={tab==="games"?"chosen":""} onClick={()=>setTab("games")}><span>▦</span>بازی‌ها</button><button className={tab==="friends"?"chosen":""} onClick={()=>setTab("friends")}><span>♧</span>دوستان</button><button className={tab==="profile"?"chosen":""} onClick={()=>setTab("profile")}><span>◉</span>پروفایل</button></nav>
      {auth && <div className="modal-backdrop" onClick={()=>{setAuth(null);setNotice("");}}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>{setAuth(null);setNotice("");}}>×</button><div className="brand auth-brand"><span className="brand-mark">x</span><span>project<span className="brand-x">x</span></span></div><span className="overline">{auth==="signup"?"به جمع ما اضافه شو":"خوش برگشتی"}</span><h2>{auth==="signup"?"ساخت حساب کاربری":"ورود به حساب"}</h2><p>این نسخه اطلاعات حساب را فقط روی همین دستگاه نگه می‌دارد.</p>{auth==="signup" && <><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما"/></>}<label>ایمیل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/><label>رمز عبور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitAuth();}} placeholder="حداقل ۸ کاراکتر"/><button className="signup-button auth-submit" onClick={submitAuth}>{auth==="signup"?"ساخت حساب":"ورود"} <span>←</span></button><button className="switch-auth" onClick={()=>{setAuth(auth==="signup"?"login":"signup");setNotice("");}}>{auth==="signup"?"حساب داری؟ وارد شو":"حساب نداری؟ ثبت‌نام کن"}</button><small className="demo-note">حساب محلی آزمایشی · ورود واقعی و همگام‌سازی آنلاین هنوز متصل نیست</small></div></div>}
    </main>
  );
}
