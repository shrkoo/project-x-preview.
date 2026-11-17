"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest, clearSession, setSession } from "./lib/api";

type Tab = "home" | "games" | "friends" | "profile" | "leaderboard" | "rewards" | "premium" | "settings" | "admin";
type Game = { title: string; category: string; players: string; time: string; tone: string; symbol: string };
type Room = { id: string; code?: string; name: string; game: string; createdAt?: string };
type LocalAccount = { id?: string; name: string; email: string; xp?: number; gamesPlayed?: number; role?: string };
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
  const [recoveryToken,setRecoveryToken]=useState("");
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
  const [friendEmail, setFriendEmail] = useState("");
  const [friends, setFriends] = useState<Array<{id:string;status:string;name:string;email:string;requesterId?:string;addresseeId?:string}>>([]);
  const [adminStats,setAdminStats]=useState<{users:number;activeRooms:number;activeSubscriptions:number;messages:number}|null>(null);
  const [notifications,setNotifications]=useState<Array<{id:string;title:string;body:string;readAt:string|null;createdAt:string}>>([]);
  const [roomMessages, setRoomMessages] = useState<Array<{id:string;body:string;sender:string;createdAt:string}>>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const roomSocket=useRef<WebSocket|null>(null);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    const verifyToken=params.get("verify"), resetToken=params.get("reset");
    if(verifyToken){apiRequest("/auth/verify-email",{method:"POST",body:JSON.stringify({token:verifyToken})}).then(()=>notify("ایمیل با موفقیت تأیید شد.")).catch(error=>notify(error instanceof Error?error.message:"تأیید ایمیل ناموفق بود."));params.delete("verify");window.history.replaceState({}, "", window.location.pathname+(params.toString()?"?"+params.toString():""));}
    if(resetToken){setRecoveryToken(resetToken);setAuth("login");params.delete("reset");window.history.replaceState({}, "", window.location.pathname+(params.toString()?"?"+params.toString():""));}
    setNotificationsOn(readStore<boolean>("projectx-notifications", true));
    setSoundOn(readStore<boolean>("projectx-sound", true));
    setSelectedTheme(readStore<"neon" | "light">("projectx-theme", "neon"));
    if (!localStorage.getItem("projectx-token")) return;
    apiRequest<{user:{id:string;email:string;displayName:string;xp:number;gamesPlayed:number;role?:string}}>("/auth/me").then(async data => {
      const next={id:data.user.id,name:data.user.displayName,email:data.user.email,xp:data.user.xp,gamesPlayed:data.user.gamesPlayed,role:data.user.role};
      setAccount(next);setName(next.name);setEmail(next.email);setXp(next.xp);setGamesPlayed(next.gamesPlayed);
      const result=await apiRequest<{rooms:Array<any>}>("/rooms");
      setRooms(result.rooms.map(r=>({id:r.id,code:r.code,name:r.name,game:r.gameTitle||"",createdAt:r.createdAt})));
    }).catch(()=>{clearSession();setNotice("نشست قبلی معتبر نبود؛ دوباره وارد شو.");});
  }, []);
  useEffect(() => {
    if (tab==="leaderboard" && account) apiRequest<{leaderboard:Array<{name:string;xp:number;gamesPlayed:number}>}>("/leaderboard").then(d=>setLeaderboardRows(d.leaderboard)).catch(()=>setNotice("دریافت جدول امتیازها ناموفق بود."));
    if (account && (tab==="settings" || tab==="home")) apiRequest<{notifications:Array<any>}>("/notifications").then(d=>setNotifications(d.notifications)).catch(()=>{});
    if (tab==="admin" && account?.role==="admin") apiRequest<any>("/admin/overview").then(setAdminStats).catch(()=>setNotice("دسترسی پنل مدیریت محدود است."));
    if (tab==="friends" && account) apiRequest<{friends:Array<{id:string;status:string;name:string;email:string;requesterId?:string;addresseeId?:string}>}>("/friends").then(d=>setFriends(d.friends)).catch(()=>setNotice("دریافت دوستان ناموفق بود."));
  }, [tab,account]);

  useEffect(() => {
    if(!activeRoom?.code || !account){setRoomMessages([]);return;}
    let alive=true, socket:WebSocket|null=null, poll:number|undefined;
    const load=()=>apiRequest<{messages:Array<{id:string;body:string;sender:string;createdAt:string}>}>(`/rooms/${activeRoom.code}/messages`).then(d=>{if(alive)setRoomMessages(d.messages);}).catch(()=>{});
    apiRequest<{ticket:string}>("/auth/ws-ticket",{method:"POST"}).then(({ticket})=>{
      if(!alive)return;
      socket=new WebSocket(`wss://project-x-api.shahramalidazeh6203.workers.dev/rooms/${activeRoom.code}/live?ticket=${encodeURIComponent(ticket)}`);roomSocket.current=socket;
      socket.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==="message")setRoomMessages(current=>current.some(m=>m.id===data.message.id)?current:[...current,data.message]);}catch{}};
      socket.onerror=()=>{if(alive&&!poll){load();poll=window.setInterval(load,5000);}};
      socket.onclose=()=>{if(alive&&!poll){load();poll=window.setInterval(load,5000);}};
    }).catch(()=>{load();poll=window.setInterval(load,5000);});
    return ()=>{alive=false;if(poll)window.clearInterval(poll);roomSocket.current=null;socket?.close();};
  }, [activeRoom?.code,account]);

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
      const data=await apiRequest<{token:string;user:{id:string;email:string;displayName:string;xp:number;gamesPlayed:number;role?:string};emailVerificationRequired?:boolean}>(endpoint,{method:"POST",body:JSON.stringify({email:cleanEmail,password,...(auth==="signup"?{name:name.trim()}:{})})});
      setSession(data.token);
      const next={id:data.user.id,name:data.user.displayName,email:data.user.email,xp:data.user.xp,gamesPlayed:data.user.gamesPlayed,role:data.user.role};
      setAccount(next);setName(next.name);setEmail(next.email);setXp(next.xp||0);setGamesPlayed(next.gamesPlayed||0);setAuth(null);setPassword("");
      const roomsData=await apiRequest<{rooms:Array<any>}>("/rooms");setRooms(roomsData.rooms.map(r=>({id:r.id,code:r.code,name:r.name,game:r.gameTitle||"",createdAt:r.createdAt})));
      notify(auth==="signup"?(data.verificationSent?"حساب ساخته شد؛ لینک تأیید ایمیل را بررسی کن.":"حساب ساخته شد؛ ارسال ایمیل هنوز به سرویس ایمیل نیاز دارد."):"با موفقیت وارد شدی.");
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
  async function sendRoomMessage() {
    const body=messageDraft.trim(); if(!body||!activeRoom?.code)return;
    if(roomSocket.current?.readyState===WebSocket.OPEN){roomSocket.current.send(JSON.stringify({body}));setMessageDraft("");return;}
    try{const data=await apiRequest<{message:{id:string;body:string;sender:string;createdAt:string}}>(`/rooms/${activeRoom.code}/messages`,{method:"POST",body:JSON.stringify({body})});setRoomMessages(current=>[...current,data.message]);setMessageDraft("");}
    catch(error){notify(error instanceof Error?error.message:"ارسال پیام ناموفق بود.");}
  }
  async function joinRoomByCode() {
    const code=joinCode.trim().toUpperCase(); if(!code){notify("کد اتاق را وارد کن.");return;}
    try{const data=await apiRequest<{room:any}>(`/rooms/${code}/join`,{method:"POST"});const room:Room={id:data.room.id,code:data.room.code,name:data.room.name,game:data.room.gameTitle||""};setRooms(current=>[room,...current.filter(r=>r.code!==room.code)]);setActiveRoom(room);setJoinCode("");notify("به اتاق پیوستی.");}
    catch(error){notify(error instanceof Error?error.message:"پیوستن به اتاق ناموفق بود.");}
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
        {account?.role==="admin" && <button className={tab==="admin"?"rail-link active":"rail-link"} onClick={()=>setTab("admin")}><span>⌘</span> مدیریت</button>}
        <div className="rail-bottom"><div className="rail-avatar">{name ? name.slice(0,1) : "م"}</div><div><strong>{name || "مهمان"}</strong><small>{account ? "حساب آنلاین" : "مهمان"}</small></div><button onClick={() => account ? logout() : setAuth("login")} aria-label={account ? "خروج" : "ورود"}>{account ? "↙" : "↗"}</button></div>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">X</span><b>project<span className="brand-x">x</span></b></div>
          <div className="breadcrumb">فضای شخصی <span>/</span> {({home:"خانه",games:"بازی‌ها",friends:"دوستان",profile:"پروفایل",leaderboard:"جدول مسابقات",rewards:"پاداش‌ها",premium:"اشتراک ویژه",settings:"تنظیمات",admin:"مدیریت"} as Record<Tab,string>)[tab]}</div>
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
        {tab === "friends" && <div className="content"><div className="page-heading"><span className="overline">دایره آدم‌های تو</span><h1>بازی با دوستات بهتره.</h1><p>با ایمیل دوستت درخواست دوستی بفرست یا با کد وارد اتاق یک دوست شو.</p></div><div className="panel-card"><div className="section-title compact"><div><span className="overline">اتصال دوستان</span><h2>افزودن دوست</h2></div><span className="panel-icon">♧</span></div><div className="room-input-row"><input type="email" value={friendEmail} onChange={e=>setFriendEmail(e.target.value)} placeholder="ایمیل دوستت"/><button onClick={async()=>{try{await apiRequest("/friends/request",{method:"POST",body:JSON.stringify({email:friendEmail})});setFriendEmail("");notify("درخواست دوستی ارسال شد.");}catch(error){notify(error instanceof Error?error.message:"ارسال درخواست ناموفق بود.");}}}>ارسال درخواست ←</button></div></div><div className="panel-card"><div className="section-title compact"><div><span className="overline">پیوستن به دورهمی</span><h2>کد اتاق دوستت را وارد کن</h2></div><span className="panel-icon">↗</span></div><div className="room-input-row"><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="مثلاً AB12CD3" maxLength={7}/><button onClick={joinRoomByCode}>پیوستن به اتاق ←</button></div></div><div className="section-title"><div><span className="overline">حساب آنلاین</span><h2>دوستان و درخواست‌ها</h2></div></div>{friends.length ? <div className="room-list">{friends.map(f=><div className="room-row" key={f.id}><div><strong>{f.name}</strong><small>{f.email} · {f.status==="pending"?"در انتظار پاسخ":f.status==="accepted"?"دوست":"درخواست"}</small></div>{f.status==="pending" && f.addresseeId===account?.id && <div className="row-actions"><button onClick={async()=>{try{await apiRequest(`/friends/${f.id}/respond`,{method:"POST",body:JSON.stringify({status:"accepted"})});setFriends(current=>current.map(x=>x.id===f.id?{...x,status:"accepted"}:x));notify("درخواست دوستی پذیرفته شد.");}catch(error){notify(error instanceof Error?error.message:"پذیرش ناموفق بود.");}}}>پذیرش</button><button className="subtle-action" onClick={async()=>{try{await apiRequest(`/friends/${f.id}/respond`,{method:"POST",body:JSON.stringify({status:"rejected"})});setFriends(current=>current.filter(x=>x.id!==f.id));}catch(error){notify(error instanceof Error?error.message:"رد درخواست ناموفق بود.");}}}>رد</button></div>}</div>)}</div> : <div className="empty-state"><div className="empty-symbol">♧</div><h2>هنوز دوستی اضافه نکردی</h2><p>ایمیل یکی از دوستانت را وارد کن تا درخواست برایش ثبت شود.</p></div>}{rooms.length>0 && <div className="room-list friend-rooms">{rooms.map(r=><div className="room-row" key={r.id}><div><strong>{r.name}</strong><small>کد دعوت: {r.code || r.id}</small></div><button className="signup-button" onClick={()=>shareRoom(r)}>ارسال دعوت ↗</button></div>)}</div>}</div>}
        {tab === "leaderboard" && <div className="content"><div className="page-heading"><span className="overline">رقابت دوستانه</span><h1>جدول امتیازهای آنلاین</h1><p>رتبه‌بندی بر اساس امتیازهای ثبت‌شده در حساب‌های Project X.</p></div><div className="panel-card"><div className="section-title compact"><div><span className="overline">رتبه‌بندی سراسری</span><h2>بازیکنان برتر</h2></div><span className="panel-icon">🏆</span></div>{leaderboardRows.length ? leaderboardRows.map((row,index)=><div className="leader-row" key={row.name+index}><b>{(index+1).toLocaleString("fa-IR")}</b><span className="leader-avatar">{row.name.slice(0,1)}</span><strong>{row.name}</strong><small>{row.gamesPlayed.toLocaleString("fa-IR")} بازی</small><em>{row.xp.toLocaleString("fa-IR")} XP</em></div>) : <p className="demo-note">هنوز امتیازی ثبت نشده است. اولین بازی را انجام بده!</p>}</div></div>}
        {tab === "rewards" && <div className="content"><div className="page-heading"><span className="overline">دستاوردهای تو</span><h1>پاداش و نشان‌ها</h1><p>با شرکت در بازی‌ها و دعوت دوستان، نشان‌های تازه بگیر.</p></div><div className="reward-grid"><div className="reward-card"><span>👑</span><strong>شروع قدرتمند</strong><small>اولین دورهمی خودت را بساز</small><em>{rooms.length ? "دریافت شد" : "هنوز باز نشده"}</em></div><div className="reward-card"><span>⭐</span><strong>ستاره جمع</strong><small>۵ بازی · {gamesPlayed.toLocaleString("fa-IR")}/۵</small><em>{gamesPlayed >= 5 ? "دریافت شد" : "در حال پیشرفت"}</em></div><div className="reward-card"><span>🚀</span><strong>دعوت‌کننده</strong><small>۳ دوست را دعوت کن</small><em>نیازمند قابلیت آنلاین</em></div><div className="reward-card"><span>💎</span><strong>قهرمان رقابت</strong><small>۱۰۰ XP · {xp.toLocaleString("fa-IR")}/۱۰۰</small><em>{xp >= 100 ? "دریافت شد" : "در حال پیشرفت"}</em></div></div></div>}
        {tab === "premium" && <div className="content"><div className="page-heading"><span className="overline">Project X Plus</span><h1>تجربه ویژه برای دورهمی‌های خاص</h1><p>طرح‌های اشتراک پیشنهادی؛ پرداخت هنوز به درگاه متصل نیست.</p></div><div className="premium-grid"><div className="premium-card"><span>ماهانه</span><h2>۹۹٬۰۰۰ <small>تومان</small></h2><p>امکانات بیشتر برای جمع‌های همیشگی</p><ul><li>نشان ویژه پروفایل</li><li>شخصی‌سازی اتاق‌ها</li><li>دسترسی به نشان‌های ویژه</li></ul><button className="signup-button" onClick={()=>notify("پرداخت اشتراک هنوز به درگاه متصل نشده است.")}>به‌زودی فعال می‌شود</button></div><div className="premium-card featured-premium"><span>پیشنهاد ویژه</span><h2>۷۹۹٬۰۰۰ <small>تومان</small></h2><p>طرح سالانه Project X Plus</p><ul><li>تمام امکانات طرح ماهانه</li><li>نشان سالانه اختصاصی</li><li>اولویت در امکانات آینده</li></ul><button className="signup-button" onClick={()=>notify("پرداخت اشتراک هنوز به درگاه متصل نشده است.")}>به‌زودی فعال می‌شود</button></div></div></div>}
        {tab==="admin" && account?.role==="admin" && <div className="content"><div className="page-heading"><span className="overline">کنسول مدیر</span><h1>مرکز کنترل Project X</h1><p>نمای کلی فعالیت‌های ثبت‌شده در پایگاه داده.</p></div><div className="admin-grid">{[{label:"کاربران",value:adminStats?.users??"—"},{label:"اتاق‌های فعال",value:adminStats?.activeRooms??"—"},{label:"اشتراک‌های فعال",value:adminStats?.activeSubscriptions??"—"},{label:"پیام‌ها",value:adminStats?.messages??"—"}].map(x=><div className="admin-stat" key={x.label}><span>{x.label}</span><strong>{x.value}</strong></div>)}</div><div className="panel-card"><h2>کنترل‌های مدیریتی</h2><p>آمار از سرور خوانده می‌شود. تنظیم نقش مدیر اصلی و سیاست‌های دسترسی پیش از عملیات حساس لازم است.</p></div></div>}
        {tab === "settings" && <div className="content"><div className="page-heading"><span className="overline">کنترل تجربه تو</span><h1>تنظیمات</h1><p>ظاهر و اعلان‌های برنامه را مدیریت کن.</p></div><div className="panel-card settings-card"><div className="setting-row"><div><strong>اعلان‌ها</strong><small>نمایش اعلان‌های داخل برنامه</small></div><button className={notificationsOn?"toggle-switch on":"toggle-switch"} onClick={()=>{const v=!notificationsOn;setNotificationsOn(v);saveSetting("projectx-notifications",v);}}>{notificationsOn?"روشن":"خاموش"}</button></div><div className="setting-row"><div><strong>صدای بازی</strong><small>صدای رویدادهای بازی</small></div><button className={soundOn?"toggle-switch on":"toggle-switch"} onClick={()=>{const v=!soundOn;setSoundOn(v);saveSetting("projectx-sound",v);}}>{soundOn?"روشن":"خاموش"}</button></div><div className="setting-row"><div><strong>اعلان‌های حساب</strong><small>{notifications.length} اعلان ثبت‌شده روی سرور</small></div><button className="outline-button" onClick={()=>{apiRequest("/notifications/read",{method:"POST"}).then(()=>setNotifications(current=>current.map(n=>({...n,readAt:new Date().toISOString()})))).catch(()=>notify("علامت‌گذاری اعلان‌ها ناموفق بود."));}}>خوانده شد</button></div><div className="setting-row"><div><strong>قالب ظاهری</strong><small>انتخاب ظاهر برنامه</small></div><div className="theme-choices"><button className={selectedTheme==="neon"?"theme-choice active":"theme-choice"} onClick={()=>{setSelectedTheme("neon");saveSetting("projectx-theme","neon");}}>تیره</button><button className={selectedTheme==="light"?"theme-choice active":"theme-choice"} onClick={()=>{setSelectedTheme("light");saveSetting("projectx-theme","light");}}>روشن</button></div></div><div className="setting-row"><div><strong>حساب کاربری</strong><small>مدیریت ورود و اطلاعات پروفایل</small></div><button className="outline-button" onClick={()=>setAuth(account?"login":"signup")}>{account?"مدیریت حساب":"ثبت‌نام / ورود"}</button></div></div></div>}
        {tab === "profile" && <div className="content"><div className="page-heading"><span className="overline">هویت تو در Project X</span><h1>پروفایل کاربری</h1><p>اطلاعاتت را ذخیره کن تا دفعه بعد هم روی همین دستگاه بماند.</p></div><div className="profile-card"><div className="profile-avatar">{name ? name.slice(0,1) : "م"}</div><div className="profile-fields"><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نامی که دوستانت می‌بینند"/><label>ایمیل</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" type="email"/><button className="signup-button" onClick={saveProfile}>ذخیره تغییرات <span>←</span></button>{account && <button className="text-button" onClick={logout}>خروج از حساب محلی</button>}</div></div></div>}
        {notice && <div className="toast" role="status"><span>✦</span>{notice}<button onClick={()=>setNotice("")} aria-label="بستن">×</button></div>}
        {activeRoom && <div className="modal-backdrop" onClick={()=>setActiveRoom(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveRoom(null)}>×</button><div className="overline">اتاق آنلاین Project X</div><h2>{activeRoom.name}</h2><p>کد دعوت: <b>{activeRoom.code || activeRoom.id}</b></p><p>بازی انتخاب‌شده: {activeRoom.game || "هنوز انتخاب نشده"}</p><button className="signup-button" onClick={()=>shareRoom(activeRoom)}>اشتراک‌گذاری دعوت ↗</button><div className="section-title compact"><div><span className="overline">گفت‌وگوی اتاق</span><h2>پیام‌ها</h2></div></div><div className="room-list" style={{maxHeight:220,overflowY:"auto"}}>{roomMessages.length?roomMessages.map(m=><div className="room-row" key={m.id}><div><strong>{m.sender}</strong><small>{m.body}</small></div></div>):<p className="demo-note">هنوز پیامی ارسال نشده است.</p>}</div><div className="room-input-row"><input value={messageDraft} onChange={e=>setMessageDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendRoomMessage();}} placeholder="پیام خودت را بنویس..."/><button onClick={sendRoomMessage}>ارسال ←</button></div><small className="demo-note">اتصال زنده WebSocket فعال است؛ در صورت قطع اتصال، دریافت پیام‌ها به‌صورت پشتیبان ادامه می‌یابد.</small></div></div>}
        {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className={"game-art modal-art "+selected.tone}><span>{selected.symbol}</span><small>PROJECT X / GAME</small></div><span className="overline">{selected.category}</span><h2>{selected.title}</h2>{round ? <div className="round-prompt"><p>{round}</p><div className="modal-actions"><button className="outline-button" onClick={()=>startGame(selected)}>سؤال بعدی ↻</button><button className="signup-button" onClick={finishRound}>ثبت پایان دور +۱۰ XP</button></div></div> : <p>یک تجربه گروهی برای ساختن لحظه‌های متفاوت. برای شروع، یک سؤال یا چالش بگیر.</p>}<div className="modal-actions"><button className="signup-button" onClick={()=>startGame(selected)}>شروع بازی ←</button><button className="outline-button" onClick={()=>{setRoomName(selected.title);setSelected(null);setTab("home");setTimeout(()=>document.getElementById("create-room")?.scrollIntoView({behavior:"smooth"}),50);}}>ساخت اتاق این بازی</button></div></div></div>}
      </section>
      <nav className="mobile-nav"><button className={tab==="home"?"chosen":""} onClick={()=>setTab("home")}><span>⌂</span>خانه</button><button className={tab==="games"?"chosen":""} onClick={()=>setTab("games")}><span>▦</span>بازی‌ها</button><button className={tab==="friends"?"chosen":""} onClick={()=>setTab("friends")}><span>♧</span>دوستان</button><button className={tab==="profile"?"chosen":""} onClick={()=>setTab("profile")}><span>◉</span>پروفایل</button><button className={tab==="settings"?"chosen":""} onClick={()=>setTab("settings")}><span>⚙</span>تنظیمات</button></nav>
      {auth && <div className="modal-backdrop" onClick={()=>{setAuth(null);setNotice("");}}><div className="auth-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>{setAuth(null);setNotice("");}}>×</button><div className="brand auth-brand"><span className="brand-mark">X</span><span>project<span className="brand-x">x</span></span></div><span className="overline">{auth==="signup"?"به جمع ما اضافه شو":"خوش برگشتی"}</span><h2>{auth==="signup"?"ساخت حساب کاربری":"ورود به حساب"}</h2><p>حساب کاربری به سرور Project X متصل است.</p>{auth==="signup" && <><label>نام نمایشی</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما"/></>}<label>ایمیل</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/><label>رمز عبور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitAuth();}} placeholder="حداقل ۱۰ کاراکتر"/><div className="social-auth"><button onClick={()=>notify("ورود با Google هنوز به سرویس OAuth متصل نشده است.")}>G <span>ادامه با Google</span></button><button onClick={()=>notify("ورود با Apple هنوز به سرویس Apple Sign in متصل نشده است.")}>● <span>ادامه با Apple</span></button></div>{recoveryToken ? <><label>رمز عبور جدید</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="حداقل ۱۰ کاراکتر"/><button className="signup-button auth-submit" onClick={async()=>{try{await apiRequest("/auth/reset-password",{method:"POST",body:JSON.stringify({token:recoveryToken,password})});setRecoveryToken("");setPassword("");notify("رمز عبور تغییر کرد؛ حالا وارد شو.");}catch(error){notify(error instanceof Error?error.message:"بازیابی رمز ناموفق بود.");}}}>ثبت رمز جدید ←</button></> : <button className="signup-button auth-submit" onClick={submitAuth}>{auth==="signup"?"ساخت حساب":"ورود"} <span>←</span></button>}<button className="switch-auth" onClick={()=>{setAuth(auth==="signup"?"login":"signup");setNotice("");}}>{auth==="signup"?"حساب داری؟ وارد شو":"حساب نداری؟ ثبت‌نام کن"}</button>{auth==="login" && !recoveryToken && <button className="switch-auth" onClick={async()=>{try{await apiRequest("/auth/forgot-password",{method:"POST",body:JSON.stringify({email:email.trim()})});notify("اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی ارسال می‌شود.");}catch(error){notify(error instanceof Error?error.message:"درخواست بازیابی ارسال نشد.");}}}>فراموشی رمز عبور؟</button>}<small className="demo-note">ورود ایمیل و رمز عبور آنلاین فعال است؛ تأیید ایمیل و ورود Google/Apple هنوز تنظیم نشده‌اند.</small></div></div>}
    </main>
  );
}
