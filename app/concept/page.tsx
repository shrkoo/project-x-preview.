"use client";

import { useState } from "react";

const tabs = [
  { id: "home", label: "خانه", icon: "⌂" },
  { id: "discover", label: "کشف", icon: "✳" },
  { id: "rooms", label: "اتاق‌ها", icon: "▤" },
  { id: "inbox", label: "پیام‌ها", icon: "◌" },
  { id: "profile", label: "حساب من", icon: "○" },
];

const rooms = [
  { title: "گفت‌وگوی دوستانه", subtitle: "برای آشنایی و صحبت", people: "۱۲ نفر", tag: "آزاد", color: "sage" },
  { title: "ایده‌های تازه", subtitle: "فکرها را با هم بسازیم", people: "۸ نفر", tag: "فعال", color: "sand" },
  { title: "موسیقی و هنر", subtitle: "سلیقه‌ها و کشف‌های جدید", people: "۲۴ نفر", tag: "محبوب", color: "blue" },
];

export default function ConceptPage() {
  const [tab, setTab] = useState("home");
  const [joined, setJoined] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");

  return (
    <main className="nv-concept" dir="rtl">
      <div className="nv-app">
        <header className="nv-top">
          <a className="nv-brand" href="/concept"><span className="nv-mark">n</span><span>NOVYRA</span></a>
          <button className="nv-avatar" aria-label="حساب کاربری" onClick={() => setTab("profile")}>ش</button>
        </header>

        <div className="nv-content">
          {tab === "home" && <>
            <div className="nv-greeting"><span>چه خوب که اینجایی</span><span className="nv-date">امروز، یک شروع تازه</span></div>
            <section className="nv-hero">
              <div className="nv-orb nv-orb-one" /><div className="nv-orb nv-orb-two" />
              <div className="nv-hero-copy">
                <span className="nv-eyebrow">فضایی برای ارتباط واقعی</span>
                <h1>آرام‌تر باش.<br/>نزدیک‌تر شو.</h1>
                <p>اینجا می‌تونی آدم‌ها، گفت‌وگوها و لحظه‌های تازه رو پیدا کنی.</p>
                <button className="nv-primary" onClick={() => setTab("discover")}>کشف دنیای NOVYRA <span>←</span></button>
              </div>
              <div className="nv-hero-art"><div className="nv-ring ring-a"/><div className="nv-ring ring-b"/><div className="nv-center">n</div><span className="nv-star star-a">✳</span><span className="nv-star star-b">✦</span></div>
            </section>
            <div className="nv-section-head"><div><span className="nv-kicker">شروع یک ارتباط</span><h2>پیشنهادهای امروز</h2></div><button className="nv-text-btn" onClick={() => setTab("discover")}>مشاهده همه ←</button></div>
            <div className="nv-feature-grid">
              <button className="nv-feature feature-dark" onClick={() => setTab("rooms")}><span className="nv-feature-icon">◉</span><span className="nv-feature-title">اتاق‌های گفت‌وگو</span><span className="nv-feature-desc">به جمع‌های تازه بپیوند</span><span className="nv-feature-arrow">↙</span></button>
              <button className="nv-feature feature-light" onClick={() => setTab("discover")}><span className="nv-feature-icon">✳</span><span className="nv-feature-title">آدم‌های تازه</span><span className="nv-feature-desc">با علایق مشترک آشنا شو</span><span className="nv-feature-arrow">↙</span></button>
            </div>
            <div className="nv-section-head room-head"><div><span className="nv-kicker">جایی برای تعلق</span><h2>اتاق‌های منتخب</h2></div><button className="nv-text-btn" onClick={() => setTab("rooms")}>همه اتاق‌ها ←</button></div>
            <div className="nv-room-list">{rooms.slice(0,2).map((room) => <article className="nv-room" key={room.title}><div className={"nv-room-symbol "+room.color}>{room.title.slice(0,1)}</div><div className="nv-room-info"><strong>{room.title}</strong><span>{room.subtitle}</span><small>{room.people} · {room.tag}</small></div><button className="nv-join" onClick={() => setJoined((old) => old.includes(room.title) ? old.filter(x => x !== room.title) : [...old, room.title])}>{joined.includes(room.title) ? "عضو شدی" : "ورود"}</button></article>)}</div>
          </>}

          {tab === "discover" && <section className="nv-page-panel"><span className="nv-kicker">دنیای تازه</span><h1>چی دوست داری کشف کنی؟</h1><p>موضوعی را انتخاب کن و وارد گفت‌وگوهای مرتبط شو.</p><div className="nv-topic-grid">{["هنر و خلاقیت","کتاب و یادگیری","موسیقی","سبک زندگی","تکنولوژی","گفت‌وگوی آزاد"].map((x,i)=><button className="nv-topic" key={x} onClick={() => setTab("rooms")}><span>{["✳","▧","♫","◌","⌘","☼"][i]}</span>{x}<b>←</b></button>)}</div></section>}

          {tab === "rooms" && <section className="nv-page-panel"><span className="nv-kicker">جامعه‌ها</span><h1>اتاق‌هایی برای هر سلیقه</h1><p>یک جمع خوب، می‌تونه شروع یک اتفاق خوب باشه.</p><button className="nv-primary nv-create" onClick={() => setShowCreate(!showCreate)}>＋ ساخت اتاق جدید</button>{showCreate && <div className="nv-create-form"><label>نام اتاق</label><input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="مثلاً دورهمی کتاب‌خوان‌ها"/><button className="nv-primary" onClick={()=>{if(roomName.trim()){setRoomName("");setShowCreate(false);}}}>ایجاد اتاق</button></div>}<div className="nv-room-list nv-all-rooms">{rooms.map(room=><article className="nv-room" key={room.title}><div className={"nv-room-symbol "+room.color}>{room.title.slice(0,1)}</div><div className="nv-room-info"><strong>{room.title}</strong><span>{room.subtitle}</span><small>{room.people} · {room.tag}</small></div><button className="nv-join" onClick={()=>setJoined(old=>old.includes(room.title)?old.filter(x=>x!==room.title):[...old,room.title])}>{joined.includes(room.title)?"عضو شدی":"ورود"}</button></article>)}</div></section>}

          {tab === "inbox" && <section className="nv-page-panel"><span className="nv-kicker">ارتباط‌ها</span><h1>پیام‌های تو</h1><div className="nv-empty"><span>◌</span><strong>هنوز گفت‌وگویی نداری</strong><p>وقتی با کسی ارتباط بگیری، پیام‌هایت اینجا دیده می‌شوند.</p><button className="nv-primary" onClick={()=>setTab("discover")}>پیدا کردن آدم‌های تازه</button></div></section>}

          {tab === "profile" && <section className="nv-page-panel"><span className="nv-kicker">فضای شخصی</span><h1>حساب من</h1><div className="nv-profile-card"><div className="nv-profile-avatar">ش</div><div><strong>کاربر NOVYRA</strong><span>خوش اومدی به جمع ما</span></div></div><div className="nv-settings-list">{["ویرایش پروفایل","حریم خصوصی و امنیت","اعلان‌ها","زبان برنامه","درباره NOVYRA"].map(x=><button key={x}>{x}<b>←</b></button>)}</div></section>}
        </div>

        <nav className="nv-bottom">{tabs.map(item=><button key={item.id} className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
        <footer className="nv-footer">NOVYRA <span>·</span> ارتباط، با آرامش</footer>
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap');
        .nv-concept{min-height:100vh;background:#e9ece7;color:#202b26;font-family:'Vazirmatn',Tahoma,sans-serif;padding:28px 14px 42px}
        .nv-app{max-width:1040px;min-height:calc(100vh - 70px);margin:auto;background:#f8f8f3;border:1px solid #e1e5dc;border-radius:28px;overflow:hidden;box-shadow:0 24px 80px #25382a12;position:relative;padding-bottom:82px}
        .nv-top{height:76px;padding:0 38px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e9ece5}
        .nv-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#21382d;font-weight:800;letter-spacing:2.5px;font-size:15px}
        .nv-mark{width:31px;height:31px;border-radius:11px;background:#244a39;color:#f6f5ed;display:grid;place-items:center;font-family:Georgia,serif;font-size:23px;font-style:italic;letter-spacing:0}
        .nv-avatar{width:38px;height:38px;border-radius:50%;border:1px solid #dfe5da;background:#e7ede4;color:#294936;font:600 14px 'Vazirmatn';cursor:pointer}
        .nv-content{max-width:850px;margin:auto;padding:36px 30px 24px}
        .nv-greeting{display:flex;flex-direction:column;gap:4px;margin-bottom:22px;font-size:19px;font-weight:700}.nv-date{font-size:12px;color:#89948b;font-weight:400}
        .nv-hero{min-height:300px;background:#244737;border-radius:23px;position:relative;overflow:hidden;color:#f5f5ed;padding:38px 42px;display:flex;align-items:center}
        .nv-hero-copy{position:relative;z-index:2;max-width:440px}.nv-eyebrow,.nv-kicker{font-size:11px;letter-spacing:.4px;color:#a8c3ad;font-weight:600}
        .nv-hero h1{font-size:38px;line-height:1.45;margin:10px 0 8px;font-weight:700;letter-spacing:-1px}.nv-hero p{font-size:13px;line-height:2;color:#d2ded3;max-width:340px;margin:0 0 22px}
        .nv-primary{background:#d8e5d7;color:#234334;border:0;border-radius:12px;padding:12px 17px;font:600 12px 'Vazirmatn';cursor:pointer;display:inline-flex;gap:18px;align-items:center;justify-content:center;transition:.2s}.nv-primary:hover{transform:translateY(-2px);background:#e8eee5}
        .nv-hero-art{position:absolute;left:8%;top:50%;transform:translateY(-50%);width:260px;height:260px;display:grid;place-items:center;opacity:.95}
        .nv-ring{position:absolute;border:1px solid #9bb7a077;border-radius:50%}.ring-a{width:230px;height:230px}.ring-b{width:170px;height:170px;border-style:dashed}
        .nv-center{width:92px;height:92px;border-radius:32px;background:#dce8d9;color:#284936;display:grid;place-items:center;font:italic 68px Georgia;box-shadow:0 10px 50px #142d2070}
        .nv-orb{position:absolute;border-radius:50%;background:#8aa89133;filter:blur(1px)}.nv-orb-one{width:260px;height:260px;right:-90px;top:-130px}.nv-orb-two{width:190px;height:190px;right:42%;bottom:-150px;background:#c0d3bd20}
        .nv-star{position:absolute;color:#c6d9c2}.star-a{top:22px;left:36px;font-size:28px}.star-b{bottom:28px;right:34px;font-size:20px}
        .nv-section-head{display:flex;align-items:end;justify-content:space-between;margin:34px 0 16px}.nv-section-head h2{font-size:19px;margin:5px 0 0;font-weight:700}.nv-kicker{color:#87998a}
        .nv-text-btn{border:0;background:none;color:#607b68;font:500 11px 'Vazirmatn';cursor:pointer}
        .nv-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
        .nv-feature{min-height:150px;border:0;border-radius:18px;padding:20px;text-align:right;position:relative;display:flex;flex-direction:column;align-items:flex-start;cursor:pointer;overflow:hidden;font-family:'Vazirmatn'}
        .feature-dark{background:#e4ebe1;color:#294636}.feature-light{background:#f0eade;color:#66543e}
        .nv-feature-icon{font-size:21px;margin-bottom:12px}.nv-feature-title{font-size:15px;font-weight:700}.nv-feature-desc{font-size:11px;opacity:.7;margin-top:4px}.nv-feature-arrow{position:absolute;left:18px;bottom:17px;font-size:18px}
        .room-head{margin-top:32px}.nv-room-list{display:flex;flex-direction:column;gap:9px}.nv-room{background:#fff;border:1px solid #edf0e9;border-radius:15px;padding:12px 14px;display:flex;align-items:center;gap:13px}
        .nv-room-symbol{width:43px;height:43px;border-radius:14px;display:grid;place-items:center;font-size:17px;font-weight:700}.sage{background:#e4eee3;color:#3d6549}.sand{background:#f2eadc;color:#8b7047}.blue{background:#e5eceb;color:#53706c}
        .nv-room-info{display:flex;flex:1;flex-direction:column;gap:2px}.nv-room-info strong{font-size:12px}.nv-room-info span{font-size:10px;color:#8a948c}.nv-room-info small{font-size:9px;color:#a0a89f;margin-top:2px}
        .nv-join{border:1px solid #dce6da;background:#f5f8f2;color:#41634b;border-radius:9px;padding:8px 13px;font:500 10px 'Vazirmatn';cursor:pointer;white-space:nowrap}
        .nv-page-panel{min-height:570px;padding:22px 0}.nv-page-panel h1{font-size:29px;margin:9px 0;color:#26392e}.nv-page-panel>p{color:#849087;font-size:13px;margin:0 0 28px}
        .nv-topic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nv-topic{background:white;border:1px solid #e9eee6;border-radius:15px;padding:20px;text-align:right;display:flex;align-items:center;gap:12px;color:#33483a;font:600 13px 'Vazirmatn';cursor:pointer}.nv-topic span{font-size:20px;color:#6b8a70}.nv-topic b{margin-right:auto;color:#91a095}
        .nv-create{margin:0 0 20px;background:#244737;color:#f7f7ef}.nv-create-form{padding:17px;background:#fff;border:1px solid #e8eee6;border-radius:14px;margin-bottom:18px;display:flex;flex-direction:column;gap:9px}.nv-create-form label{font-size:11px}.nv-create-form input{padding:12px;border:1px solid #dce5db;border-radius:9px;font:12px 'Vazirmatn';outline:none}.nv-all-rooms{margin-top:20px}
        .nv-empty{margin:70px auto 0;text-align:center;max-width:350px;color:#829086}.nv-empty>span{width:68px;height:68px;border-radius:23px;background:#e7eee5;display:grid;place-items:center;margin:0 auto 18px;font-size:30px;color:#55745c}.nv-empty strong{display:block;color:#35483b;font-size:15px}.nv-empty p{font-size:12px;line-height:2;margin:7px 0 18px}
        .nv-profile-card{background:#fff;border:1px solid #e9eee6;border-radius:17px;padding:18px;display:flex;align-items:center;gap:14px;margin:28px 0 16px}.nv-profile-avatar{width:54px;height:54px;border-radius:18px;background:#e4ece1;color:#34543d;display:grid;place-items:center;font-size:20px}.nv-profile-card div:last-child{display:flex;flex-direction:column;gap:4px}.nv-profile-card strong{font-size:13px}.nv-profile-card span{font-size:11px;color:#8b978d}
        .nv-settings-list{background:#fff;border:1px solid #e9eee6;border-radius:15px;overflow:hidden}.nv-settings-list button{width:100%;padding:16px 18px;border:0;border-bottom:1px solid #eff1ec;background:white;text-align:right;display:flex;justify-content:space-between;color:#48584b;font:500 12px 'Vazirmatn';cursor:pointer}.nv-settings-list button:last-child{border:0}.nv-settings-list b{color:#9aa69b}
        .nv-bottom{position:absolute;bottom:0;right:0;left:0;height:76px;background:#fbfcf8;border-top:1px solid #e9ede6;display:flex;align-items:center;justify-content:center;gap:clamp(20px,7vw,75px)}
        .nv-bottom button{border:0;background:none;color:#98a198;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:54px;cursor:pointer;font-family:'Vazirmatn'}.nv-bottom button span{font-size:22px;line-height:1.1}.nv-bottom button small{font-size:9px}.nv-bottom button.active{color:#315840}.nv-bottom button.active span{transform:translateY(-2px)}
        .nv-footer{position:absolute;bottom:-27px;left:0;right:0;text-align:center;color:#9ba59b;font-size:9px;letter-spacing:2px}.nv-footer span{padding:0 5px}
        @media(max-width:650px){.nv-concept{padding:0;background:#f8f8f3}.nv-app{min-height:100vh;border:0;border-radius:0;padding-bottom:75px;box-shadow:none}.nv-top{height:64px;padding:0 20px}.nv-content{padding:25px 18px 24px}.nv-greeting{font-size:17px;margin-bottom:18px}.nv-hero{min-height:310px;padding:27px 23px;border-radius:20px;align-items:flex-start}.nv-hero h1{font-size:32px}.nv-hero p{font-size:12px;max-width:270px}.nv-hero-art{width:140px;height:140px;left:-26px;top:auto;bottom:5px;transform:none;opacity:.45}.ring-a{width:135px;height:135px}.ring-b{width:100px;height:100px}.nv-center{width:58px;height:58px;border-radius:20px;font-size:43px}.star-a{top:2px;left:15px}.star-b{bottom:12px;right:12px}.nv-feature{min-height:138px;padding:15px}.nv-feature-title{font-size:13px}.nv-feature-desc{font-size:10px}.nv-section-head{margin-top:28px}.nv-section-head h2{font-size:17px}.nv-room{padding:10px;gap:10px}.nv-room-symbol{width:39px;height:39px}.nv-join{padding:7px 10px}.nv-page-panel{padding:14px 0;min-height:calc(100vh - 170px)}.nv-page-panel h1{font-size:25px}.nv-topic-grid{gap:9px}.nv-topic{padding:16px 12px;font-size:11px}.nv-bottom{height:70px;gap:0;justify-content:space-around}.nv-bottom button{min-width:48px}.nv-bottom button span{font-size:20px}.nv-bottom button small{font-size:9px}}
      `}</style>
    </main>
  );
}
