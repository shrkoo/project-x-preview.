"use client";

import { useEffect, useState } from "react";
import { apiRequest, clearSession, setSession } from "./lib/api";

type Tab = "home" | "games" | "friends" | "profile" | "leaderboard" | "rewards" | "premium" | "settings";
type Game = { title: string; category: string; players: string; time: string; tone: string; symbol: string };
type Room = { id: string; code?: string; name: string; game: string; createdAt?: string };
type LocalAccount = { id?: string; name: string; email: string; xp?: number; gamesPlayed?: number };
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
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<"neon" | "light">("neon");
  const [xp, setXp] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [leaderboardRows, setLeaderboardRows] = useState<Array<{name:string;xp:number;gamesPlayed:number}>>([]);

  useEffect(() => {
    setNotificationsOn(readStore<boolean>("projectx-notifications", true));
    setSoundOn(readStore<boolean>("projectx-sound", true));
    setSelectedTheme(readStore<"neon" | "light">("projectx-theme", "neon"));
    if (!localStorage.getItem("projectx-token")) return;
    apiRequest<{user:{id:string;email:string;displayName:string;xp:number;gamesPlayed:number}}>("/auth/me").then(async data => {
      const next={id:data.user.id,name:data.user.displayName,email:data.user.email,xp:data.user.xp,gamesPlayed:data.user.gamesPlayed};
      setAccount(next);setName(next.name);setEmail(next.email);setXp(next.xp);setGamesPlayed(next.gamesPlayed);
      const result=await apiRequest<{rooms:Array<any>}>("/rooms");
      setRooms(result.rooms.map(r=>({id:r.id,code:r.code,name:r.name,game:r.gameTitle||"",createdAt:r.createdAt})));
    }).catch(()=>{clearSession();setNotice("نشست قبلی معتبر نبود؛ دوباره وارد شو.");});
  }, []);
  useEffect(() => {
    if (tab==="leaderboard" && account) apiRequest<{leaderboard:Array<{name:string;xp:number;gamesPlayed:number}>}>("/leaderboard").then(d=>setLeaderboardRows(d.leaderboard)).catch(()=>setNotice("دریافت جدول امتیازها ناموفق بود."));
  }, [tab,account]);

  function notify(message: string) { setNotice(message); }
  async function createRoom() {
    const cleanName=roomName.trim();
    if(!cleanName){notify("برای اتاقت یک اسم انتخاب کن.");return;}
    if(!account){setAuth("login");notify("برای ساخت اتاق ابتدا وارد حساب شو.");return;}
    try{
      const data=await apiRequest<{room:any}>("/rooms",{method:"POST",body:JSON.stringify({name:cleanName,gameTitle:selected?.title||""})});
      const room:Room={id:data.room.id,code:data.room.code,name:data.room.name,game:data.room.gameTitle||"",createdAt:new Date().toISOString()};
      setRooms(current=>[room,...current].slice(0,20));setActiveRoom(room);setRoomName("");setSelected(null);
      notify("اتاق روی سرور ساخته شد؛ کد دعوت آماده است.");
    }catch(error){notify(error instanceof Error?error.message:"ساخت اتاق ناموفق بود.");}
  }
  async function saveProfile() {
    const cleanName=name.trim();if(!cleanName){notify("لطفاً نام نمایشی را وارد کن.");return;}
    try{await apiRequest("/auth/profile",{method:"PATCH",body:JSON.stringify({name:cleanName})});setAccount(current=>current?{...current,name:cleanName}:current);notify("پروفایل در حساب آنلاین به‌روزرسانی شد.");}
    catch(error){notify(error instanceof Error?error.message:"ذخیره پروفایل ناموفق بود.");}
  }
  async function submitAuth() {
    const cleanEmail=email.trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(cleanEmail)){notify("یک ایمیل معتبر وارد کن.");return;}
    if(password.length<10){notify("رمز عبور باید حداقل ۱۰ کاراکتر باشد.");return;}
    if(auth==="signup"&&!name.trim()){notify("نام نمایشی را وارد کن.");return;}
    try{
      const endpoint=auth==="signup"?"/auth/register":"/auth/login";
      const data=await apiRequest<{token:string;user:{id:string;email:string;displayName:string;xp:number;gamesPlayed:number};emailVerificationRequired?:boolean}>(endpoint,{method:"POST",body:JSON.stringify({email:cleanEmail,password,...(auth==="signup"?{name:name.trim()}:{})})});
      setSession(data.token);
      const next={id:data.user.id,name:data.user.displayName,email:data.user.email,xp:data.user.xp,gamesPlayed:data.user.gamesPlayed};
      setAccount(next);setName(next.name);setEmail(next.email);setXp(next.xp||0);setGamesPlayed(next.gamesPlayed||0);setAuth(null);setPassword("");
      const roomsData=await apiRequest<{rooms:Array<any>}>("/rooms");setRooms(roomsData.rooms.map(r=>({id:r.id,code:r.code,name:r.name,game:r.gameTitle||"",createdAt:r.createdAt})));
      notify(data.emailVerificationRequired?"حساب آنلاین ساخته شد؛ تأیید ایمیل هنوز فعال نشده است.":auth==="signup"?"حساب آنلاین ساخته شد.":"با موفقیت وارد شدی.");
    }catch(error){notify(error instanceof Error?error.message:"ورود یا ثبت‌نام ناموفق بود.");}
  }
  async function logout() {
    try{await apiRequest("/auth/logout",{method:"POST"});}catch{}
    clearSession();setAccount(null);setName("");setEmail("");setPassword("");setRooms([]);notify("از حساب خارج شدی.");
  }
  async function shareRoom(room: Room) {
    const invite = `به دورهمی «${room.name}» در Project X بیا! کد اتاق: ${room.code || room.id}\n${window.location.origin}`;
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
  async function finishRound() {
    if(!account){notify("برای ثبت امتیاز آنلاین وارد حساب شو.");setAuth("login");return;}
    try{const data=await apiRequest<{xp:number;gamesPlayed:number;awarded:number}>("/rounds/finish",{method:"POST",body:JSON.stringify({gameTitle:selected?.title||"",prompt:round})});setXp(data.xp);setGamesPlayed(data.gamesPlayed);setAccount(current=>current?{...current,xp:data.xp,gamesPlayed:data.gamesPlayed}:current);notify(`+${data.awarded} امتیاز در حساب آنلاین ثبت شد.`);if(selected)startGame(selected);}
    catch(error){notify(error instanceof Error?error.message:"ثبت امتیاز ناموفق بود.");}
  }
  function saveSetting<T,>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }

  return (
    <main className={selectedTheme === "light" ? "app-shell theme-light" : "app-shell"} dir="rtl">
      <aside className="side-rail">
        <button className="brand brand-button" onClick={() => setTab("home")}><span className="brand-mark">X</span><span>project<span className="brand-x">x</span></span></button>
        <div className="rail-label">فضای شما</div>
        <button className={tab === "home" ? "rail-link active" : "rail-link"} onClick={() => setTab("home")}><span>⌂</span> خانه</button>
        <button className={tab === "games" ? "rail-link active" : "rail-link"} onClick={() => setTab("games")}><span>▦</span> بازی‌ها</button>
        <button className={tab === "friends" ? "rail-link active" : "rail-link"} onClick={() => setTab("friends")}><span>♧</span> دوستان</button>
        <button className={tab === "profile" ? "rail-link active" : "rail-link"} onClick={() => setTab("profile")}><span>◉</span> پروفایل</button>
        <div className="rail-label">رقابت و امکانات</div>
        <button className={tab === "leaderboard" ? "rail-link active" : "rail-link"} onClick={() => setTab("leaderboard")}><span>🏆</span> جدول مسابقات</button>
        <button className={tab === "rewards" ? "rail-link active" : "rail-link"} onClick={() => setTab("rewards")}><span>🎁</span> پاداش‌ها</button>
        <button className={tab === "premium" ? "rail-link active" : "rail-link"} onClick={() => setTab("premium")}><span>👑</span> اشتراک ویژه</button>
        <button className={tab === "settings" ? "rail-link active" : "rail-link"} onClick={() => setTab("settings")}><span>⚙</span> تنظیمات</button>
        <div className="rail-bottom"><div className="rail-avatar">{name ? name.slice(0,1) : "م"}</div><div><strong>{name || "مهمان"}</strong><small>{account ? "حساب آنلاین" : "مهمان"}</small></div><button onClick={() => account ? logout() : setAuth("login")} aria-label={account ? "خروج" : "ورود"}>{account ? "↙" : "↗"}</button></div>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">X</span><b>project<span className="brand-x">x</span></b></div>
          <div className="breadcrumb">فضای شخصی <span>/</span> {({home:"خانه",games:"بازی‌ها",friends:"دوستان",profile:"پروفایل",leaderboard:"جدول مسابقات",rewards:"پاداش‌ها",premium:"اشتراک ویژه",settings:"تنظیمات"} as Record<Tab,string>)[tab]}</div>
          <div className="top-actions"><button className="icon-button" onClick={() => notify(rooms.length ? `تو ${rooms.length} اتاق ذخیره‌شده داری.` : "هنوز اتاقی نساختی.")}>♧</button>{account ? <button className="login-button" onClick={logout}>خروج</button> : <button className="login-button" onClick={() => setAuth("login")}>ورود</button>}<button className="signup-button" onClick={() => account ? setTab("profile") : setAuth("signup")}>{account ? "پروفایل من" : "ساخت حساب"} <span>←</span></button></div>
        </header>
        {tab === "home" && <div className="content">
          <section className="welcome-row"><div><div className="overline"><i /> فضای بازی شما</div><h1>سلام، {name || "رفیق"} <span className="wave">✳</span></h1><p>آماده‌ای یک خاطره تازه با دوستات بسازی؟</p></div><button className="outline-button" onClick={() => setTab("profile")}>تکمیل پروفایل <span>↗</span></button></section>
          <section className="hero-banner"><div className="banner-copy"><span className="banner-tag">با هم بهتره</span><h2>بیشتر از یک بازی،<br/>دنیای دورهمی شما.</h2><p>اتاقت رو بساز، دوستات رو دعوت کن و لحظه‌های تازه‌ای با هم بسازید.</p><div className="banner-actions"><button className="light-button" onClick={() => document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"})}>ساخت دورهمی جدید <span>←</span></button><button className="banner-ghost" onClick={() => setTab("games")}>دیدن بازی‌ها</button></div></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-center">X</div><span className="art-chip chip-one">PLAY</span><span className="art-chip chip-two">TOGETHER</span><span className="art-star">✳</span></div></section>
          <section className="feature-strip" aria-label="ویژگی‌های Project X"><div className="feature-pill"><span className="feature-icon">✦</span><div><strong>شروع ساده</strong><small>اتاق دورهمی خودت را بساز</small></div></div><div className="feature-pill"><span className="feature-icon">♧</span><div><strong>با آدم‌های خودت</strong><small>دعوت‌نامه را به اشتراک بگذار</small></div></div><div className="feature-pill"><span className="feature-icon">⚡</span><div><strong>بازی برای هر جمع</strong><small>از چالش تا مسابقه دوستانه</small></div></div></section>
          <div className="section-title"><div><span className="overline">منتخب برای تو</span><h2>بازی‌های محبوب</h2></div><button className="text-button" onClick={() => setTab("games")}>همه بازی‌ها <span>←</span></button></div>
          <div className="game-grid">{games.map(g => <button className="game-card" key={g.title} onClick={() => {setSelected(g);setRound("");}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div>
          <section className="lower-grid" id="create-room"><div className="panel-card create-panel"><div className="section-title compact"><div><span className="overline">شروع کن</span><h2>اتاق جدید بساز</h2></div><span className="panel-icon">＋</span></div><p>یک اسم برای جمع‌تان انتخاب کن. بقیه‌اش با هم ساخته می‌شود.</p><div className="room-input-row"><input value={roomName} onChange={e=>setRoomName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createRoom();}} placeholder="مثلاً دورهمی جمعه‌شب" maxLength={36}/><button onClick={createRoom}>ساخت اتاق <span>←</span></button></div></div><div className="panel-card invite-panel"><span className="invite-icon">♧</span><div><span className="overline">تنها بازی نکن</span><h3>آدم‌های خودت رو بیار</h3><p>دعوت‌نامه را با دوستانت به اشتراک بگذار.</p><button className="text-button" onClick={()=>setTab("friends")}>رفتن به دوستان ←</button></div></div></section>
          {rooms.length > 0 && <section className="rooms-section"><div className="section-title"><div><span className="overline">اتاق‌های این دستگاه</span><h2>دورهمی‌های اخیر</h2></div></div><div className="room-list">{rooms.map(r=><div className="room-row" key={r.id}><div><strong>{r.name}</strong><small>کد {r.code || r.id} · {r.game}</small></div><button className="text-button" onClick={()=>setActiveRoom(r)}>باز کردن</button><button className="text-button" onClick={()=>shareRoom(r)}>دعوت ↗</button></div>)}</div></section>}
        </div>}
        {tab === "games" && <div className="content"><div className="page-heading"><span className="overline">کتابخانه سرگرمی</span><h1>بازی‌ای برای هر جمع</h1><p>یک بازی انتخاب کن تا نمونه قابل‌بازی آن را همین‌جا امتحان کنی.</p></div><div className="game-grid all-games">{games.map(g=><button className="game-card" key={g.title} onClick={()=>{setSelected(g);setRound("");}}><div className={"game-art "+g.tone}><span>{g.symbol}</span><small>PROJECT X / GAME</small></div><div className="game-info"><div><strong>{g.title}</strong><small>{g.category}</small></div><span className="card-arrow">↗</span></div><div className="game-meta"><span>♧ {g.players}</span><span>◷ {g.time}</span></div></button>)}</div></div>}
        {tab === "friends" && <div className="content"><div className="page-heading"><span className="overline">دایره آدم‌های تو</span><h1>بازی با دوستات بهتره.</h1><p>فعلاً می‌توانی دعوت‌نامه اتاق‌ها را از همین دستگاه برای دوستانت بفرستی.</p></div><div className="empty-state"><div className="empty-symbol">♧</div><h2>دعوت دوستان</h2><p>اول یک اتاق بساز؛ بعد کد و لینک دعوتش را با پیام‌رسان دلخواهت به اشتراک بگذار.</p><button className="signup-button" onClick={()=>{setTab("home");document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"});}}>ساخت اولین اتاق <span>←</span></button></div>{rooms.length>0 && <div className="room-list friend-rooms">{rooms.map(r=><div className="room-row" key={r.id}><div><strong>{r.name}</strong><small>کد دعوت: {r.id}</small></div><button className="signup-button" onClick={()=>shareRoom(r)}>ارسال دعوت ↗</button></div>)}</div>}</div>}
        {tab === "leaderboard" && <div className="content"><div className="page-heading"><span className="overline">رقابت دوستانه</span><h1>امتیازهای تو</h1><p>پیشرفت بازی‌های این دستگاه؛ رتبه‌بندی جهانی بعد از راه‌اندازی سرور فعال می‌شود.</p></div><div className="panel-card"><div className="section-title compact"><div><span className="overline">فصل آزمایشی</span><h2>برترین بازیکنان</h2></div><span className="panel-icon">🏆</span></div><div className="leader-row"><b>۱</b><span className="leader-avatar">{(name || "م").slice(0,1)}</span><strong>{name || "بازیکن مهمان"}</strong><small>امتیاز محلی</small><em>{xp.toLocaleString("fa-IR")} XP</em></div><div className="leader-row"><b>—</b><span className="leader-avatar">X</span><strong>بازی‌های انجام‌شده</strong><small>روی همین دستگاه</small><em>{gamesPlayed.toLocaleString("fa-IR")}</em></div><p className="demo-note">این اطلاعات فقط برای همین مرورگر است و هنوز رتبه‌بندی بین کاربران وجود ندارد.</p></div></div>}
        {tab === "rewards" && <div className="content"><div className="page-heading"><span className="overline">دستاوردهای تو</span><h1>پاداش و نشان‌ها</h1><p>با شرکت در بازی‌ها و دعوت دوستان، نشان‌های تازه بگیر.</p></div><div className="reward-grid"><div className="reward-card"><span>👑</span><strong>شروع قدرتمند</strong><small>اولین دورهمی خودت را بساز</small><em>{rooms.length ? "دریافت شد" : "هنوز باز نشده"}</em></div><div className="reward-card"><span>⭐</span><strong>ستاره جمع</strong><small>۵ بازی · {gamesPlayed.toLocaleString("fa-IR")}/۵</small><em>{gamesPlayed >= 5 ? "دریافت شد" : "در حال پیشرفت"}</em></div><div className="reward-card"><span>🚀</span><strong>دعوت‌کننده</strong><small>۳ دوست را دعوت کن</small><em>نیازمند قابلیت آنلاین</em></div><div className="reward-card"><span>💎</span><strong>قهرمان رقابت</strong><small>۱۰۰ XP · {xp.toLocaleString("fa-IR")}/۱۰۰</small><em>{xp >= 100 ? "دریافت شد" : "در حال پیشرفت"}</em></div></div></div>}
        {tab === "premium" && <div className="content"><div className="page-heading"><span className="overline">Project X Plus</span><h1>تجربه ویژه برای دورهمی‌های خاص</h1><p>طرح‌های اشتراک پیشنهادی؛ پرداخت هنوز به درگاه متصل نیست.</p></div><div className="premium-grid"><div className="premium-card"><span>ماهانه</span><h2>۹۹٬۰۰۰ <small>تومان</small></h2><p>امکانات بیشتر برای جمع‌های همیشگی</p><ul><li>نشان ویژه پروفایل</li><li>شخصی‌سازی اتاق‌ها</li><li>دسترسی به نشان‌های ویژه</li></ul><button className="signup-button" onClick={()=>notify("پرداخت اشتراک هنوز به درگاه متصل نشده است.")}>به‌زودی فعال می‌شود</button></div><div className="premium-card featured-premium"><span>پیشنهاد ویژه</span><h2>۷۹۹٬۰۰۰ <small>تومان</small></h2><p>طرح سالانه Project X Plus</p><ul><li>تمام امکانات طرح ماهانه</li><li>نشان سالانه اختصاصی</li><li>اولویت در امکانات آینده</li></ul><button className="signup-button" onClick={()=>notify("پرداخت اشتراک هنوز به درگاه متصل نشده است.")}>به‌زودی فعال می‌شود</button></div></div></div>}
        {tab === "settings" && <div className="content"><div className="page-heading"><span className="overline">کنترل تجربه تو</span><h1>تنظیمات</h1><p>ظاهر و اعلان‌های برنامه را مدیریت کن.</p></div><div className="panel-card settings-card"><div className="setting-row"><div><strong>اعلان‌ها</strong><small>نمایش اعلان‌های داخل برنامه</small></div><button className={notificationsOn?"toggle-switch on":"toggle-switch"} onClick={()=>{const v=!notificationsOn;setNotificationsOn(v);saveSetting("projectx-notifications",v);}}>{notificationsOn?"روشن":"خاموش"}</button></div><div className="setting-row"><div><strong>صدای بازی</strong><small>صدای رویدادهای بازی</small></div><button className={soundOn?"toggle-switch on":"toggle-switch"} onClick={()=>{const v=!soundOn;setSoundOn(v);saveSetting("projectx-sound",v);}}>{soundOn?"روشن":"خاموش"}</button></div><div className="setting-row"><div><strong>قالب ظاهری</strong><small>انتخاب ظاهر برنامه</small></div><div className="theme-choices"><button className={selectedTheme==="neon"?"theme-choice active":"theme-choice"} onClick={()=>{setSelectedTheme("neon");saveSetting("projectx-theme","neon");}}>تیره</button><button className={selectedTheme==="light"?"theme-choice active":"theme-choice"} onClick={()=>{setSelectedTheme("light");saveSetting("projectx-theme","light");}}>روشن</button></div></div><div className="setting-row"><div><strong>حساب کاربری</strong><small>مدیریت ورود و اطلاعات پروفایل</small></div><button className="outline-button" onClick={()=>setAuth(account?"login":"signup")}>{account?"مدیریت حساب":"ثبت‌نام / ورود"}</button></div></div></div>}
        {tab === "profile" && <div className="content"><div className="page-heading"><span className="overline">هویت تو در Project X</span><h1>پروفایل کاربری</h1><p>اطلاعاتت را ذخیره کن تا دفعه بعد هم روی همین دستگاه بماند.</p></div><div className="profile-card"><div className="profile-avatar">{name ? name.slice(0,1) : "م"}</div><div className="profile-fields"><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نامی که دوستانت می‌بینند"/><label>ایمیل</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" type="email"/><button className="signup-button" onClick={saveProfile}>ذخیره تغییرات <span>←</span></button>{account && <button className="text-button" onClick={logout}>خروج از حساب محلی</button>}</div></div></div>}
        {notice && <div className="toast" role="status"><span>✦</span>{notice}<button onClick={()=>setNotice("")} aria-label="بستن">×</button></div>}
        {activeRoom && <div className="modal-backdrop" onClick={()=>setActiveRoom(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveRoom(null)}>×</button><div className="overline">اتاق دورهمی</div><h2>{activeRoom.name}</h2><p>کد دعوت: <b>{activeRoom.code || activeRoom.id}</b></p><p>بازی انتخاب‌شده: {activeRoom.game}</p><button className="signup-button" onClick={()=>shareRoom(activeRoom)}>اشتراک‌گذاری دعوت ↗</button></div></div>}
        {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className={"game-art modal-art "+selected.tone}><span>{selected.symbol}</span><small>PROJECT X / GAME</small></div><span className="overline">{selected.category}</span><h2>{selected.title}</h2>{round ? <div className="round-prompt"><p>{round}</p><div className="modal-actions"><button className="outline-button" onClick={()=>startGame(selected)}>سؤال بعدی ↻</button><button className="signup-button" onClick={finishRound}>ثبت پایان دور +۱۰ XP</button></div></div> : <p>یک تجربه گروهی برای ساختن لحظه‌های متفاوت. برای شروع، یک سؤال یا چالش بگیر.</p>}<div className="modal-actions"><button className="signup-button" onClick={()=>startGame(selected)}>شروع بازی ←</button><button className="outline-button" onClick={()=>{setRoomName(selected.title);setSelected(null);setTab("home");setTimeout(()=>document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"}),50);}}>ساخت اتاق این بازی</button></div></div></div>}
      </section>
      <nav className="mobile-nav"><button className={tab==="home"?"chosen":""} onClick={()=>setTab("home")}><span>⌂</span>خانه</button><button className={tab==="games"?"chosen":""} onClick={()=>setTab("games")}><span>▦</span>بازی‌ها</button><button className={tab==="friends"?"chosen":""} onClick={()=>setTab("friends")}><span>♧</span>دوستان</button><button className={tab==="profile"?"chosen":""} onClick={()=>setTab("profile")}><span>◉</span>پروفایل</button><button className={tab==="settings"?"chosen":""} onClick={()=>setTab("settings")}><span>⚙</span>تنظیمات</button></nav>
      {auth && <div className="modal-backdrop" onClick={()=>{setAuth(null);setNotice("");}}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>{setAuth(null);setNotice("");}}>×</button><div className="brand auth-brand"><span className="brand-mark">X</span><span>project<span className="brand-x">x</span></span></div><span className="overline">{auth==="signup"?"به جمع ما اضافه شو":"خوش برگشتی"}</span><h2>{auth==="signup"?"ساخت حساب کاربری":"ورود به حساب"}</h2><p>حساب کاربری به سرور Project X متصل است.</p>{auth==="signup" && <><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما"/></>}<label>ایمیل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/><label>رمز عبور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitAuth();}} placeholder="حداقل ۱۰ کاراکتر"/><div className="social-auth"><button onClick={()=>notify("ورود با Google هنوز به سرویس OAuth متصل نشده است.")}>G <span>ادامه با Google</span></button><button onClick={()=>notify("ورود با Apple هنوز به سرویس Apple Sign in متصل نشده است.")}>● <span>ادامه با Apple</span></button></div><button className="signup-button auth-submit" onClick={submitAuth}>{auth==="signup"?"ساخت حساب":"ورود"} <span>←</span></button><button className="switch-auth" onClick={()=>{setAuth(auth==="signup"?"login":"signup");setNotice("");}}>{auth==="signup"?"حساب داری؟ وارد شو":"حساب نداری؟ ثبت‌نام کن"}</button><small className="demo-note">ورود ایمیل و رمز عبور آنلاین فعال است؛ تأیید ایمیل و ورود Google/Apple هنوز تنظیم نشده‌اند.</small></div></div>}
    </main>
  );
}
