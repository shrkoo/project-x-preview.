const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shrkoo.github.io",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const fail = (message, status = 400) => json({ error: message }, status);
const randomToken = (bytes = 32) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const digest = async value => {
  const out = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(out), b => b.toString(16).padStart(2, "0")).join("");
};
const passwordHash = async (password, salt) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 210000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
};
const readBody = async request => { try { return await request.json(); } catch { return null; } };
async function createSession(db, userId) {
  const token = randomToken();
  const tokenHash = await digest(token);
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(tokenHash,userId,expires).run();
  return { token, expiresAt: expires };
}
async function authenticate(request, db) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length < 30) return null;
  const tokenHash = await digest(token);
  return await db.prepare("SELECT u.id,u.email,u.display_name,u.xp,u.games_played FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,Date.now()).first();
}
function cleanName(value) { return String(value || "").trim().replace(/[<>]/g, "").slice(0, 32); }
function cleanEmail(value) { return String(value || "").trim().toLowerCase().slice(0, 254); }
export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) } });
  const headers = { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) };
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const db = env.DB;
  try {
   if (path === "/health" && request.method === "GET") return json({ ok: true, service: "project-x-api", database: "connected", region: "EU" });
   if (path === "/auth/register" && request.method === "POST") {
    const body = await readBody(request);
    const email = cleanEmail(body?.email), displayName = cleanName(body?.name), password = String(body?.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    if (displayName.length < 2) return fail("نام نمایشی باید حداقل ۲ حرف باشد.");
    if (password.length < 10) return fail("رمز عبور باید حداقل ۱۰ کاراکتر باشد.");
    if (password.length > 128) return fail("رمز عبور بیش از حد طولانی است.");
    const id = crypto.randomUUID(), salt = randomToken(16), hash = await passwordHash(password,salt);
    try { await db.prepare("INSERT INTO users (id,email,display_name,password_hash,password_salt) VALUES (?,?,?,?,?)").bind(id,email,displayName,hash,salt).run(); }
    catch { return fail("این ایمیل قبلاً ثبت شده یا امکان ساخت حساب وجود ندارد.",409); }
    const session = await createSession(db,id);
    return json({ token:session.token, expiresAt:session.expiresAt, user:{id,email,displayName,xp:0,gamesPlayed:0}, emailVerificationRequired:true, message:"حساب ساخته شد؛ تأیید ایمیل هنوز به سرویس ارسال ایمیل متصل نشده است." },201);
   }
   if (path === "/auth/login" && request.method === "POST") {
    const body = await readBody(request), email = cleanEmail(body?.email), password = String(body?.password || "");
    const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if (!user) return fail("ایمیل یا رمز عبور اشتباه است.",401);
    const candidate = await passwordHash(password,user.password_salt);
    if (candidate !== user.password_hash) return fail("ایمیل یا رمز عبور اشتباه است.",401);
    const session = await createSession(db,user.id);
    return json({ token:session.token, expiresAt:session.expiresAt, user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played} });
   }
   const user = await authenticate(request,db);
   if (path.startsWith("/auth/") && path !== "/auth/register" && path !== "/auth/login") {
    if (!user) return fail("برای ادامه وارد حساب شو.",401);
    if (path === "/auth/me" && request.method === "GET") return json({user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played}});
    if (path === "/auth/profile" && request.method === "PATCH") {
      const body=await readBody(request), name=cleanName(body?.name);
      if(name.length<2) return fail("نام نمایشی معتبر نیست.");
      await db.prepare("UPDATE users SET display_name=? WHERE id=?").bind(name,user.id).run();
      return json({ok:true,name});
    }
    if (path === "/auth/logout" && request.method === "POST") {
      const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
      if(token) await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
      return json({ok:true});
    }
   }
   if (!user) return fail("برای استفاده از این بخش وارد حساب شو.",401);
   if (path === "/rooms" && request.method === "GET") {
    const rows=await db.prepare("SELECT r.id,r.code,r.name,r.game_title AS gameTitle,r.status,r.max_players AS maxPlayers,r.created_at AS createdAt,u.display_name AS ownerName,(SELECT COUNT(*) FROM room_members m WHERE m.room_id=r.id) AS playerCount FROM rooms r JOIN users u ON u.id=r.owner_id WHERE r.status='waiting' ORDER BY r.created_at DESC LIMIT 40").all();
    return json({rooms:rows.results||[]});
   }
   if (path === "/rooms" && request.method === "POST") {
    const body=await readBody(request), name=cleanName(body?.name), game=String(body?.gameTitle||"").slice(0,80);
    if(name.length<2) return fail("نام اتاق باید حداقل ۲ حرف باشد.");
    const id=crypto.randomUUID(), code=randomToken(5).replace(/[-_]/g,"").slice(0,7).toUpperCase();
    await db.batch([
      db.prepare("INSERT INTO rooms (id,code,name,game_title,owner_id) VALUES (?,?,?,?,?)").bind(id,code,name,game,user.id),
      db.prepare("INSERT INTO room_members (room_id,user_id,role) VALUES (?,?,?)").bind(id,user.id,"owner")
    ]);
    return json({room:{id,code,name,gameTitle:game,status:"waiting",playerCount:1,ownerName:user.display_name}},201);
   }
   const joinMatch=path.match(/^\/rooms\/([A-Z0-9]+)\/join$/);
   if(joinMatch && request.method==="POST") {
    const room=await db.prepare("SELECT * FROM rooms WHERE code=? AND status='waiting'").bind(joinMatch[1]).first();
    if(!room) return fail("اتاق پیدا نشد یا دیگر فعال نیست.",404);
    const count=await db.prepare("SELECT COUNT(*) AS n FROM room_members WHERE room_id=?").bind(room.id).first();
    const already=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first();
    if(!already && count.n>=room.max_players) return fail("ظرفیت اتاق تکمیل است.",409);
    await db.prepare("INSERT OR IGNORE INTO room_members (room_id,user_id) VALUES (?,?)").bind(room.id,user.id).run();
    return json({ok:true,room:{id:room.id,code:room.code,name:room.name,gameTitle:room.game_title}});
   }
   const messageMatch=path.match(/^\/rooms\/([A-Z0-9]+)\/messages$/);
   if(messageMatch) {
    const room=await db.prepare("SELECT id FROM rooms WHERE code=?").bind(messageMatch[1]).first();
    if(!room) return fail("اتاق پیدا نشد.",404);
    const member=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first();
    if(!member) return fail("عضو این اتاق نیستی.",403);
    if(request.method==="GET") {
      const rows=await db.prepare("SELECT m.id,m.body,m.created_at AS createdAt,u.display_name AS sender FROM room_messages m JOIN users u ON u.id=m.user_id WHERE m.room_id=? ORDER BY m.created_at DESC LIMIT 60").bind(room.id).all();
      return json({messages:(rows.results||[]).reverse()});
    }
    if(request.method==="POST") {
      const body=await readBody(request), text=String(body?.body||"").trim().slice(0,1000);
      if(!text) return fail("پیام خالی است.");
      const id=crypto.randomUUID();
      await db.prepare("INSERT INTO room_messages (id,room_id,user_id,body) VALUES (?,?,?,?)").bind(id,room.id,user.id,text).run();
      return json({message:{id,body:text,sender:user.display_name,createdAt:new Date().toISOString()}},201);
    }
   }
   if(path==="/friends" && request.method==="GET") {
    const rows=await db.prepare("SELECT f.id,f.status,f.requester_id AS requesterId,f.addressee_id AS addresseeId,u.display_name AS name,u.email FROM friendships f JOIN users u ON u.id=CASE WHEN f.requester_id=? THEN f.addressee_id ELSE f.requester_id END WHERE f.requester_id=? OR f.addressee_id=? ORDER BY f.created_at DESC").bind(user.id,user.id,user.id).all();
    return json({friends:rows.results||[]});
   }
   if(path==="/friends/request" && request.method==="POST") {
    const body=await readBody(request), email=cleanEmail(body?.email);
    const target=await db.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if(!target) return fail("با این ایمیل کاربری پیدا نشد.",404);
    if(target.id===user.id) return fail("نمی‌توانی خودت را اضافه کنی.");
    const id=crypto.randomUUID();
    try { await db.prepare("INSERT INTO friendships (id,requester_id,addressee_id) VALUES (?,?,?)").bind(id,user.id,target.id).run(); }
    catch { return fail("درخواست دوستی قبلاً ارسال شده است.",409); }
    await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),target.id,"friend_request","درخواست دوستی",user.display_name+" برایت درخواست دوستی فرستاد.").run();
    return json({ok:true},201);
   }
   if(path==="/leaderboard" && request.method==="GET") {
    const rows=await db.prepare("SELECT display_name AS name,xp,games_played AS gamesPlayed FROM users ORDER BY xp DESC,games_played DESC LIMIT 50").all();
    return json({leaderboard:rows.results||[]});
   }
   if(path==="/rounds/finish" && request.method==="POST") {
    const body=await readBody(request), game=String(body?.gameTitle||"").slice(0,80), prompt=String(body?.prompt||"").slice(0,500), roomCode=String(body?.roomCode||"");
    let roomId=null;
    if(roomCode){ const room=await db.prepare("SELECT id FROM rooms WHERE code=?").bind(roomCode).first(); if(!room) return fail("اتاق پیدا نشد.",404); const member=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first(); if(!member) return fail("عضو اتاق نیستی.",403); roomId=room.id; }
    const id=crypto.randomUUID();
    if(roomId) await db.prepare("INSERT INTO game_rounds (id,room_id,user_id,game_title,prompt,points) VALUES (?,?,?,?,?,10)").bind(id,roomId,user.id,game,prompt).run();
    await db.prepare("UPDATE users SET xp=xp+10,games_played=games_played+1 WHERE id=?").bind(user.id).run();
    const updated=await db.prepare("SELECT xp,games_played AS gamesPlayed FROM users WHERE id=?").bind(user.id).first();
    return json({ok:true,awarded:10,...updated});
   }
   if(path==="/notifications" && request.method==="GET") {
    const rows=await db.prepare("SELECT id,kind,title,body,read_at AS readAt,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50").bind(user.id).all();
    return json({notifications:rows.results||[]});
   }
   if(path==="/notifications/read" && request.method==="POST") {
    await db.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL").bind(user.id).run();
    return json({ok:true});
   }
   return fail("مسیر API پیدا نشد.",404);
  } catch (error) {
   console.error("project-x-api-error",error);
   return fail("خطای داخلی سرور. دوباره تلاش کن.",500);
  }
 }
};