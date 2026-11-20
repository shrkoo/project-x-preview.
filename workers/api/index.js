const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

async function sendMail(env,to,subject,html) {
 if(String(env.EMAIL_BRIDGE_URL||"").trim() && String(env.EMAIL_BRIDGE_SECRET||"").trim()) {
  const bridgeUrl=String(env.EMAIL_BRIDGE_URL).trim();
  const bridgeSecret=String(env.EMAIL_BRIDGE_SECRET).trim();
  const response=await fetch(bridgeUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:bridgeSecret,to,subject,html}),redirect:"follow"});
  const responseText=await response.text();
  if(!response.ok) {
    console.error("novyra-email-bridge-http",response.status,responseText.slice(0,500));
    throw new Error("email_bridge_http_"+response.status);
  }
  let result;
  try { result=JSON.parse(responseText); } catch {
    console.error("novyra-email-bridge-invalid-json",response.headers.get("content-type"),responseText.slice(0,500));
    throw new Error("email_bridge_invalid_response");
  }
  if(result?.success!==true) {
    console.error("novyra-email-bridge-rejected",JSON.stringify(result).slice(0,500));
    throw new Error("email_bridge_delivery_failed");
  }
  return true;
 }
 if(!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html})});
 if(!response.ok) throw new Error("email_provider_error");
 return true;
}
const hasMailProvider = env => Boolean((String(env.EMAIL_BRIDGE_URL||"").trim() && String(env.EMAIL_BRIDGE_SECRET||"").trim()) || (env.RESEND_API_KEY && env.EMAIL_FROM));

const escapeEmailHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function renderNovyraEmail({eyebrow,title,intro,actionLabel,actionUrl,notice,footerNote}) {
  const safeUrl=escapeEmailHtml(actionUrl);
  const safeTitle=escapeEmailHtml(title);
  const safeIntro=escapeEmailHtml(intro);
  const safeAction=escapeEmailHtml(actionLabel);
  const safeNotice=escapeEmailHtml(notice);
  const safeFooter=escapeEmailHtml(footerNote || "این پیام به‌صورت خودکار از طرف تیم NOVYRA ارسال شده است.");
  const safeEyebrow=escapeEmailHtml(eyebrow || "NOVYRA ACCOUNT");
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${safeTitle} | NOVYRA</title></head>
<body style="margin:0;padding:0;background:#f3f5f9;font-family:Tahoma,Arial,sans-serif;color:#172033;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeTitle} — NOVYRA</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f9;padding:36px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e7eaf0;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#111c31;padding:27px 32px;text-align:left;direction:ltr;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="width:38px;height:38px;border:1px solid #7186a8;border-radius:11px;text-align:center;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:700;">N</td>
            <td style="padding-left:12px;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:3px;">NOVYRA</td>
          </tr></table>
          <div style="margin-top:15px;color:#aebbd0;font-size:10px;letter-spacing:2px;">BUILT FOR YOUR MOMENTS</div>
        </td></tr>
        <tr><td style="padding:38px 36px 30px;text-align:right;direction:rtl;">
          <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:13px;">${safeEyebrow}</div>
          <h1 style="margin:0 0 17px;color:#111c31;font-size:25px;line-height:1.6;font-weight:700;">${safeTitle}</h1>
          <p style="margin:0 0 27px;color:#475467;font-size:15px;line-height:2.1;">${safeIntro}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
            <tr><td align="center" bgcolor="#172b4d" style="border-radius:10px;">
              <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 29px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;">${safeAction}</a>
            </td></tr>
          </table>
          <div style="background:#f5f7fb;border:1px solid #e8edf5;border-radius:10px;padding:14px 16px;color:#526078;font-size:12px;line-height:2;">${safeNotice}</div>
          <p style="margin:23px 0 0;color:#7b8495;font-size:12px;line-height:2;">اگر دکمه بالا باز نشد، این نشانی را در مرورگر خود کپی کنید:<br><a href="${safeUrl}" style="color:#345b91;word-break:break-all;text-decoration:underline;">${safeUrl}</a></p>
        </td></tr>
        <tr><td style="padding:26px 24px;background:#fafbfc;border-top:1px solid #edf0f4;text-align:center;">
          <div style="color:#25334b;font-size:13px;font-weight:700;letter-spacing:1px;">The NOVYRA Team</div>
          <div style="margin-top:9px;color:#8992a2;font-size:11px;line-height:1.9;">${safeFooter}</div>
          <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto 0;">
            <tr>
              <td style="padding:0 7px;"><a href="https://www.instagram.com/homaai2026/" target="_blank" aria-label="Instagram" style="display:inline-block;width:30px;height:30px;text-decoration:none;"><img src="https://cdn.simpleicons.org/instagram/E4405F" width="30" height="30" alt="Instagram" style="display:block;width:30px;height:30px;border:0;"></a></td>
              <td style="padding:0 7px;"><a href="https://x.com/HomaAi2026" target="_blank" aria-label="X" style="display:inline-block;width:30px;height:30px;text-decoration:none;"><img src="https://cdn.simpleicons.org/x/000000" width="30" height="30" alt="X" style="display:block;width:30px;height:30px;border:0;"></a></td>
              <td style="padding:0 7px;"><a href="https://www.tiktok.com/@homaai8" target="_blank" aria-label="TikTok" style="display:inline-block;width:30px;height:30px;text-decoration:none;"><img src="https://cdn.simpleicons.org/tiktok/000000" width="30" height="30" alt="TikTok" style="display:block;width:30px;height:30px;border:0;"></a></td>
              <td style="padding:0 7px;"><a href="https://www.youtube.com/@homaai2026" target="_blank" aria-label="YouTube" style="display:inline-block;width:30px;height:30px;text-decoration:none;"><img src="https://cdn.simpleicons.org/youtube/FF0033" width="30" height="30" alt="YouTube" style="display:block;width:30px;height:30px;border:0;"></a></td>
              <td style="padding:0 7px;"><a href="https://www.linkedin.com/in/shirko-alizadeh-a95001447/" target="_blank" aria-label="LinkedIn" style="display:inline-block;width:30px;height:30px;text-decoration:none;"><img src="https://cdn.simpleicons.org/linkedin/0A66C2" width="30" height="30" alt="LinkedIn" style="display:block;width:30px;height:30px;border:0;"></a></td>
            </tr>
          </table>
          <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:20px auto 0;">
            <tr>
              <td width="36" height="36" align="center" valign="middle" bgcolor="#172b4d" style="border-radius:9px;color:#ffffff;font-family:Arial,sans-serif;font-size:23px;font-weight:700;letter-spacing:-2px;">N</td>
              <td style="padding-left:10px;text-align:left;vertical-align:middle;">
                <div style="color:#172b4d;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:2px;">NOVYRA</div>
                <div style="margin-top:2px;color:#9aa4b2;font-size:8px;letter-spacing:2px;">SMARTER DIGITAL EXPERIENCES</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:17px;color:#667085;font-size:11px;line-height:2;">NOVYRA با تمرکز بر تجربه‌ای هوشمند، ساده و قابل‌اعتماد طراحی شده است.</div>
          <div style="margin-top:10px;color:#a0a8b5;font-size:10px;letter-spacing:1px;">BUILT FOR YOUR MOMENTS</div>
        </td></tr>
      </table>
      <div style="padding:18px 10px;color:#98a1af;font-size:10px;text-align:center;">لطفاً به این ایمیل پاسخ ندهید؛ این پیام به‌صورت خودکار ارسال شده است.</div>
    </td></tr>
  </table>
</body></html>`;
}

async function issueEmailToken(db,userId,kind,ttlMs) {
 const token=randomToken(32), tokenHash=await digest(token), expires=Date.now()+ttlMs;
 await db.prepare("INSERT INTO email_tokens (id,user_id,token_hash,kind,expires_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),userId,tokenHash,kind,expires).run();
 return token;
}
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
  return await db.prepare("SELECT u.id,u.email,u.display_name,u.xp,u.games_played,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,Date.now()).first();
}
function cleanName(value) { return String(value || "").trim().replace(/[<>]/g, "").slice(0, 32); }
function cleanEmail(value) { return String(value ?? "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, "").toLowerCase().slice(0, 254); }

const isoDate = value => {
  const raw=String(value||"");
  const date=new Date(raw.includes("T")?raw:raw.replace(" ","T")+"Z");
  return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
};
function shapeSocialPost(row) {
  return {
    id:row.id, body:row.body||"", mediaUrl:row.mediaUrl||null, mediaType:row.mediaType||null,
    createdAt:isoDate(row.createdAt), authorId:row.authorId, authorName:row.authorName||"NOVYRA",
    likeCount:Number(row.likeCount||0), commentCount:Number(row.commentCount||0),
    likedByMe:Boolean(row.likedByMe), viewCount:Number(row.viewCount||0)
  };
}

export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) } });
  const headers = { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) };
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const db = env.DB;
  try {
   if (path === "/health" && request.method === "GET") return json({ ok: true, service: "novyra-api", database: "connected", region: "EU" });

   if (path === "/auth/google/start" && request.method === "GET") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail("ورود با Google هنوز پیکربندی نشده است.",503);
    const state=randomToken(32);
    const redirectUri=env.GOOGLE_REDIRECT_URI || `${url.origin}/auth/google/callback`;
    const params=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",scope:"openid email profile",state,prompt:"select_account"});
    return new Response(null,{status:302,headers:{
      "Location":`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "Set-Cookie":`px_google_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth/google/callback; Max-Age=600`,
      ...corsHeaders
    }});
   }
   if (path === "/auth/google/callback" && request.method === "GET") {
    const failRedirect=(reason)=>Response.redirect(`${env.APP_URL || "https://novyra.pages.dev/"}#google_error=${encodeURIComponent(reason)}`,302);
    const code=url.searchParams.get("code"), state=url.searchParams.get("state"), cookie=request.headers.get("Cookie")||"";
    const cookieState=cookie.match(/(?:^|;\s*)px_google_state=([^;]+)/)?.[1]||"";
    const cleanCookie={ "Set-Cookie":"px_google_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth/google/callback; Max-Age=0" };
    if(!code || !state || !cookieState || state!==cookieState) return failRedirect("اعتبارسنجی امنیتی Google ناموفق بود؛ دوباره تلاش کن.");
    if(!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return failRedirect("تنظیمات Google OAuth کامل نیست.");
    const redirectUri=env.GOOGLE_REDIRECT_URI || `${url.origin}/auth/google/callback`;
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:redirectUri,grant_type:"authorization_code"})});
    if(!tokenResponse.ok) return failRedirect("دریافت مجوز از Google ناموفق بود؛ تنظیمات Redirect URI را بررسی کن.");
    const tokenData=await tokenResponse.json();
    if(!tokenData.id_token) return failRedirect("Google اطلاعات هویتی معتبری برنگرداند.");
    const verifyResponse=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
    if(!verifyResponse.ok) return failRedirect("تأیید هویت Google ناموفق بود.");
    const claims=await verifyResponse.json();
    const now=Math.floor(Date.now()/1000);
    if(claims.aud!==env.GOOGLE_CLIENT_ID || !["accounts.google.com","https://accounts.google.com"].includes(claims.iss) || Number(claims.exp)<=now || claims.email_verified!=="true" || !claims.sub || !/^\S+@\S+\.\S+$/.test(claims.email||"")) return failRedirect("اطلاعات حساب Google معتبر یا تأییدشده نیست.");
    const email=cleanEmail(claims.email), displayName=cleanName(claims.name||claims.given_name||email.split("@")[0]);
    let user=await db.prepare("SELECT id,email,display_name,xp,games_played,role FROM users WHERE email=?").bind(email).first();
    if(!user) {
      const id=crypto.randomUUID(), salt=randomToken(16), hash=await digest(randomToken(48));
      const role=email===cleanEmail(env.ADMIN_EMAIL)?"admin":"user";
      await db.prepare("INSERT INTO users (id,email,display_name,password_hash,password_salt,role,verified_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(id,email,displayName,hash,salt,role).run();
      user={id,email,display_name:displayName,xp:0,games_played:0,role};
    } else {
      await db.prepare("UPDATE users SET verified_at=COALESCE(verified_at,CURRENT_TIMESTAMP) WHERE id=?").bind(user.id).run();
    }
    const session=await createSession(db,user.id);
    const target=env.APP_URL || "https://novyra.pages.dev/";
    return new Response(null,{status:302,headers:{"Location":`${target}#google_token=${encodeURIComponent(session.token)}`,"Set-Cookie":"px_google_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth/google/callback; Max-Age=0",...corsHeaders}});
   }

   if (path === "/auth/password-salt" && request.method === "GET") {
    const email=cleanEmail(url.searchParams.get("email"));
    const user=await db.prepare("SELECT password_salt FROM users WHERE email=?").bind(email).first();
    return json({salt:user?.password_salt || "AAAAAAAAAAAAAAAAAAAAAA"});
   }

   if (path === "/auth/register" && request.method === "POST") {
    const body = await readBody(request);
    const email = cleanEmail(body?.email ?? body?.emailAddress), displayName = cleanName(body?.name ?? body?.displayName);
    const salt=String(body?.salt ?? body?.passwordSalt ?? body?.password_salt ?? "");
    const suppliedHash=String(body?.passwordHash ?? body?.password_hash ?? body?.hash ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    if (displayName.length < 2) return fail("نام نمایشی باید حداقل ۲ حرف باشد.");
    if (!salt || salt.length < 16 || salt.length > 128) return fail("داده امنیتی نمک رمز از صفحه دریافت نشد؛ صفحه را تازه‌سازی کن.");
    if (!/^[a-f0-9]{64}$/i.test(suppliedHash)) return fail("خروجی رمز عبور از صفحه ناقص است؛ صفحه را تازه‌سازی کن.");
    const id = crypto.randomUUID(), hash = suppliedHash;
    try { await db.prepare("INSERT INTO users (id,email,display_name,password_hash,password_salt,role) VALUES (?,?,?,?,?,?)").bind(id,email,displayName,hash,salt,email===cleanEmail(env.ADMIN_EMAIL)?"admin":"user").run(); }
    catch (insertError) {
      const existing=await db.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(email).first();
      if(existing) return fail("برای این ایمیل حسابی وجود دارد. از ورود یا ورود با Google استفاده کن.",409);
      console.error("project-x-register-insert-error",insertError);
      return fail("ساخت حساب در پایگاه‌داده ناموفق بود؛ مشکل از ایمیل تکراری نیست. لطفاً بعداً دوباره تلاش کن.",500);
    }
    let verificationSent=false;
    if(hasMailProvider(env)) {
      try {
        const token=await issueEmailToken(db,id,"verify",24*60*60*1000);
        const link=(env.APP_URL || "https://novyra.pages.dev") + "/?verify=" + encodeURIComponent(token);
        await sendMail(env,email,"تأیید ایمیل NOVYRA",renderNovyraEmail({eyebrow:"WELCOME TO NOVYRA",title:"به NOVYRA خوش آمدی",intro:"برای فعال‌سازی حساب و تأیید نشانی ایمیل خود، دکمه زیر را انتخاب کن.",actionLabel:"تأیید ایمیل",actionUrl:link,notice:"این لینک تا ۲۴ ساعت معتبر است.",footerNote:"اگر این حساب را ایجاد نکرده‌اید، این پیام را نادیده بگیرید."}));
        verificationSent=true;
      } catch (mailError) {
        console.error("project-x-verification-email-error",mailError);
      }
    }
    const session = await createSession(db,id);
    return json({ token:session.token, expiresAt:session.expiresAt, user:{id,email,displayName,xp:0,gamesPlayed:0,role:email===cleanEmail(env.ADMIN_EMAIL)?"admin":"user"}, emailVerificationRequired:env.REQUIRE_EMAIL_VERIFICATION==="true", verificationSent, message:verificationSent?"لینک تأیید ارسال شد.":"حساب ساخته شد؛ تنظیمات ارسال ایمیل هنوز لازم است." },201);
   }

   if (path === "/auth/verify-email" && request.method === "POST") {
    const body=await readBody(request), token=String(body?.token||"");
    if(token.length<20) return fail("لینک تأیید معتبر نیست.");
    const tokenHash=await digest(token);
    const record=await db.prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND kind='verify' AND expires_at>? AND used_at IS NULL").bind(tokenHash,Date.now()).first();
    if(!record) return fail("لینک تأیید منقضی یا استفاده شده است.",410);
    await db.batch([
      db.prepare("UPDATE users SET verified_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.user_id),
      db.prepare("UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.id)
    ]);
    return json({ok:true,message:"ایمیل با موفقیت تأیید شد."});
   }
   if (path === "/auth/forgot-password" && request.method === "POST") {
    if(!hasMailProvider(env)) return fail("سرویس ارسال ایمیل هنوز تنظیم نشده است.",503);
    const body=await readBody(request), email=cleanEmail(body?.email);
    if(!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    const target=await db.prepare("SELECT id,email FROM users WHERE email=?").bind(email).first();
    if(target) {
      const pending=await db.prepare("SELECT COUNT(*) AS total FROM email_tokens WHERE user_id=? AND kind='password_reset' AND expires_at>? AND used_at IS NULL").bind(target.id,Date.now()).first();
      if((pending?.total||0)<3) {
        const token=await issueEmailToken(db,target.id,"password_reset",60*60*1000);
        const link=(env.APP_URL || "https://novyra.pages.dev") + "/?reset=" + encodeURIComponent(token);
        await sendMail(env,target.email,"بازیابی رمز عبور NOVYRA",renderNovyraEmail({eyebrow:"ACCOUNT SECURITY",title:"بازیابی رمز عبور",intro:"درخواست انتخاب رمز عبور جدید برای حساب NOVYRA شما ثبت شده است. برای ادامه، دکمه زیر را انتخاب کنید.",actionLabel:"تغییر رمز عبور",actionUrl:link,notice:"این لینک فقط تا یک ساعت معتبر است و پس از آن منقضی می‌شود.",footerNote:"اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید؛ رمز عبور حساب شما تغییر نخواهد کرد."}));
      }
    }
    return json({ok:true,message:"اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی ارسال می‌شود."});
   }
   if (path === "/auth/reset-password" && request.method === "POST") {
    const body=await readBody(request), token=String(body?.token||""), salt=String(body?.salt||""), suppliedHash=String(body?.passwordHash||"");
    if(!/^(?:[A-Za-z0-9_-]{22}|[a-f0-9]{32})$/.test(salt) || !/^[a-f0-9]{64}$/i.test(suppliedHash)) return fail("اطلاعات رمز جدید معتبر نیست.");
    const tokenHash=await digest(token);
    const record=await db.prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND kind='password_reset' AND expires_at>? AND used_at IS NULL").bind(tokenHash,Date.now()).first();
    if(!record) return fail("لینک بازیابی معتبر نیست یا منقضی شده است.",410);
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(suppliedHash,salt,record.user_id),
      db.prepare("UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(record.user_id)
    ]);
    return json({ok:true,message:"رمز عبور تغییر کرد؛ دوباره وارد شو."});
   }
   if (path === "/auth/login" && request.method === "POST") {
    const body = await readBody(request), email = cleanEmail(body?.email), suppliedHash = String(body?.passwordHash || "");
    const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if (!user) return fail("ایمیل یا رمز عبور اشتباه است.",401);
    if(env.REQUIRE_EMAIL_VERIFICATION==="true" && !user.verified_at) return fail("ابتدا ایمیل خود را تأیید کن.",403);
    if (!/^[a-f0-9]{64}$/.test(suppliedHash) || suppliedHash !== user.password_hash) return fail("ایمیل یا رمز عبور اشتباه است.",401);
    const session = await createSession(db,user.id);
    return json({ token:session.token, expiresAt:session.expiresAt, user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played,role:user.role} });
   }

   const wsMatch=path.match(/^\/rooms\/([A-Z0-9]+)\/live$/);
   if(wsMatch && request.headers.get("Upgrade")?.toLowerCase()==="websocket") {
    const ticket=url.searchParams.get("ticket")||"", ticketHash=await digest(ticket);
    const record=await db.prepare("SELECT user_id FROM ws_tickets WHERE ticket_hash=? AND expires_at>? AND used_at IS NULL").bind(ticketHash,Date.now()).first();
    if(!record) return fail("مجوز اتصال زنده معتبر نیست.",401);
    const member=await db.prepare("SELECT 1 AS yes FROM room_members m JOIN rooms r ON r.id=m.room_id WHERE r.code=? AND m.user_id=?").bind(wsMatch[1],record.user_id).first();
    if(!member) return fail("عضو این اتاق نیستی.",403);
    await db.prepare("UPDATE ws_tickets SET used_at=CURRENT_TIMESTAMP WHERE ticket_hash=?").bind(ticketHash).run();
    const profile=await db.prepare("SELECT display_name FROM users WHERE id=?").bind(record.user_id).first();
    const id=env.ROOM_HUB.idFromName(wsMatch[1]);
    return env.ROOM_HUB.get(id).fetch(new Request(request,{headers:new Headers({...Object.fromEntries(request.headers), "X-PX-USER":record.user_id,"X-PX-NAME":profile.display_name,"X-PX-ROOM":wsMatch[1]})}));
   }
   const user = await authenticate(request,db);
   if (path.startsWith("/auth/") && path !== "/auth/register" && path !== "/auth/login") {
    if (!user) return fail("برای ادامه وارد حساب شو.",401);
    if (path === "/auth/set-password" && request.method === "POST") {
      const body=await readBody(request), salt=String(body?.salt||""), suppliedHash=String(body?.passwordHash||"");
      if(!/^(?:[A-Za-z0-9_-]{22}|[a-f0-9]{32})$/.test(salt) || !/^[a-f0-9]{64}$/i.test(suppliedHash)) return fail("اطلاعات رمز عبور معتبر نیست.");
      await db.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(suppliedHash,salt,user.id).run();
      return json({ok:true,message:"رمز عبور با موفقیت تنظیم شد."});
    }
    if (path === "/auth/me" && request.method === "GET") return json({user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played,role:user.role}});
    if (path === "/auth/resend-verification" && request.method === "POST") {
      if(!hasMailProvider(env)) return fail("سرویس ارسال ایمیل هنوز تنظیم نشده است.",503);
      const target=await db.prepare("SELECT email,verified_at FROM users WHERE id=?").bind(user.id).first();
      if(target?.verified_at) return json({ok:true,alreadyVerified:true,message:"ایمیل قبلاً تأیید شده است."});
      const pending=await db.prepare("SELECT COUNT(*) AS total FROM email_tokens WHERE user_id=? AND kind='verify' AND expires_at>?").bind(user.id,Date.now()).first();
      if((pending?.total||0)>=3) return fail("برای ارسال دوباره کمی صبر کن.",429);
      const token=await issueEmailToken(db,user.id,"verify",24*60*60*1000);
      const link=(env.APP_URL || "https://novyra.pages.dev") + "/?verify=" + encodeURIComponent(token);
      await sendMail(env,target.email,"تأیید ایمیل NOVYRA",renderNovyraEmail({eyebrow:"EMAIL VERIFICATION",title:"تأیید نشانی ایمیل",intro:"برای تکمیل تأیید حساب NOVYRA خود، دکمه زیر را انتخاب کنید.",actionLabel:"تأیید ایمیل",actionUrl:link,notice:"این لینک تا ۲۴ ساعت معتبر است.",footerNote:"اگر این درخواست را ثبت نکرده‌اید، می‌توانید این پیام را نادیده بگیرید."}));
      return json({ok:true,message:"لینک تأیید دوباره ارسال شد."});
    }
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

   if(path==="/auth/ws-ticket" && request.method==="POST") {
    const ticket=randomToken(24), ticketHash=await digest(ticket);
    await db.prepare("INSERT INTO ws_tickets (ticket_hash,user_id,expires_at) VALUES (?,?,?)").bind(ticketHash,user.id,Date.now()+60_000).run();
    return json({ticket,expiresIn:60});
   }
   if (!user) return fail("برای استفاده از این بخش وارد حساب شو.",401);

   // NOVYRA social core — additive routes; existing account and legacy API routes stay intact.
   if ((path === "/social/feed" || path === "/social/reels") && request.method === "GET") {
    const reelsOnly = path === "/social/reels";
    const rows = await db.prepare(`
      SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.created_at AS createdAt,
        p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
        EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe
      FROM social_posts p JOIN users u ON u.id=p.author_id
      ${reelsOnly ? "WHERE p.media_type='video'" : ""}
      ORDER BY p.created_at DESC LIMIT 50
    `).bind(user.id).all();
    return json({ posts: (rows.results || []).map(shapeSocialPost) });
   }

   if (path === "/social/profile" && request.method === "GET") {
    const [stats, posts] = await Promise.all([
      db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM social_posts WHERE author_id=?) AS postCount,
          (SELECT COUNT(*) FROM social_follows WHERE followed_id=?) AS followerCount,
          (SELECT COUNT(*) FROM social_follows WHERE follower_id=?) AS followingCount
      `).bind(user.id,user.id,user.id).first(),
      db.prepare(`
        SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.created_at AS createdAt,
          p.author_id AS authorId,u.display_name AS authorName,
          (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
          (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
          EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe
        FROM social_posts p JOIN users u ON u.id=p.author_id
        WHERE p.author_id=? ORDER BY p.created_at DESC LIMIT 50
      `).bind(user.id,user.id).all()
    ]);
    return json({
      profile:{id:user.id,email:user.email,displayName:user.display_name,postCount:stats?.postCount||0,followerCount:stats?.followerCount||0,followingCount:stats?.followingCount||0},
      posts:(posts.results||[]).map(shapeSocialPost)
    });
   }


   if (path === "/social/explore" && request.method === "GET") {
    const limit=Math.min(40,Math.max(1,Number(url.searchParams.get("limit")||30)));
    const offset=Math.max(0,Number(url.searchParams.get("offset")||0));
    const rows=await db.prepare("SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.created_at AS createdAt,p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,(SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,(SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe FROM social_posts p JOIN users u ON u.id=p.author_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?").bind(user.id,limit,offset).all();
    return json({posts:(rows.results||[]).map(shapeSocialPost),nextOffset:offset+(rows.results||[]).length,hasMore:(rows.results||[]).length===limit});
   }

   const otherProfileMatch=path.match(/^\/social\/users\/([a-f0-9-]+)\/profile$/i);
   if(otherProfileMatch && request.method==="GET") {
    const targetId=otherProfileMatch[1];
    const target=await db.prepare("SELECT id,email,display_name AS displayName FROM users WHERE id=?").bind(targetId).first();
    if(!target) return fail("کاربر پیدا نشد.",404);
    const [stats,posts]=await Promise.all([
     db.prepare("SELECT (SELECT COUNT(*) FROM social_posts WHERE author_id=?) AS postCount,(SELECT COUNT(*) FROM social_follows WHERE followed_id=?) AS followerCount,(SELECT COUNT(*) FROM social_follows WHERE follower_id=?) AS followingCount,EXISTS(SELECT 1 FROM social_follows WHERE follower_id=? AND followed_id=?) AS followedByMe").bind(targetId,targetId,targetId,user.id,targetId).first(),
     db.prepare("SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.created_at AS createdAt,p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,(SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,(SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe FROM social_posts p JOIN users u ON u.id=p.author_id WHERE p.author_id=? ORDER BY p.created_at DESC LIMIT 100").bind(user.id,targetId).all()
    ]);
    return json({profile:{...target,...stats},posts:(posts.results||[]).map(shapeSocialPost)});
   }

   const viewPostMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/view$/i);
   if(viewPostMatch && request.method==="POST") {
    const result=await db.prepare("UPDATE social_posts SET view_count=COALESCE(view_count,0)+1 WHERE id=? RETURNING view_count AS viewCount").bind(viewPostMatch[1]).first();
    if(!result) return fail("پست پیدا نشد.",404);
    return json({viewCount:result.viewCount||0});
   }

   if(path==="/social/search-history" && request.method==="GET") {
    const rows=await db.prepare("SELECT h.id,h.search_type AS type,h.query_text AS query,h.target_user_id AS userId,h.created_at AS createdAt,u.display_name AS displayName,LOWER(REPLACE(u.display_name,' ','')) AS username FROM social_search_history h LEFT JOIN users u ON u.id=h.target_user_id WHERE h.owner_id=? ORDER BY h.created_at DESC LIMIT 100").bind(user.id).all();
    return json({items:rows.results||[]});
   }
   if(path==="/social/search-history" && request.method==="POST") {
    const body=await readBody(request), type=body?.type==="user"?"user":"query";
    const targetId=type==="user"?String(body?.userId||""):"";
    const queryText=type==="query"?String(body?.query||"").trim().slice(0,100):"";
    if(type==="user" && (!targetId || targetId===user.id)) return fail("کاربر جست‌وجو معتبر نیست.");
    if(type==="query" && !queryText) return fail("عبارت جست‌وجو خالی است.");
    if(type==="user" && !await db.prepare("SELECT id FROM users WHERE id=?").bind(targetId).first()) return fail("کاربر پیدا نشد.",404);
    const existing=type==="user"
     ? await db.prepare("SELECT id FROM social_search_history WHERE owner_id=? AND target_user_id=?").bind(user.id,targetId).first()
     : await db.prepare("SELECT id FROM social_search_history WHERE owner_id=? AND search_type='query' AND query_text=?").bind(user.id,queryText).first();
    const id=existing?.id||crypto.randomUUID();
    await db.prepare("INSERT INTO social_search_history (id,owner_id,search_type,target_user_id,query_text,created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET created_at=CURRENT_TIMESTAMP,query_text=excluded.query_text").bind(id,user.id,type,type==="user"?targetId:null,type==="query"?queryText:null).run();
    return json({ok:true,id});
   }
   const historyItemMatch=path.match(/^\/social\/search-history\/([a-f0-9-]+)$/i);
   if(historyItemMatch && request.method==="DELETE") {
    await db.prepare("DELETE FROM social_search_history WHERE id=? AND owner_id=?").bind(historyItemMatch[1],user.id).run();
    return json({ok:true});
   }
   if(path==="/social/search-history/clear" && request.method==="DELETE") {
    await db.prepare("DELETE FROM social_search_history WHERE owner_id=?").bind(user.id).run();
    return json({ok:true});
   }

   if (path === "/social/search" && request.method === "GET") {
    const q=String(url.searchParams.get("q")||"").trim().slice(0,100);
    const likeQuery=`%${q}%`;
    const usersResult= q
      ? await db.prepare(`
          SELECT u.id,u.display_name AS displayName,LOWER(REPLACE(u.display_name,' ','')) AS username,
            (SELECT COUNT(*) FROM social_posts p WHERE p.author_id=u.id) AS postCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.followed_id=u.id) AS followerCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.follower_id=u.id) AS followingCount,
            EXISTS(SELECT 1 FROM social_follows mine WHERE mine.follower_id=? AND mine.followed_id=u.id) AS followedByMe
          FROM users u WHERE u.id<>? AND (u.display_name LIKE ? OR LOWER(REPLACE(u.display_name,' ','')) LIKE ?)
          ORDER BY followerCount DESC,u.created_at DESC LIMIT 40
        `).bind(user.id,user.id,likeQuery,likeQuery).all()
      : await db.prepare(`
          SELECT u.id,u.display_name AS displayName,LOWER(REPLACE(u.display_name,char(32),'')) AS username,
            (SELECT COUNT(*) FROM social_posts p WHERE p.author_id=u.id) AS postCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.followed_id=u.id) AS followerCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.follower_id=u.id) AS followingCount,
            EXISTS(SELECT 1 FROM social_follows mine WHERE mine.follower_id=? AND mine.followed_id=u.id) AS followedByMe
          FROM users u WHERE u.id<>?
          ORDER BY u.created_at DESC LIMIT 30
        `).bind(user.id,user.id).all();
    let postsResult={results:[]};
    if(q) {
      postsResult=await db.prepare(`
        SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.created_at AS createdAt,
          p.author_id AS authorId,u.display_name AS authorName,
          (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
          (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
          EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe
        FROM social_posts p JOIN users u ON u.id=p.author_id
        WHERE p.body LIKE ?
        ORDER BY p.created_at DESC LIMIT 30
      `).bind(user.id,likeQuery).all();
    }
    return json({users:usersResult.results||[],posts:(postsResult.results||[]).map(shapeSocialPost)});
   }

   if (path === "/social/posts" && request.method === "POST") {
    const body=await readBody(request), postBody=String(body?.body||"").trim().slice(0,2000);
    const mediaUrl=body?.mediaUrl ? String(body.mediaUrl).trim().slice(0,2048) : "";
    const mediaType=body?.mediaType=== "image" || body?.mediaType=== "video" ? body.mediaType : null;
    if(!postBody && !mediaUrl) return fail("متن یا رسانه‌ای برای انتشار وارد کن.");
    if(mediaUrl) {
      let parsed;
      try { parsed=new URL(mediaUrl); } catch { return fail("نشانی رسانه معتبر نیست."); }
      if(parsed.protocol!=="https:" || !mediaType) return fail("برای رسانه، یک لینک HTTPS و نوع تصویر یا ویدئو انتخاب کن.");
    }
    const id=crypto.randomUUID();
    await db.prepare("INSERT INTO social_posts (id,author_id,body,media_url,media_type) VALUES (?,?,?,?,?)")
      .bind(id,user.id,postBody,mediaUrl||null,mediaUrl?mediaType:null).run();
    await db.prepare(`
      INSERT INTO notifications (id,user_id,kind,title,body)
      SELECT lower(hex(randomblob(16))),f.follower_id,'new_post','پست تازه',? FROM social_follows f WHERE f.followed_id=?
    `).bind("پست تازه‌ای از "+user.display_name+" منتشر شد.",user.id).run();
    return json({ok:true,id,message:"پست منتشر شد."},201);
   }

   const socialLikeMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/like$/i);
   if(socialLikeMatch && request.method==="POST") {
    const postId=socialLikeMatch[1];
    const post=await db.prepare("SELECT author_id FROM social_posts WHERE id=?").bind(postId).first();
    if(!post) return fail("پست پیدا نشد.",404);
    const existing=await db.prepare("SELECT 1 AS yes FROM social_post_likes WHERE post_id=? AND user_id=?").bind(postId,user.id).first();
    if(existing) {
      await db.prepare("DELETE FROM social_post_likes WHERE post_id=? AND user_id=?").bind(postId,user.id).run();
    } else {
      await db.prepare("INSERT INTO social_post_likes (post_id,user_id) VALUES (?,?)").bind(postId,user.id).run();
      if(post.author_id!==user.id) await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(),post.author_id,"post_like","پسندیدن پست",user.display_name+" پستت را پسندید.").run();
    }
    const total=await db.prepare("SELECT COUNT(*) AS total FROM social_post_likes WHERE post_id=?").bind(postId).first();
    return json({liked:!existing,likeCount:total?.total||0});
   }

   const socialCommentsMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/comments$/i);
   if(socialCommentsMatch) {
    const postId=socialCommentsMatch[1];
    const post=await db.prepare("SELECT author_id FROM social_posts WHERE id=?").bind(postId).first();
    if(!post) return fail("پست پیدا نشد.",404);
    if(request.method==="GET") {
      const comments=await db.prepare(`
        SELECT c.id,c.body,c.created_at AS createdAt,c.author_id AS authorId,u.display_name AS authorName
        FROM social_post_comments c JOIN users u ON u.id=c.author_id
        WHERE c.post_id=? ORDER BY c.created_at ASC LIMIT 100
      `).bind(postId).all();
      return json({comments:(comments.results||[]).map(row=>({...row,createdAt:isoDate(row.createdAt)}))});
    }
    if(request.method==="POST") {
      const body=await readBody(request), comment=String(body?.body||"").trim().slice(0,1000);
      if(!comment) return fail("متن نظر خالی است.");
      const id=crypto.randomUUID();
      await db.prepare("INSERT INTO social_post_comments (id,post_id,author_id,body) VALUES (?,?,?,?)").bind(id,postId,user.id,comment).run();
      if(post.author_id!==user.id) await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(),post.author_id,"post_comment","نظر تازه",user.display_name+" برای پستت نظر گذاشت.").run();
      return json({comment:{id,body:comment,createdAt:new Date().toISOString(),authorId:user.id,authorName:user.display_name}},201);
    }
   }

   const socialFollowMatch=path.match(/^\/social\/users\/([a-f0-9-]+)\/follow$/i);
   if(socialFollowMatch && request.method==="POST") {
    const targetId=socialFollowMatch[1];
    if(targetId===user.id) return fail("نمی‌توانی خودت را دنبال کنی.");
    const target=await db.prepare("SELECT id FROM users WHERE id=?").bind(targetId).first();
    if(!target) return fail("کاربر پیدا نشد.",404);
    const existing=await db.prepare("SELECT 1 AS yes FROM social_follows WHERE follower_id=? AND followed_id=?").bind(user.id,targetId).first();
    if(existing) {
      await db.prepare("DELETE FROM social_follows WHERE follower_id=? AND followed_id=?").bind(user.id,targetId).run();
    } else {
      await db.prepare("INSERT INTO social_follows (follower_id,followed_id) VALUES (?,?)").bind(user.id,targetId).run();
      await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(),targetId,"new_follower","دنبال‌کننده تازه",user.display_name+" تو را دنبال کرد.").run();
    }
    return json({following:!existing});
   }

   if(path==="/ai/chat" && request.method==="POST") {
    if(!env.AI || typeof env.AI.run!=="function") return fail("سرویس هوش مصنوعی هنوز روی Worker فعال نشده است.",503);
    const body=await readBody(request), incoming=Array.isArray(body?.messages)?body.messages.slice(-12):[];
    const safeMessages=incoming.map(item=>({
      role:item?.role==="assistant"?"assistant":"user",
      content:String(item?.content||"").trim().slice(0,8000)
    })).filter(item=>item.content);
    if(!safeMessages.length || safeMessages[safeMessages.length-1].role!=="user") return fail("پیام معتبر وارد کن.");
    const day=new Date().toISOString().slice(0,10);
    const usage=await db.prepare(`
      INSERT INTO ai_daily_usage (user_id,usage_day,request_count,updated_at) VALUES (?,?,1,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id,usage_day) DO UPDATE SET request_count=request_count+1,updated_at=CURRENT_TIMESTAMP
      WHERE request_count<30
      RETURNING request_count
    `).bind(user.id,day).first();
    if(!usage) return fail("سهمیه روزانه دستیار هوشمند به پایان رسیده است.",429);
    try {
      const result=await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{
        messages:[
          {role:"system",content:"You are NOVYRA AI, a careful and useful multilingual assistant. Reply in the language of the user's latest message. For Persian use clear natural Persian; for Kurdish, respond in Sorani when appropriate. Be accurate, distinguish facts from uncertainty, never invent live web research or actions, and keep answers structured and practical."},
          ...safeMessages
        ],
        max_tokens:1200
      });
      const reply=String(result?.response||result?.choices?.[0]?.message?.content||result?.result?.response||"").trim();
      if(!reply) throw new Error("empty_ai_response");
      return json({reply,remainingToday:Math.max(0,30-Number(usage.request_count||1))});
    } catch(error) {
      console.error("novyra-ai-inference-error",String(error?.message||error).slice(0,160));
      return fail("پاسخ‌گویی هوش مصنوعی موقتاً ناموفق بود. دوباره تلاش کن.",502);
    }
   }
   const gameMatch=path.match(/^\/rooms\/([A-Z0-9]+)\/game(?:\/(start|next))?$/);
   if(gameMatch) {
    const room=await db.prepare("SELECT id,code,name,game_title,owner_id,status FROM rooms WHERE code=?").bind(gameMatch[1]).first();
    if(!room) return fail("اتاق پیدا نشد.",404);
    const member=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first();
    if(!member) return fail("عضو این اتاق نیستی.",403);
    if(request.method==="GET") {
      const state=await db.prepare("SELECT phase,round_number AS roundNumber,turn_user_id AS turnUserId,current_prompt AS prompt FROM game_room_state WHERE room_id=?").bind(room.id).first();
      return json({room:{code:room.code,name:room.name,gameTitle:room.game_title,status:room.status},state:state||{phase:"lobby",roundNumber:0,prompt:null}});
    }
    if(request.method==="POST" && (gameMatch[2]==="start" || gameMatch[2]==="next")) {
      if(room.owner_id!==user.id) return fail("فقط سازنده اتاق می‌تواند دور بازی را مدیریت کند.",403);
      const body=await readBody(request), title=String(body?.gameTitle||room.game_title||"حقیقت یا چالش");
      const bank={
       "حقیقت یا چالش":["یک خاطره خنده‌دار از این جمع تعریف کن.","آخرین باری که از ته دل خندیدی چه زمانی بود؟","به یکی از افراد جمع یک تعریف واقعی بگو."],
       "چقدر منو می‌شناسی؟":["غذای مورد علاقه میزبان چیست؟","اگر میزبان سفر رایگان داشته باشد کجا می‌رود؟","چه چیزی بیشتر از همه میزبان را خوشحال می‌کند؟"],
       "نبرد اطلاعات":["کدام سیاره به سیاره سرخ معروف است؟","بزرگ‌ترین اقیانوس جهان کدام است؟","نماد شیمیایی طلا چیست؟"],
       "انتخاب غیرممکن":["یک سال بدون موسیقی یا یک سال بدون فیلم؟","سفر به گذشته یا آینده؟","همیشه تابستان یا همیشه زمستان؟"]
      };
      if(!bank[title]) return fail("بازی انتخاب‌شده معتبر نیست.");
      const prompt=bank[title][crypto.getRandomValues(new Uint32Array(1))[0]%bank[title].length];
      const existing=await db.prepare("SELECT round_number AS roundNumber FROM game_room_state WHERE room_id=?").bind(room.id).first();
      const roundNumber=gameMatch[2]==="start"?1:(existing?.roundNumber||0)+1;
      await db.batch([
        db.prepare("INSERT INTO game_room_state (room_id,phase,round_number,turn_user_id,started_at,updated_at,current_prompt) VALUES (?,'playing',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?) ON CONFLICT(room_id) DO UPDATE SET phase='playing',round_number=excluded.round_number,turn_user_id=excluded.turn_user_id,updated_at=CURRENT_TIMESTAMP,current_prompt=excluded.current_prompt").bind(room.id,roundNumber,user.id,prompt),
        db.prepare("UPDATE rooms SET game_title=?,status='playing' WHERE id=?").bind(title,room.id)
      ]);
      const event={type:"game_round",roomCode:room.code,gameTitle:title,roundNumber,prompt};
      const hub=env.ROOM_HUB.get(env.ROOM_HUB.idFromName(room.code));
      await hub.fetch("https://room-hub.internal/broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(event)});
      return json({ok:true,gameTitle:title,roundNumber,prompt,phase:"playing"});
    }
   }
   if (path === "/rooms" && request.method === "GET") {
    const rows=await db.prepare("SELECT r.id,r.code,r.name,r.game_title AS gameTitle,r.status,r.max_players AS maxPlayers,r.created_at AS createdAt,u.display_name AS ownerName,r.owner_id AS ownerId,(SELECT COUNT(*) FROM room_members m WHERE m.room_id=r.id) AS playerCount FROM rooms r JOIN users u ON u.id=r.owner_id WHERE r.status IN ('waiting','playing') ORDER BY r.created_at DESC LIMIT 40").all();
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
    return json({room:{id,code,name,gameTitle:game,status:"waiting",playerCount:1,ownerName:user.display_name,ownerId:user.id}},201);
   }
   const joinMatch=path.match(/^\/rooms\/([A-Z0-9]+)\/join$/);
   if(joinMatch && request.method==="POST") {
    const room=await db.prepare("SELECT * FROM rooms WHERE code=? AND status IN ('waiting','playing')").bind(joinMatch[1]).first();
    if(!room) return fail("اتاق پیدا نشد یا دیگر فعال نیست.",404);
    const count=await db.prepare("SELECT COUNT(*) AS n FROM room_members WHERE room_id=?").bind(room.id).first();
    const already=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first();
    if(!already && count.n>=room.max_players) return fail("ظرفیت اتاق تکمیل است.",409);
    await db.prepare("INSERT OR IGNORE INTO room_members (room_id,user_id) VALUES (?,?)").bind(room.id,user.id).run();
    return json({ok:true,room:{id:room.id,code:room.code,name:room.name,gameTitle:room.game_title,ownerId:room.owner_id}});
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

   const friendRespond=path.match(/^\/friends\/([a-f0-9-]+)\/respond$/i);
   if(friendRespond && request.method==="POST") {
    const body=await readBody(request), status=body?.status;
    if(!["accepted","rejected"].includes(status)) return fail("پاسخ درخواست معتبر نیست.");
    const relation=await db.prepare("SELECT id,requester_id FROM friendships WHERE id=? AND addressee_id=? AND status='pending'").bind(friendRespond[1],user.id).first();
    if(!relation) return fail("درخواست دوستی پیدا نشد.",404);
    await db.prepare("UPDATE friendships SET status=? WHERE id=?").bind(status,relation.id).run();
    await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),relation.requester_id,"friend_response","پاسخ درخواست دوستی",status==="accepted"?user.display_name+" درخواست دوستی را پذیرفت.":user.display_name+" درخواست دوستی را رد کرد.").run();
    return json({ok:true,status});
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

   if(path==="/admin/overview" && request.method==="GET") {
    if(user.role!=="admin") return fail("دسترسی مدیر لازم است.",403);
    const [users,rooms,subs,messages]=await Promise.all([
      db.prepare("SELECT COUNT(*) AS total FROM users").first(),
      db.prepare("SELECT COUNT(*) AS total FROM rooms WHERE status='waiting'").first(),
      db.prepare("SELECT COUNT(*) AS total FROM subscriptions WHERE status='active'").first(),
      db.prepare("SELECT COUNT(*) AS total FROM room_messages").first()
    ]);
    return json({users:users.total,activeRooms:rooms.total,activeSubscriptions:subs.total,messages:messages.total});
   }
   if(path==="/admin/users" && request.method==="GET") {
    if(user.role!=="admin") return fail("دسترسی مدیر لازم است.",403);
    const rows=await db.prepare("SELECT id,email,display_name AS name,role,xp,verified_at AS verifiedAt,created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 100").all();
    return json({users:rows.results||[]});
   }
   if(path==="/leaderboard" && request.method==="GET") {
    const rows=await db.prepare("SELECT display_name AS name,xp,games_played AS gamesPlayed FROM users ORDER BY xp DESC,games_played DESC LIMIT 50").all();
    return json({leaderboard:rows.results||[]});
   }
   if(path==="/rounds/finish" && request.method==="POST") {
    const body=await readBody(request), game=String(body?.gameTitle||"").slice(0,80), prompt=String(body?.prompt||"").slice(0,500), roomCode=String(body?.roomCode||"");
    const allowed=["حقیقت یا چالش","چقدر منو می‌شناسی؟","نبرد اطلاعات","انتخاب غیرممکن"];
    if(!allowed.includes(game)) return fail("بازی معتبر نیست.");
    let roomId=null;
    if(roomCode){
      const room=await db.prepare("SELECT id,owner_id,status FROM rooms WHERE code=?").bind(roomCode).first();
      if(!room) return fail("اتاق پیدا نشد.",404);
      const member=await db.prepare("SELECT 1 AS yes FROM room_members WHERE room_id=? AND user_id=?").bind(room.id,user.id).first();
      if(!member) return fail("عضو اتاق نیستی.",403);
      if(room.status!=="waiting" && room.status!=="playing") return fail("این دور دیگر فعال نیست.",409);
      roomId=room.id;
    }
    const now=Date.now(), last=await db.prepare("SELECT last_awarded_at AS last,last_round_number AS lastRound FROM game_round_claims WHERE user_id=?").bind(user.id).first();
    let roundNumber=-1;
    if(roomId) {
      const state=await db.prepare("SELECT round_number AS roundNumber,current_prompt AS currentPrompt,phase FROM game_room_state WHERE room_id=?").bind(roomId).first();
      if(!state || state.phase!=="playing" || state.currentPrompt!==prompt) return fail("این دور از طرف سرور فعال نیست یا قبلاً تغییر کرده است.",409);
      roundNumber=state.roundNumber;
      if(last && last.lastRound===roundNumber) return fail("امتیاز این دور قبلاً برایت ثبت شده است.",409);
    }
    if(last && now-last.last<3000) return fail("برای ثبت امتیاز بعدی کمی صبر کن.",429);
    await db.prepare("INSERT INTO game_round_claims (user_id,last_awarded_at,last_round_number) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_awarded_at=excluded.last_awarded_at,last_round_number=excluded.last_round_number").bind(user.id,now,roundNumber).run();
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
   console.error("novyra-api-error",path,error);
   if(path==="/auth/forgot-password") {
    const code=String(error?.message||"unknown_error").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80);
    return fail("ارسال ایمیل بازیابی ناموفق بود. کد خطا: "+code,502);
   }
   return fail("خطای داخلی سرور. دوباره تلاش کن.",500);
  }
 }
};

import { DurableObject } from "cloudflare:workers";

export class RoomHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(request) {
    if(request.method==="POST" && new URL(request.url).pathname==="/broadcast") {
      const event=await request.json();
      const payload=JSON.stringify(event);
      for(const socket of this.ctx.getWebSockets()){try{socket.send(payload);}catch{}}
      return Response.json({ok:true});
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("WebSocket upgrade required",{status:426});
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const userId=request.headers.get("X-PX-USER")||"";
    const name=request.headers.get("X-PX-NAME")||"بازیکن";
    const room=request.headers.get("X-PX-ROOM")||"";
    server.serializeAttachment({userId,name,room});
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({type:"ready",message:"اتصال زنده برقرار شد."}));
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws, message) {
    const info=ws.deserializeAttachment()||{};
    if(typeof message!=="string" || message.length>2500) return;
    let payload; try{payload=JSON.parse(message);}catch{return;}
    const body=String(payload?.body||"").trim().slice(0,1000);
    if(!body) return;
    const now=Date.now(), last=await this.ctx.storage.get("last:"+info.userId)||0;
    if(now-last<700) { ws.send(JSON.stringify({type:"error",message:"کمی آهسته‌تر پیام بفرست."})); return; }
    await this.ctx.storage.put("last:"+info.userId,now);
    const id=crypto.randomUUID();
    await this.env.DB.prepare("INSERT INTO room_messages (id,room_id,user_id,body) SELECT ?,r.id,?,? FROM rooms r WHERE r.code=?").bind(id,info.userId,body,info.room).run();
    const event=JSON.stringify({type:"message",message:{id,body,sender:info.name,createdAt:new Date(now).toISOString()}});
    for(const socket of this.ctx.getWebSockets()) { try{socket.send(event);}catch{} }
  }
  async webSocketClose(ws, code, reason, wasClean) { try{ws.close(code,reason);}catch{} }
  async webSocketError(ws, error) { try{ws.close(1011,"connection error");}catch{} }
}