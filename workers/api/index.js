import { countryCodes, currencyCodes, calendarCodes, languageCodes, numberFormatCodes, numberSystemCodes } from "./data/catalog-validation.js";
import { mergeBusinessRecordPayload } from "./business-sync.js";
import { handlePasswordLogin } from "./auth-login.mjs";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
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
async function storeStoryMedia(env,id,file) {
  if(!env.STORY_MEDIA) throw new Error("ذخیره‌ساز فایل استوری پیکربندی نشده است.");
  await env.STORY_MEDIA.put("story:"+id,await file.arrayBuffer(),{metadata:{contentType:file.type}});
}
async function readStoryMedia(env,id) {
  if(!env.STORY_MEDIA) throw new Error("ذخیره‌ساز فایل استوری پیکربندی نشده است.");
  const {value,metadata}=await env.STORY_MEDIA.getWithMetadata("story:"+id,"arrayBuffer");
  return {value,contentType:metadata?.contentType||"application/octet-stream"};
}
async function deleteStoryMedia(env,id) {
  if(env.STORY_MEDIA) await env.STORY_MEDIA.delete("story:"+id);
}
async function cleanupExpiredStories(env,db) {
  const expired=await db.prepare("SELECT id FROM stories WHERE expires_at<=datetime('now') LIMIT 500").all();
  for(const row of expired.results||[]) await deleteStoryMedia(env,row.id);
  await db.prepare("DELETE FROM stories WHERE expires_at<=datetime('now')").run();
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
  return await db.prepare("SELECT u.id,u.email,u.password_hash,u.password_salt,u.display_name,u.xp,u.games_played,u.role,u.username,u.avatar_url,u.bio,u.first_name,u.last_name,u.country,u.currency,u.calendar,u.number_format,u.number_system,u.date_format,u.text_direction,u.week_start,u.language,u.account_type,u.app_lock_type,u.app_lock_hash,u.app_lock_timeout,u.lock_failed_attempts,u.onboarding_completed FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?").bind(tokenHash,Date.now()).first();
}

const BUSINESS_ROLE_PERMISSIONS = {
 owner: new Set(["read","records:write","finance:write","ledger:write","team:manage","audit:read","reminders:manage","settings:write"]),
 manager: new Set(["read","records:write","finance:write","ledger:write","audit:read","reminders:manage","settings:write"]),
 accountant: new Set(["read","records:write","finance:write","ledger:write","audit:read","reminders:read"]),
 staff: new Set(["read","records:write","finance:write","audit:read","reminders:read"]),
 viewer: new Set(["read","audit:read","reminders:read"])
};
async function getBusinessAccess(db,workspaceId,userId) {
 const row=await db.prepare("SELECT w.id,w.owner_id AS ownerId,w.name,w.currency,m.role AS memberRole,m.status AS memberStatus FROM workspaces w LEFT JOIN workspace_members m ON m.workspace_id=w.id AND m.user_id=? WHERE w.id=? AND w.type='business'").bind(userId,workspaceId).first();
 if(!row) return null;
 if(row.ownerId===userId) return {...row,role:"owner"};
 if(row.memberStatus!=="active" || !row.memberRole) return null;
 return {...row,role:row.memberRole};
}
function businessCan(access,permission) {
 return Boolean(access && BUSINESS_ROLE_PERMISSIONS[access.role]?.has(permission));
}
async function writeBusinessAudit(db,workspaceId,actorId,action,entityType,entityId=null,details=null) {
 await db.prepare("INSERT INTO business_audit_log (id,workspace_id,actor_user_id,action,entity_type,entity_id,details_json) VALUES (?,?,?,?,?,?,?)")
  .bind(crypto.randomUUID(),workspaceId,actorId,action,entityType,entityId,details?JSON.stringify(details).slice(0,12000):null).run();
}
async function syncBusinessDueReminders(db,workspaceId,ownerId,actorId,records) {
 const statements=[];
 for(const kind of ["cheques","loans","invoices","payables"]) {
  statements.push(db.prepare("UPDATE business_reminders SET status='cancelled' WHERE workspace_id=? AND reminder_type=? AND status='pending'").bind(workspaceId,kind));
  const rows=Array.isArray(records[kind])?records[kind].slice(0,300):[];
  for(const row of rows) {
   const baseId=String(row?.id||"").slice(0,80),baseDate=String(row?.dueDate||row?.nextDueDate||"");
   if(!baseId||!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)||["cashed","bounced","paid","cancelled"].includes(String(row?.status||"").toLowerCase())) continue;
   const count=kind==="loans"?Math.max(1,Math.min(120,Number(row?.count||1))):1;
   const paidCount=kind==="loans"?Math.max(0,Math.min(count,Number(row?.paidCount||0))):0;
   const days=Math.max(0,Math.min(90,Number(row?.reminder??1)||0));
   const base=new Date(baseDate+"T09:00:00Z");
   if(!Number.isFinite(base.getTime())) continue;
   for(let index=paidCount;index<count;index++) {
    const first=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+index,1,9,0,0));
    const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
    const dueAt=Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(base.getUTCDate(),lastDay),9,0,0);
    const refId=kind==="loans"?baseId+"#"+(index+1):baseId;
    const title=kind==="cheques"?"سررسید چک: "+String(row?.name||row?.number||"بدون عنوان").slice(0,100):kind==="loans"?"سررسید قسط "+(index+1)+" از "+count+": "+String(row?.name||"وام").slice(0,100):kind==="invoices"?"سررسید فاکتور: "+String(row?.number||row?.customer||"فاکتور").slice(0,100):"سررسید پرداختنی: "+String(row?.supplier||row?.name||"بدهی").slice(0,100);
    const remindAt=dueAt-days*86400000;
    statements.push(db.prepare("INSERT INTO business_reminders (id,workspace_id,owner_id,reminder_type,reference_id,title,due_at,remind_at,status,created_by) VALUES (?,?,?,?,?,?,?,?, 'pending',?) ON CONFLICT(workspace_id,reminder_type,reference_id) DO UPDATE SET title=excluded.title,due_at=excluded.due_at,remind_at=excluded.remind_at,status=CASE WHEN business_reminders.status='sent' AND business_reminders.due_at=excluded.due_at THEN 'sent' ELSE 'pending' END")
     .bind(crypto.randomUUID(),workspaceId,ownerId,kind,refId,title,dueAt,remindAt,actorId));
   }
  }
 }
 for(let i=0;i<statements.length;i+=80) await db.batch(statements.slice(i,i+80));
}
async function deliverBusinessReminders(env,db) {
 const due=await db.prepare("SELECT r.id,r.workspace_id AS workspaceId,r.owner_id AS ownerId,r.title,r.due_at AS dueAt,r.reminder_type AS reminderType,w.name AS workspaceName FROM business_reminders r JOIN workspaces w ON w.id=r.workspace_id WHERE r.status='pending' AND r.remind_at<=? ORDER BY r.remind_at LIMIT 100").bind(Date.now()).all();
 let sent=0;
 for(const row of due.results||[]) {
  try {
   const dueDate=new Date(Number(row.dueAt)).toLocaleDateString("fa-IR");
   const body="فضا: "+row.workspaceName+" · تاریخ سررسید: "+dueDate+" · لطفاً وضعیت این مورد را بررسی کنید.";
   const recipients=await db.prepare("SELECT user_id AS userId FROM workspace_members WHERE workspace_id=? AND status='active' UNION SELECT owner_id AS userId FROM workspaces WHERE id=?").bind(row.workspaceId,row.workspaceId).all();
   const notices=(recipients.results||[]).map(member=>db.prepare("INSERT OR IGNORE INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind("business-reminder:"+row.id+":"+member.userId,member.userId,"business_reminder",row.title,body));
   for(let i=0;i<notices.length;i+=80) await db.batch(notices.slice(i,i+80));
   if(hasMailProvider(env)) {
    try {
     const owner=await db.prepare("SELECT email FROM users WHERE id=?").bind(row.ownerId).first();
     if(owner?.email) await sendMail(env,owner.email,"یادآوری سررسید کسب‌وکار NOVYRA",renderNovyraEmail({eyebrow:"BUSINESS REMINDER",title:row.title,intro:"یک موعد مالی در فضای کسب‌وکار شما نزدیک یا سررسید شده است.",actionLabel:"ورود به فضای کسب‌وکار",actionUrl:(env.APP_URL||"https://novyra.pages.dev")+"/business",notice:body,footerNote:"این یادآوری بر اساس اطلاعات ثبت‌شده در فضای کسب‌وکار ارسال شده است."}));
    } catch(error) { console.error("business-reminder-email",row.id,error); }
   }
   await db.prepare("UPDATE business_reminders SET status='sent',notified_at=? WHERE id=? AND status='pending'").bind(Date.now(),row.id).run();
   sent++;
  } catch(error) { console.error("business-reminder-delivery",row.id,error); }
 }
 return {sent};
}
function cleanName(value) { return String(value || "").trim().replace(/[<>]/g, "").slice(0, 32); }
function cleanEmail(value) { return String(value ?? "").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, "").toLowerCase().slice(0, 254); }

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;
  const form = new URLSearchParams({secret: env.TURNSTILE_SECRET_KEY, response: String(token)});
  const ip = request.headers.get("CF-Connecting-IP"); if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {method:"POST", body:form});
  if (!response.ok) return false;
  const result = await response.json(); return result.success === true;
}
async function hitAuthLimit(db, key, max = 6, windowMs = 600000) {
  const now=Date.now(),cutoff=now-windowMs;
  const row=await db.prepare("INSERT INTO auth_rate_limits(rate_key,window_started_at,request_count) VALUES(?,?,1) ON CONFLICT(rate_key) DO UPDATE SET window_started_at=CASE WHEN auth_rate_limits.window_started_at<? THEN ? ELSE auth_rate_limits.window_started_at END,request_count=CASE WHEN auth_rate_limits.window_started_at<? THEN 1 ELSE auth_rate_limits.request_count+1 END RETURNING request_count").bind(key,now,cutoff,now,cutoff).first();
  return Number(row?.request_count||0)<=max;
}
async function createSignupCode(db,userId) {
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0"),now=Date.now();
  await db.prepare("UPDATE signup_verification_codes SET used_at=? WHERE user_id=? AND used_at IS NULL").bind(now,userId).run();
  await db.prepare("INSERT INTO signup_verification_codes(id,user_id,code_hash,expires_at,attempts,sent_at) VALUES(?,?,?,?,0,?)").bind(crypto.randomUUID(),userId,await digest(userId+":"+code),now+600000,now).run();
  return code;
}

const PROFILE_DEFAULTS = {
  first_name: "", last_name: "", country: "US", currency: "USD",
  calendar: "gregory", number_format: "1,234.56", number_system: "latn",
  date_format: "YYYY-MM-DD", text_direction: "ltr", week_start: "monday",
  language: "en", account_type: "personal", app_lock_type: "none",
  app_lock_hash: null, app_lock_timeout: 300
};
const PROFILE_ENUMS = {
  week_start: new Set(["monday","sunday","saturday"]),
  account_type: new Set(["personal","business"]),
  app_lock_type: new Set(["none","pin","pattern","biometric"])
};
function normalizeProfile(input = {}, current = PROFILE_DEFAULTS) {
  const pick = (snake, camel) => Object.prototype.hasOwnProperty.call(input, snake)
    ? input[snake] : Object.prototype.hasOwnProperty.call(input, camel) ? input[camel] : current[snake];
  const first_name = String(pick("first_name","firstName") ?? "").trim().replace(/[<>]/g,"");
  const last_name = String(pick("last_name","lastName") ?? "").trim().replace(/[<>]/g,"");
  const country = String(pick("country","country") ?? "").trim().toUpperCase();
  const currency = String(pick("currency","currency") ?? "").trim().toUpperCase();
  const calendar = String(pick("calendar","calendar") ?? "").trim().toLowerCase();
  const number_format = String(pick("number_format","numberFormat") ?? "").trim();
  const week_start = String(pick("week_start","weekStart") ?? "").trim().toLowerCase();
  const language = String(pick("language","language") ?? "").trim();
  const number_system = String(input.number_system ?? input.numberSystem ?? input.digits ?? current.number_system ?? "latn").trim().toLowerCase();
  const date_format = String(input.date_format ?? input.dateFormat ?? current.date_format ?? "YYYY-MM-DD").trim();
  const text_direction = new Set(["ar","fa","ckb","he","ur","ps","sd","ug","yi"]).has(language) ? "rtl" : "ltr";
  const account_type = String(pick("account_type","accountType") ?? "").trim().toLowerCase();
  const app_lock_type = String(pick("app_lock_type","appLockType") ?? "").trim().toLowerCase();
  const rawHash = pick("app_lock_hash","appLockHash");
  const app_lock_hash = rawHash === null || rawHash === "" ? null : String(rawHash);
  const rawTimeout = pick("app_lock_timeout","appLockTimeout");
  const app_lock_timeout = Number(rawTimeout);
  const hasFirstName = Object.prototype.hasOwnProperty.call(input,"first_name") || Object.prototype.hasOwnProperty.call(input,"firstName");
  const hasLastName = Object.prototype.hasOwnProperty.call(input,"last_name") || Object.prototype.hasOwnProperty.call(input,"lastName");
  if ((hasFirstName && (!first_name || first_name.length > 60 || /[\u0000-\u001F\u007F]/.test(first_name))) ||
      (hasLastName && (!last_name || last_name.length > 60 || /[\u0000-\u001F\u007F]/.test(last_name)))) {
    return { error: "نام و نام خانوادگی باید بین ۱ تا ۶۰ نویسه معتبر باشند." };
  }
  if (!countryCodes.has(country)) return { error: "کشور انتخاب‌شده در فهرست ISO 3166-1 وجود ندارد." };
  if (!currencyCodes.has(currency)) return { error: "واحد پول انتخاب‌شده در فهرست ارزهای پشتیبانی‌شده وجود ندارد." };
  if (!calendarCodes.has(calendar)) return { error: "تقویم انتخاب‌شده پشتیبانی نمی‌شود." };
  if (!numberFormatCodes.has(number_format)) return { error: "قالب نمایش اعداد با کشور انتخاب‌شده سازگار نیست." };
  if (!numberSystemCodes.has(number_system)) return { error: "سیستم ارقام انتخاب‌شده پشتیبانی نمی‌شود." };
  if (!new Set(["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","YYYY/MM/DD","DD.MM.YYYY","DD-MM-YYYY","YYYY.MM.DD"]).has(date_format)) return { error: "قالب تاریخ انتخاب‌شده معتبر نیست." };
  if (!PROFILE_ENUMS.week_start.has(week_start)) return { error: "روز شروع هفته معتبر نیست." };
  if (!/^[a-z]{2,3}$/.test(language) || !languageCodes.has(language)) return { error: "زبان انتخاب‌شده در فهرست ISO 639-1/639-3 وجود ندارد." };
  if (!PROFILE_ENUMS.account_type.has(account_type)) return { error: "نوع حساب باید شخصی یا تجاری باشد." };
  if (!PROFILE_ENUMS.app_lock_type.has(app_lock_type)) return { error: "نوع قفل برنامه معتبر نیست." };
  if (app_lock_hash !== null && !/^[a-f0-9]{64}$/i.test(app_lock_hash)) return { error: "مقدار رمز قفل معتبر نیست." };
  if (!Number.isInteger(app_lock_timeout) || app_lock_timeout < 0 || app_lock_timeout > 86400) return { error: "زمان قفل خودکار باید بین صفر تا ۸۶۴۰۰ ثانیه باشد." };
  if (app_lock_type !== "none" && app_lock_type !== "biometric" && !app_lock_hash) return { error: "برای فعال‌کردن قفل، ابتدا باید مقدار رمز قفل ثبت شود." };
  return { value: { first_name,last_name,country,currency,calendar,number_format,number_system,date_format,text_direction,week_start,language,account_type,app_lock_type,app_lock_hash,app_lock_timeout } };
}
function profileComplete(profile) {
  return Boolean(String(profile.first_name||"").trim() && String(profile.last_name||"").trim()
    && countryCodes.has(String(profile.country||"").toUpperCase())
    && ["personal","business"].includes(profile.account_type));
}
function publicProfile(row) {
  return {
    firstName: row.first_name || "", lastName: row.last_name || "",
    country: row.country || "US", currency: row.currency || "USD",
    calendar: row.calendar || "gregory", numberFormat: row.number_format || "1,234.56",
    numberSystem: row.number_system || "latn", dateFormat: row.date_format || "YYYY-MM-DD",
    direction: row.text_direction || "ltr", weekStart: row.week_start || "monday", language: row.language || "en",
    accountType: row.account_type || "personal", appLockType: row.app_lock_type || "none",
    appLockTimeout: Number(row.app_lock_timeout ?? 300),
    onboardingCompleted: Number(row.onboarding_completed || 0) === 1
  };
}

const isoDate = value => {
  const raw=String(value||"");
  const date=new Date(raw.includes("T")?raw:raw.replace(" ","T")+"Z");
  return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
};
function shapeSocialPost(row) {
  return {
    id:row.id, body:row.body||"", mediaUrl:row.mediaUrl||null, mediaType:row.mediaType||null, thumbnailUrl:row.thumbnailUrl||null,
    createdAt:isoDate(row.createdAt), authorId:row.authorId, authorName:row.authorName||"NOVYRA",
    likeCount:Number(row.likeCount||0), commentCount:Number(row.commentCount||0),
    likedByMe:Boolean(row.likedByMe),
    likedByNames:(()=>{try{return Array.isArray(row.likedByNames)?row.likedByNames:JSON.parse(row.likedByNames||"[]");}catch{return [];}})(),
    viewCount:Number(row.viewCount||0),
    repostCount:Number(row.repostCount||0), shareCount:Number(row.shareCount||0),
    saveCount:Number(row.saveCount||0), savedByMe:Boolean(row.savedByMe)
  };
}

export default {
 async scheduled(controller, env, ctx) { ctx.waitUntil(Promise.all([cleanupExpiredStories(env,env.DB),deliverBusinessReminders(env,env.DB)])); },
 async fetch(request, env) {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) } });
  const headers = { ...corsHeaders, ...(origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin } : {}) };
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const db = env.DB;
  const requestId = crypto.randomUUID();
  try {
   if ((path === "/api/health" || path === "/health") && request.method === "GET") {
    const requiredTables = ["users","sessions","auth_rate_limits","signup_verification_codes"];
    const bindings = { DB: Boolean(env.DB), ROOM_HUB: Boolean(env.ROOM_HUB), STORY_MEDIA_KV: Boolean(env.STORY_MEDIA), R2: Boolean(env.R2), AI: Boolean(env.AI) };
    const secrets = {
      GOOGLE_CLIENT_ID: Boolean(env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: Boolean(env.GOOGLE_CLIENT_SECRET),
      TURNSTILE_SECRET_KEY: Boolean(env.TURNSTILE_SECRET_KEY),
      RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
      EMAIL_BRIDGE_URL: Boolean(env.EMAIL_BRIDGE_URL),
      EMAIL_BRIDGE_SECRET: Boolean(env.EMAIL_BRIDGE_SECRET),
      ADMIN_EMAIL: Boolean(env.ADMIN_EMAIL)
    };
    const configuration = {
      APP_URL: Boolean(env.APP_URL),
      GOOGLE_REDIRECT_URI: Boolean(env.GOOGLE_REDIRECT_URI),
      WEBAUTHN_ORIGIN: Boolean(env.WEBAUTHN_ORIGIN),
      EMAIL_FROM: Boolean(env.EMAIL_FROM),
      REQUIRE_EMAIL_VERIFICATION: env.REQUIRE_EMAIL_VERIFICATION === "true" || env.REQUIRE_EMAIL_VERIFICATION === "false"
    };
    let tables = Object.fromEntries(requiredTables.map(name => [name, false]));
    const expectedColumns = {
      users: ["id","email","password_hash","password_salt","verified_at","display_name","xp","games_played","role"],
      sessions: ["token_hash","user_id","expires_at"],
      auth_rate_limits: ["rate_key","window_started_at","request_count"],
      signup_verification_codes: ["id","user_id","code_hash","expires_at","attempts","sent_at","used_at"]
    };
    let columns = Object.fromEntries(Object.keys(expectedColumns).map(name => [name, false]));
    let databaseOk = false;
    if (env.DB) {
      try {
        const rows = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?,?,?)").bind(...requiredTables).all();
        for (const row of rows.results || []) tables[row.name] = true;
        for (const [table, expected] of Object.entries(expectedColumns)) {
          if (!tables[table]) continue;
          const info = await env.DB.prepare("PRAGMA table_info(" + table + ")").all();
          const present = new Set((info.results || []).map(column => column.name));
          columns[table] = expected.every(name => present.has(name));
        }
        databaseOk = requiredTables.every(name => tables[name] && columns[name]);
      } catch (error) {
        console.error("novyra-health-d1-check", { requestId, errorName: String(error?.name || "Error"), message: String(error?.message || "D1 check failed").slice(0,180) });
      }
    }
    return json({ ok: Boolean(env.DB) && databaseOk, service: "novyra-api", database: databaseOk ? "connected" : "unavailable", region: "EU", requestId, bindings, secrets, configuration, tables, columns, databaseOk });
   }
   if(path==="/auth/email-check" && request.method==="POST"){
    const body=await readBody(request),email=cleanEmail(body?.email);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("Enter a valid email.");
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"email-check:"+ip,8,600000))return fail("Too many checks. Try again later.",429);
    if(!await verifyTurnstile(body?.turnstileToken,request,env))return fail("Complete the security check.",403);
    const found=await db.prepare("SELECT auth_provider FROM users WHERE email=? LIMIT 1").bind(email).first();
    return json({exists:Boolean(found),provider:found?.auth_provider==="google"?"google":found?"password":null});
   }
   if(path==="/auth/verify-code" && request.method==="POST"){
    const body=await readBody(request),email=cleanEmail(body?.email),code=String(body?.code||"").replace(/\\D/g,"");
    if(!/^\\d{6}$/.test(code))return fail("Enter the 6-digit code.");
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"verify-code:"+ip,10,600000))return fail("Too many attempts.",429);
    const user=await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if(!user)return fail("The code is invalid or expired.",410);
    const row=await db.prepare("SELECT id,code_hash,expires_at,attempts FROM signup_verification_codes WHERE user_id=? AND used_at IS NULL ORDER BY sent_at DESC LIMIT 1").bind(user.id).first();
    if(!row||Number(row.expires_at)<=Date.now()||Number(row.attempts)>=5)return fail("The code is invalid or expired.",410);
    if(await digest(user.id+":"+code)!==row.code_hash){await db.prepare("UPDATE signup_verification_codes SET attempts=attempts+1 WHERE id=?").bind(row.id).run();return fail("The code is incorrect.");}
    await db.batch([db.prepare("UPDATE signup_verification_codes SET used_at=? WHERE id=?").bind(Date.now(),row.id),db.prepare("UPDATE users SET verified_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id)]);
    const session=await createSession(db,user.id);
    return json({token:session.token,expiresAt:session.expiresAt,user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played,role:user.role,profile:publicProfile(user)}});
   }
   if(path==="/auth/resend-code" && request.method==="POST"){
    const body=await readBody(request),email=cleanEmail(body?.email),ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"resend-code:"+ip,4,900000))return fail("Resend limit reached.",429);
    const user=await db.prepare("SELECT id,email,verified_at FROM users WHERE email=?").bind(email).first();
    if(!user||user.verified_at)return json({ok:true});
    const previous=await db.prepare("SELECT sent_at FROM signup_verification_codes WHERE user_id=? ORDER BY sent_at DESC LIMIT 1").bind(user.id).first();
    if(previous&&Date.now()-Number(previous.sent_at)<60000)return fail("Wait before requesting another code.",429);
    if(!hasMailProvider(env))return fail("Email delivery is not configured.",503);
    const code=await createSignupCode(db,user.id);
    await sendMail(env,email,"Your NOVYRA verification code",renderNovyraEmail({eyebrow:"ACCOUNT VERIFICATION",title:"Your verification code",intro:"Enter this 6-digit code in Novyra to activate your account.",actionLabel:code,actionUrl:env.APP_URL||"https://novyra.pages.dev",notice:"This code expires in 10 minutes. Maximum 5 attempts.",footerNote:"If you did not create this account, ignore this email."}));
    return json({ok:true,cooldownSeconds:60});
   }


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
    let user=await db.prepare("SELECT id,email,display_name,xp,games_played,role,onboarding_completed FROM users WHERE email=?").bind(email).first();
    const isNewGoogleUser=!user;
    if(!user) {
      const id=crypto.randomUUID(), salt=randomToken(16), hash=await digest(randomToken(48));
      const role=email===cleanEmail(env.ADMIN_EMAIL)?"admin":"user";
      await db.prepare("INSERT INTO users (id,email,display_name,password_hash,password_salt,role,verified_at,auth_provider) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,'google')").bind(id,email,displayName,hash,salt,role).run();
      user={id,email,display_name:displayName,xp:0,games_played:0,role,onboarding_completed:0};
    } else {
      await db.prepare("UPDATE users SET verified_at=COALESCE(verified_at,CURRENT_TIMESTAMP),auth_provider='google' WHERE id=?").bind(user.id).run();
    }
    const requiresGoogleOnboarding=isNewGoogleUser || Number(user.onboarding_completed||0)===0;
    const session=await createSession(db,user.id);
    const target=env.APP_URL || "https://novyra.pages.dev/";
    return new Response(null,{status:302,headers:{"Location":`${target}#google_token=${encodeURIComponent(session.token)}${requiresGoogleOnboarding?"&google_new=1":""}`,"Set-Cookie":"px_google_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth/google/callback; Max-Age=0",...corsHeaders}});
   }

   if (path === "/auth/password-salt" && request.method === "GET") {
    // Return the account's PBKDF2 salt without disclosing account existence.
    // Unknown addresses receive a fixed dummy salt and still get the same login response.
    const email=cleanEmail(url.searchParams.get("email"));
    if(!/^\\S+@\\S+\\.\\S+$/.test(email)) return fail("Enter a valid email address.",400);
    const account=await db.prepare("SELECT password_salt FROM users WHERE email=? LIMIT 1").bind(email).first();
    return json({salt:String(account?.password_salt||"00000000000000000000000000000000")});
   }

   if(path==="/auth/webauthn/register/options" && request.method==="POST") {
    const body=await readBody(request),email=cleanEmail(body?.email);
    if(!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"webauthn-options:"+ip,5,600000)) return fail("درخواست‌های زیاد؛ کمی بعد دوباره تلاش کن.",429);
    const existing=await db.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(email).first();
    if(existing) return fail("برای این ایمیل حسابی وجود دارد.",409);
    const appOrigin=String(env.WEBAUTHN_ORIGIN||env.APP_URL||"").trim();
    if(!appOrigin) return fail("تنظیمات دامنه احراز هویت زیستی کامل نیست.",503);
    const rpID=new URL(appOrigin).hostname;
    const options=await generateRegistrationOptions({
      rpName:"NOVYRA",
      rpID,
      userName:email,
      userDisplayName:email,
      userID:crypto.getRandomValues(new Uint8Array(32)),
      attestationType:"none",
      authenticatorSelection:{authenticatorAttachment:"platform",residentKey:"preferred",userVerification:"required"},
      supportedAlgorithmIDs:[-7,-257],
      timeout:60000
    });
    await db.prepare("INSERT INTO webauthn_pending_challenges(email,challenge,expires_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET challenge=excluded.challenge,expires_at=excluded.expires_at")
      .bind(email,options.challenge,Date.now()+300000).run();
    return json(options);
   }

   if(path==="/auth/webauthn/authenticate/options" && request.method==="POST") {
    const body=await readBody(request),email=cleanEmail(body?.email);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"webauthn-auth-options:"+ip,8,600000)) return fail("درخواست‌های زیاد؛ کمی بعد دوباره تلاش کن.",429);
    const user=await db.prepare("SELECT id,email,verified_at FROM users WHERE email=?").bind(email).first();
    if(!user || !user.verified_at) return fail("برای این ایمیل ورود زیستی در دسترس نیست.",401);
    const credentials=await db.prepare("SELECT credential_id,transports FROM webauthn_credentials WHERE user_id=?").bind(user.id).all();
    if(!credentials.results?.length) return fail("برای این حساب کلید زیستی ثبت نشده است.",404);
    const appOrigin=String(env.WEBAUTHN_ORIGIN||env.APP_URL||"").trim();
    if(!appOrigin) return fail("تنظیمات دامنه احراز هویت زیستی کامل نیست.",503);
    const rpID=new URL(appOrigin).hostname;
    const options=await generateAuthenticationOptions({
      rpID,
      allowCredentials:(credentials.results||[]).map(row=>({id:row.credential_id,transports:JSON.parse(row.transports||"[]")})),
      userVerification:"required",
      timeout:60000
    });
    await db.prepare("INSERT INTO webauthn_pending_challenges(email,challenge,expires_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET challenge=excluded.challenge,expires_at=excluded.expires_at")
      .bind(email,options.challenge,Date.now()+300000).run();
    return json(options);
   }
   if(path==="/auth/webauthn/authenticate/verify" && request.method==="POST") {
    const body=await readBody(request),email=cleanEmail(body?.email),response=body?.credential;
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"webauthn-auth-verify:"+ip,8,600000)) return fail("تلاش‌های زیاد؛ کمی بعد دوباره تلاش کن.",429);
    const user=await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if(!user || !user.verified_at) return fail("احراز هویت زیستی ناموفق بود.",401);
    const pending=await db.prepare("SELECT challenge,expires_at FROM webauthn_pending_challenges WHERE email=?").bind(email).first();
    if(!pending || Number(pending.expires_at)<=Date.now()) return fail("درخواست احراز هویت منقضی شده است؛ دوباره تلاش کن.",410);
    const credentialId=String(response?.id||"");
    const credential=await db.prepare("SELECT credential_id,public_key,counter,transports FROM webauthn_credentials WHERE user_id=? AND credential_id=?").bind(user.id,credentialId).first();
    if(!credential) return fail("کلید زیستی برای این حساب پیدا نشد.",401);
    const appOrigin=String(env.WEBAUTHN_ORIGIN||env.APP_URL||"").trim();
    if(!appOrigin) return fail("تنظیمات دامنه احراز هویت زیستی کامل نیست.",503);
    const consumed=await db.prepare("DELETE FROM webauthn_pending_challenges WHERE email=? AND challenge=? AND expires_at>? RETURNING email").bind(email,pending.challenge,Date.now()).first();
    if(!consumed) return fail("درخواست احراز هویت قبلاً استفاده شده یا منقضی شده است؛ دوباره تلاش کن.",410);
    const publicKeyHex=String(credential.public_key||"");
    if(!/^(?:[a-f0-9]{2})+$/i.test(publicKeyHex)) return fail("کلید ثبت‌شده معتبر نیست.",500);
    const publicKey=Uint8Array.from(publicKeyHex.match(/.{2}/g)||[],byte=>parseInt(byte,16));
    const verification=await verifyAuthenticationResponse({
      response,
      expectedChallenge:pending.challenge,
      expectedOrigin:appOrigin,
      expectedRPID:new URL(appOrigin).hostname,
      credential:{id:credential.credential_id,publicKey,counter:Number(credential.counter||0),transports:JSON.parse(credential.transports||"[]")},
      requireUserVerification:true
    });
    if(!verification.verified) return fail("اثر انگشت یا تشخیص چهره تأیید نشد.",401);
    await db.batch([
      db.prepare("UPDATE webauthn_credentials SET counter=? WHERE credential_id=? AND user_id=?").bind(verification.authenticationInfo.newCounter,credential.credential_id,user.id)
    ]);
    const session=await createSession(db,user.id);
    return json({token:session.token,expiresAt:session.expiresAt,user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played,role:user.role,profile:publicProfile(user)}});
   }

   if (path === "/auth/register" && request.method === "POST") {
    const body = await readBody(request);
    const email = cleanEmail(body?.email ?? body?.emailAddress);
    const legacyName = cleanName(body?.name ?? body?.displayName);
    const profileResult = normalizeProfile(body || {});
    if (profileResult.error) return fail(profileResult.error);
    const profile = profileResult.value;
    if (!profile.first_name && legacyName) profile.first_name = legacyName;
    const displayName = [profile.first_name,profile.last_name].filter(Boolean).join(" ") || legacyName;
    const salt=String(body?.salt ?? body?.passwordSalt ?? body?.password_salt ?? "");
    const suppliedHash=String(body?.passwordHash ?? body?.password_hash ?? body?.hash ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    if (displayName.length < 2) return fail("نام نمایشی باید حداقل ۲ حرف باشد.");
    if (!salt || salt.length < 16 || salt.length > 128) return fail("داده امنیتی نمک رمز از صفحه دریافت نشد؛ صفحه را تازه‌سازی کن.");
    if (!/^[a-f0-9]{64}$/i.test(suppliedHash)) return fail("خروجی رمز عبور از صفحه ناقص است؛ صفحه را تازه‌سازی کن.");
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";
    if(!await hitAuthLimit(db,"register:"+ip,5,3600000))return fail("Too many registration attempts. Try again later.",429);
    if(!await verifyTurnstile(body?.turnstileToken,request,env))return fail("Complete the security check.",403);
    let verifiedBiometric=null;
    if(profile.app_lock_type==="biometric") {
      if(!body?.webauthnRegistration) return fail("ثبت اثر انگشت یا تشخیص چهره کامل نشده است.",400);
      const pending=await db.prepare("SELECT challenge,expires_at FROM webauthn_pending_challenges WHERE email=?").bind(email).first();
      if(!pending || Number(pending.expires_at)<=Date.now()) return fail("درخواست ثبت اثر انگشت منقضی شده است؛ دوباره تلاش کن.",410);
      const appOrigin=String(env.WEBAUTHN_ORIGIN||env.APP_URL||"").trim();
      if(!appOrigin) return fail("تنظیمات دامنه احراز هویت زیستی کامل نیست.",503);
      const rpID=new URL(appOrigin).hostname;
      const consumed=await db.prepare("DELETE FROM webauthn_pending_challenges WHERE email=? AND challenge=? AND expires_at>? RETURNING email").bind(email,pending.challenge,Date.now()).first();
      if(!consumed) return fail("درخواست ثبت اثر انگشت قبلاً استفاده شده یا منقضی شده است؛ دوباره تلاش کن.",410);
      const verification=await verifyRegistrationResponse({
        response:body.webauthnRegistration,
        expectedChallenge:pending.challenge,
        expectedOrigin:appOrigin,
        expectedRPID:rpID,
        requireUserVerification:true
      });
      if(!verification.verified || !verification.registrationInfo) return fail("ثبت امن اثر انگشت یا تشخیص چهره تأیید نشد.",400);
      verifiedBiometric=verification.registrationInfo;
    }
    const id = crypto.randomUUID(), hash = suppliedHash;
    try { await db.prepare("INSERT INTO users (id,email,display_name,password_hash,password_salt,role,verified_at,first_name,last_name,country,currency,calendar,number_format,number_system,date_format,text_direction,week_start,language,account_type,app_lock_type,app_lock_hash,app_lock_timeout,lock_failed_attempts,onboarding_completed) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)").bind(id,email,displayName,hash,salt,email===cleanEmail(env.ADMIN_EMAIL)?"admin":"user",profile.first_name,profile.last_name,profile.country,profile.currency,profile.calendar,profile.number_format,profile.number_system,profile.date_format,profile.text_direction,profile.week_start,profile.language,profile.account_type,profile.app_lock_type,profile.app_lock_hash,profile.app_lock_timeout,profileComplete(profile)?1:0).run(); }
    catch (insertError) {
      const existing=await db.prepare("SELECT id FROM users WHERE email=? LIMIT 1").bind(email).first();
      if(existing) return fail("برای این ایمیل حسابی وجود دارد. از ورود یا ورود با Google استفاده کن.",409);
      console.error("project-x-register-insert-error",insertError);
      return fail("ساخت حساب در پایگاه‌داده ناموفق بود؛ مشکل از ایمیل تکراری نیست. لطفاً بعداً دوباره تلاش کن.",500);
    }
    if(verifiedBiometric) {
      const credential=verifiedBiometric.credential;
      const credentialId=String(credential.id);
      const publicKey=Array.from(credential.publicKey,byte=>byte.toString(16).padStart(2,"0")).join("");
      await db.prepare("INSERT INTO webauthn_credentials (credential_id,user_id,public_key,counter,transports,device_type,backed_up) VALUES (?,?,?,?,?,?,?)")
        .bind(credentialId,id,publicKey,Number(credential.counter||0),JSON.stringify(credential.transports||[]),verifiedBiometric.credentialDeviceType||"singleDevice",verifiedBiometric.credentialBackedUp?1:0).run();
    }
    const initialWorkspaceId=crypto.randomUUID();
    const initialWorkspaceType=profile.account_type;
    const initialWorkspaceName=initialWorkspaceType==="business"?String(body?.companyName||"").trim().replace(/[<>]/g,"").slice(0,100)||"Business":"Personal";
    await db.prepare("INSERT INTO workspaces (id,owner_id,type,name,currency) VALUES (?,?,?,?,?)").bind(initialWorkspaceId,id,initialWorkspaceType,initialWorkspaceName,profile.currency).run();
    const createdUser=await db.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
    const session=await createSession(db,id);
    return json({token:session.token,expiresAt:session.expiresAt,user:{id,email,displayName,xp:0,gamesPlayed:0,role:createdUser?.role||"user",profile:createdUser?publicProfile(createdUser):null}});
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
    const ip=request.headers.get("CF-Connecting-IP")||"unknown";if(!await hitAuthLimit(db,"forgot-password:"+ip,5,3600000))return fail("Too many reset requests. Try again later.",429);
    if(!hasMailProvider(env)) return fail("سرویس ارسال ایمیل هنوز تنظیم نشده است.",503);
    const body=await readBody(request), email=cleanEmail(body?.email);
    if(!/^\S+@\S+\.\S+$/.test(email)) return fail("ایمیل معتبر وارد کن.");
    const target=await db.prepare("SELECT id,email FROM users WHERE email=?").bind(email).first();
    if(target) {
      const pending=await db.prepare("SELECT COUNT(*) AS total FROM email_tokens WHERE user_id=? AND kind='reset' AND expires_at>? AND used_at IS NULL").bind(target.id,Date.now()).first();
      if((pending?.total||0)<3) {
        const token=await issueEmailToken(db,target.id,"reset",60*60*1000);
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
    const record=await db.prepare("SELECT id,user_id FROM email_tokens WHERE token_hash=? AND kind='reset' AND expires_at>? AND used_at IS NULL").bind(tokenHash,Date.now()).first();
    if(!record) return fail("لینک بازیابی معتبر نیست یا منقضی شده است.",410);
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(suppliedHash,salt,record.user_id),
      db.prepare("UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.id),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(record.user_id)
    ]);
    return json({ok:true,message:"رمز عبور تغییر کرد؛ دوباره وارد شو."});
   }
   if (path === "/auth/login" && request.method === "POST") {
    return handlePasswordLogin({
      request, env, db, requestId,
      helpers: { cleanEmail, hitAuthLimit, passwordHash, createSession, publicProfile }
    });
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
   const storyMediaMatch=path.match(/^\/social\/stories\/([a-f0-9-]+)\/media$/i);
   if(storyMediaMatch && (request.method==="GET" || request.method==="HEAD")) {
    const story=await db.prepare("SELECT id,type FROM stories WHERE id=? AND expires_at>datetime('now')").bind(storyMediaMatch[1]).first();
    if(!story) return fail("استوری پیدا نشد یا منقضی شده است.",404);
    const media=await readStoryMedia(env,story.id);
    if(!media?.value) return fail("فایل استوری پیدا نشد یا منقضی شده است.",404);
    const bytes=new Uint8Array(media.value),size=bytes.byteLength,contentType=media.contentType||"application/octet-stream";
    const baseHeaders={...corsHeaders,"Content-Type":contentType,"Accept-Ranges":"bytes","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow","Content-Length":String(size)};
    if(request.method==="HEAD") return new Response(null,{status:200,headers:baseHeaders});
    const rangeHeader=request.headers.get("Range");
    if(story.type==="video" && rangeHeader) {
      const match=rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if(match) {
        let start,end;
        if(match[1]==="") { const suffix=Number(match[2]); if(!suffix) return new Response(null,{status:416,headers:{...baseHeaders,"Content-Range":"bytes */"+size,"Content-Length":"0"}}); start=Math.max(0,size-suffix); end=size-1; }
        else { start=Number(match[1]); end=match[2]===""?size-1:Number(match[2]); }
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size) return new Response(null,{status:416,headers:{...baseHeaders,"Content-Range":"bytes */"+size,"Content-Length":"0"}});
        end=Math.min(end,size-1);
        const chunk=bytes.slice(start,end+1);
        return new Response(chunk,{status:206,headers:{...baseHeaders,"Content-Length":String(chunk.byteLength),"Content-Range":`bytes ${start}-${end}/${size}`}});
      }
    }
    return new Response(request.method==="HEAD"?null:bytes,{status:200,headers:baseHeaders});
   }
      const user = await authenticate(request,db);
   const publicShareMediaMatch=path.match(/^\/public\/shares\/([A-Za-z0-9_-]{40,60})\/media$/);
   const publicSharePageMatch=path.match(/^\/public\/shares\/([A-Za-z0-9_-]{40,60})$/);
   if(publicShareMediaMatch && (request.method==="GET"||request.method==="HEAD")) {
    const tokenHash=await digest(publicShareMediaMatch[1]);
    const share=await db.prepare("SELECT id,media_key,content_type FROM public_shares WHERE token_hash=? AND kind='video' AND deleted_at IS NULL").bind(tokenHash).first();
    if(!share) return fail("این محتوا وجود ندارد",404);
    const stored=await env.STORY_MEDIA.get(share.media_key,"arrayBuffer");
    if(!stored) return fail("این محتوا وجود ندارد",404);
    const bytes=new Uint8Array(stored),size=bytes.byteLength;
    const baseHeaders={...corsHeaders,"Content-Type":share.content_type||"video/mp4","Accept-Ranges":"bytes","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff","Content-Length":String(size)};
    if(request.method==="HEAD") return new Response(null,{status:200,headers:baseHeaders});
    const rangeHeader=request.headers.get("Range");
    if(rangeHeader) {
      const match=rangeHeader.match(/^bytes=(\\d*)-(\\d*)$/);
      if(!match || (!match[1]&&!match[2])) return new Response(null,{status:416,headers:{...baseHeaders,"Content-Range":`bytes */${size}`,"Content-Length":"0"}});
      let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      let end=match[2]&&match[1]?Number(match[2]):match[2]&&!match[1]?size-1:size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start) return new Response(null,{status:416,headers:{...baseHeaders,"Content-Range":`bytes */${size}`,"Content-Length":"0"}});
      end=Math.min(end,size-1);
      const chunk=bytes.slice(start,end+1);
      return new Response(chunk,{status:206,headers:{...baseHeaders,"Content-Length":String(chunk.byteLength),"Content-Range":`bytes ${start}-${end}/${size}`}});
    }
    return new Response(bytes,{status:200,headers:baseHeaders});
   }
   if(publicSharePageMatch && request.method==="GET") {
    const tokenHash=await digest(publicSharePageMatch[1]);
    const share=await db.prepare("SELECT kind,content,content_type,created_at AS createdAt FROM public_shares WHERE token_hash=? AND deleted_at IS NULL").bind(tokenHash).first();
    if(!share) return fail("این محتوا وجود ندارد",404);
    return json({kind:share.kind,content:share.content||"",mediaUrl:share.kind==="video"?`/public/shares/${publicSharePageMatch[1]}/media`:null,contentType:share.content_type||null,createdAt:share.createdAt});
   }
   if (path === "/public/shares" && request.method==="POST") {
    if(!user) return fail("برای ساخت لینک وارد حساب شو.",401);
    let kind="text",content="",file=null;
    if((request.headers.get("Content-Type")||"").toLowerCase().includes("multipart/form-data")) {
      const form=await request.formData();
      const uploaded=form.get("file");
      if(uploaded instanceof File) file=uploaded;
      kind="video";
    } else {
      const body=await readBody(request);
      content=String(body?.content||"").trim();
    }
    if(file) {
      const type=String(file.type||"").toLowerCase();
      if(!["video/mp4","video/webm","video/quicktime"].includes(type)) return fail("فرمت ویدیو پشتیبانی نمی‌شود. MP4، WebM یا MOV انتخاب کن.");
      if(file.size<1||file.size>20*1024*1024) return fail("حجم ویدیو بیشتر از سقف مجاز ۲۰ مگابایت است. یک ویدیوی کوچک‌تر انتخاب کن.",413);
    } else if(!content) return fail("متن یا ویدیویی برای ساخت لینک انتخاب کن.");
    else if(content.length>20000) return fail("متن نباید بیشتر از ۲۰٬۰۰۰ نویسه باشد.",413);
    const token=randomToken(32),tokenHash=await digest(token),id=crypto.randomUUID();
    const mediaKey=file?"share:"+tokenHash:null;
    if(file) await env.STORY_MEDIA.put(mediaKey,await file.arrayBuffer(),{metadata:{contentType:file.type}});
    try {
      await db.prepare("INSERT INTO public_shares (id,token_hash,owner_id,kind,content,media_key,content_type) VALUES (?,?,?,?,?,?,?)")
        .bind(id,tokenHash,user.id,kind,file?null:content,mediaKey,file?.type||null).run();
    } catch(error) { if(mediaKey) await env.STORY_MEDIA.delete(mediaKey); throw error; }
    return json({ok:true,id,token,kind,createdAt:new Date().toISOString()},201);
   }
   if(path==="/public/shares/mine" && request.method==="GET") {
    if(!user) return fail("برای مشاهده لینک‌ها وارد حساب شو.",401);
    const rows=await db.prepare("SELECT id,kind,content,created_at AS createdAt FROM public_shares WHERE owner_id=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
    return json({shares:rows.results||[]});
   }
   const deletePublicShareMatch=path.match(/^\/public\/shares\/manage\/([a-f0-9-]+)$/i);
   if(deletePublicShareMatch && request.method==="DELETE") {
    if(!user) return fail("برای حذف لینک وارد حساب شو.",401);
    const share=await db.prepare("SELECT id,owner_id,media_key FROM public_shares WHERE id=? AND deleted_at IS NULL").bind(deletePublicShareMatch[1]).first();
    if(!share) return fail("این محتوا وجود ندارد",404);
    if(share.owner_id!==user.id) return fail("اجازه حذف این محتوا را نداری.",403);
    await db.prepare("DELETE FROM public_shares WHERE id=? AND owner_id=?").bind(share.id,user.id).run();
    if(share.media_key) await env.STORY_MEDIA.delete(share.media_key);
    return json({ok:true});
   }
   if (path.startsWith("/auth/") && path !== "/auth/register" && path !== "/auth/login") {
    if (!user) return fail("برای ادامه وارد حساب شو.",401);
    if (path === "/auth/set-password" && request.method === "POST") {
      const body=await readBody(request), salt=String(body?.salt||""), suppliedHash=String(body?.passwordHash||"");
      if(!/^(?:[A-Za-z0-9_-]{22}|[a-f0-9]{32})$/.test(salt) || !/^[a-f0-9]{64}$/i.test(suppliedHash)) return fail("اطلاعات رمز عبور معتبر نیست.");
      await db.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(suppliedHash,salt,user.id).run();
      return json({ok:true,message:"رمز عبور با موفقیت تنظیم شد."});
    }
    if (path === "/auth/me" && request.method === "GET") return json({user:{id:user.id,email:user.email,displayName:user.display_name,xp:user.xp,gamesPlayed:user.games_played,role:user.role,profile:publicProfile(user)}});
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
      const body=await readBody(request);
      if (!body || typeof body !== "object" || Array.isArray(body)) return fail("اطلاعات پروفایل معتبر نیست.");
      const current = {
        first_name:user.first_name||"", last_name:user.last_name||"", country:user.country||"US",
        currency:user.currency||"USD", calendar:user.calendar||"gregory",
        number_format:user.number_format||"1,234.56", number_system:user.number_system||"latn",
        date_format:user.date_format||"YYYY-MM-DD", text_direction:user.text_direction||"ltr",
        week_start:user.week_start||"monday", language:user.language||"en", account_type:user.account_type||"personal",
        app_lock_type:user.app_lock_type||"none", app_lock_hash:user.app_lock_hash||null,
        app_lock_timeout:Number(user.app_lock_timeout??300)
      };
      const result=normalizeProfile(body,current);
      if(result.error) return fail(result.error);
      const profile=result.value;
      const legacyName=Object.prototype.hasOwnProperty.call(body,"name")?cleanName(body.name):"";
      const displayName=[profile.first_name,profile.last_name].filter(Boolean).join(" ") || legacyName || user.display_name;
      const completed=profileComplete(profile) ? 1 : 0;
      await db.prepare("UPDATE users SET display_name=?,first_name=?,last_name=?,country=?,currency=?,calendar=?,number_format=?,number_system=?,date_format=?,text_direction=?,week_start=?,language=?,account_type=?,app_lock_type=?,app_lock_hash=?,app_lock_timeout=?,onboarding_completed=? WHERE id=?")
        .bind(displayName,profile.first_name,profile.last_name,profile.country,profile.currency,profile.calendar,profile.number_format,profile.number_system,profile.date_format,profile.text_direction,profile.week_start,profile.language,profile.account_type,profile.app_lock_type,profile.app_lock_hash,profile.app_lock_timeout,completed,user.id).run();
      return json({ok:true,name:displayName,profile:{...profile,app_lock_hash:undefined,onboardingCompleted:completed===1}});
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

   if(path==="/auth/account" && request.method==="DELETE") {
    if (!user) return fail("Please sign in again.",401);
    const body=await readBody(request)||{};
    if(String(body.confirmation||"")!=="DELETE") return fail("Type DELETE to confirm account deletion.");
    const password=String(body.password||"");
    if(!password || password.length>1024) return fail("Enter your account password.",401);
    const supplied=await passwordHash(password,String(user.password_salt||""));
    if(supplied!==String(user.password_hash||"")) return fail("The account password is incorrect.",401);
    const tables=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    const statements=[];
    for(const entry of tables.results||[]) {
      const table=String(entry.name||"");
      if(!/^[A-Za-z0-9_]+$/.test(table) || table==="users") continue;
      const columns=await db.prepare('PRAGMA table_info("'+table+'")').all();
      const userColumns=(columns.results||[]).map(column=>String(column.name||"")).filter(name=>/^(user_id|owner_id|author_id|creator_id|created_by|sender_id|recipient_id|viewer_id|follower_id|following_id|actor_id|invited_by|invited_user_id|member_id|account_id)$/.test(name));
      for(const column of userColumns) statements.push(db.prepare('DELETE FROM "'+table+'" WHERE "'+column+'"=?').bind(user.id));
    }
    const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
    if(token) statements.push(db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)));
    statements.push(db.prepare("DELETE FROM users WHERE id=?").bind(user.id));
    for(let i=0;i<statements.length;i+=90) await db.batch(statements.slice(i,i+90));
    return json({ok:true,deleted:true});
   }
   if (!user) return fail("برای استفاده از این بخش وارد حساب شو.",401);

   if(path==="/workspaces" && request.method==="GET") {
    const rows=await db.prepare("SELECT DISTINCT w.id,w.type,w.name,w.currency,w.created_at AS createdAt,CASE WHEN w.owner_id=? THEN 'owner' ELSE m.role END AS role FROM workspaces w LEFT JOIN workspace_members m ON m.workspace_id=w.id AND m.user_id=? AND m.status='active' WHERE w.owner_id=? OR m.user_id=? ORDER BY CASE w.type WHEN 'personal' THEN 0 ELSE 1 END,w.created_at").bind(user.id,user.id,user.id,user.id).all();
    return json({workspaces:rows.results||[]});
   }
   if(path==="/workspaces" && request.method==="POST") {
    const body=await readBody(request)||{};
    const type=String(body.type||"business");
    if(type!=="personal"&&type!=="business") return fail("نوع فضای کاری معتبر نیست.");
    const name=String(body.name||body.companyName||(type==="business"?"Business":"Personal")).trim().replace(/[<>]/g,"").slice(0,100);
    const currency=String(body.currency||user.currency||"USD").toUpperCase();
    if(!name) return fail("نام فضای کاری را وارد کن.");
    if(!currencyCodes.has(currency)) return fail("واحد پول معتبر نیست.");
    const existing=await db.prepare("SELECT id,type,name,currency,created_at AS createdAt FROM workspaces WHERE owner_id=? AND type=?").bind(user.id,type).first();
    if(existing) {
      if(type==="business" && body.name && existing.name!==name) {
        await db.prepare("UPDATE workspaces SET name=?,currency=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?").bind(name,currency,existing.id,user.id).run();
        return json({workspace:{...existing,name,currency}});
      }
      return json({workspace:existing});
    }
    const id=crypto.randomUUID();
    await db.prepare("INSERT INTO workspaces (id,owner_id,type,name,currency) VALUES (?,?,?,?,?)").bind(id,user.id,type,name,currency).run();
    return json({workspace:{id,type,name,currency}},201);
   }
   
    if(path==="/business/team" && request.method==="GET") {
      const workspaceId=String(url.searchParams.get("workspaceId")||"");
      const access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access) return fail("فضای کسب‌وکار پیدا نشد یا دسترسی ندارید.",404);
      const members=await db.prepare("SELECT m.user_id AS userId,m.email,m.role,m.status,m.created_at AS createdAt,m.joined_at AS joinedAt,u.display_name AS displayName FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created_at").bind(workspaceId).all();
      const owner=await db.prepare("SELECT id AS userId,email,display_name AS displayName FROM users WHERE id=?").bind(access.ownerId).first();
      const invitations=access.role==="owner"||access.role==="manager"?(await db.prepare("SELECT id,email,role,expires_at AS expiresAt,created_at AS createdAt FROM business_invitations WHERE workspace_id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC").bind(workspaceId,Date.now()).all()).results||[]:[];
      return json({team:[...(owner?[{...owner,role:"owner",status:"active"}]:[]),...(members.results||[])],invitations});
    }
    if(path==="/business/team/invitations" && request.method==="POST") {
      const body=await readBody(request)||{},workspaceId=String(body.workspaceId||"");
      const access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access||access.role!=="owner") return fail("فقط مالک فضای کسب‌وکار می‌تواند دعوت‌نامه ارسال کند.",403);
      
      const email=cleanEmail(body.email),role=String(body.role||"viewer");
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("ایمیل معتبر وارد کنید.");
      if(!["manager","accountant","staff","viewer"].includes(role)) return fail("نقش انتخاب‌شده معتبر نیست.");
      if(email===cleanEmail(user.email)) return fail("مالک نمی‌تواند خودش را دعوت کند.");
      const existing=await db.prepare("SELECT user_id FROM workspace_members WHERE workspace_id=? AND email=? AND status='active'").bind(workspaceId,email).first();
      if(existing) return fail("این کاربر از قبل عضو فضای کسب‌وکار است.",409);
      const token=randomToken(32),tokenHash=await digest(token),id=crypto.randomUUID(),expires=Date.now()+7*86400000;
      await db.prepare("UPDATE business_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND email=? AND accepted_at IS NULL AND revoked_at IS NULL").bind(workspaceId,email).run();
      await db.prepare("INSERT INTO business_invitations (id,workspace_id,email,role,invited_by,token_hash,expires_at) VALUES (?,?,?,?,?,?,?)").bind(id,workspaceId,email,role,user.id,tokenHash,expires).run();
      const inviteUrl=(env.APP_URL||"https://novyra.pages.dev")+"/business/invite/?token="+encodeURIComponent(token);
      let emailSent=false;
      if(hasMailProvider(env)) {
        try {
          await sendMail(env,email,"دعوت به فضای کسب‌وکار NOVYRA",renderNovyraEmail({eyebrow:"BUSINESS WORKSPACE INVITATION",title:"دعوت به همکاری در NOVYRA",intro:"شما برای همکاری در فضای کسب‌وکار "+access.name+" دعوت شده‌اید. نقش شما: "+role,actionLabel:"پذیرش دعوت",actionUrl:inviteUrl,notice:"این دعوت‌نامه تا ۷ روز معتبر است و فقط با حساب همین نشانی ایمیل پذیرفته می‌شود.",footerNote:"اگر این دعوت را انتظار نداشتید، پیام را نادیده بگیرید."}));
          emailSent=true;
        } catch(error) { console.error("business-invite-email",id,error); }
      }
      await writeBusinessAudit(db,workspaceId,user.id,"team.invited","member",id,{email,role,emailSent});
      return json({ok:true,emailSent,inviteUrl,invitation:{id,email,role,expiresAt:expires}},201);
    }
    if(path==="/business/team/accept" && request.method==="POST") {
      const body=await readBody(request)||{},token=String(body.token||"");
      if(token.length<30||token.length>200) return fail("لینک دعوت معتبر نیست.",400);
      const invite=await db.prepare("SELECT i.id,i.workspace_id AS workspaceId,i.email,i.role,i.invited_by AS invitedBy,i.expires_at AS expiresAt,w.owner_id AS ownerId FROM business_invitations i JOIN workspaces w ON w.id=i.workspace_id WHERE i.token_hash=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL").bind(await digest(token)).first();
      if(!invite||Number(invite.expiresAt)<=Date.now()) return fail("دعوت‌نامه منقضی یا لغو شده است.",410);
      if(cleanEmail(invite.email)!==cleanEmail(user.email)) return fail("این دعوت‌نامه برای نشانی ایمیل حساب فعلی صادر نشده است.",403);
      if(invite.ownerId===user.id) return fail("مالک از قبل به این فضا دسترسی دارد.");
      await db.prepare("INSERT INTO workspace_members (workspace_id,user_id,email,role,status,invited_by,joined_at) VALUES (?,?,?,?,'active',?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_id,user_id) DO UPDATE SET email=excluded.email,role=excluded.role,status='active',invited_by=excluded.invited_by,joined_at=CURRENT_TIMESTAMP").bind(invite.workspaceId,user.id,user.email,invite.role,invite.invitedBy).run();
      await db.prepare("UPDATE business_invitations SET accepted_at=CURRENT_TIMESTAMP WHERE id=?").bind(invite.id).run();
      await writeBusinessAudit(db,invite.workspaceId,user.id,"team.joined","member",user.id,{role:invite.role});
      return json({ok:true,workspaceId:invite.workspaceId,role:invite.role});
    }
    const teamMemberMatch=path.match(/^\/business\/team\/members\/([^/]+)$/);
    if(teamMemberMatch && (request.method==="PATCH"||request.method==="DELETE")) {
      const body=request.method==="PATCH"?(await readBody(request)||{}):{},workspaceId=String(url.searchParams.get("workspaceId")||body.workspaceId||""),memberId=decodeURIComponent(teamMemberMatch[1]);
      const access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access||access.role!=="owner") return fail("فقط مالک می‌تواند دسترسی اعضا را تغییر دهد.",403);
      if(memberId===access.ownerId) return fail("نقش مالک قابل تغییر یا حذف نیست.",400);
      const member=await db.prepare("SELECT user_id AS userId FROM workspace_members WHERE workspace_id=? AND user_id=?").bind(workspaceId,memberId).first();
      if(!member) return fail("عضو پیدا نشد.",404);
      if(request.method==="DELETE") {
        await db.prepare("DELETE FROM workspace_members WHERE workspace_id=? AND user_id=?").bind(workspaceId,memberId).run();
        await writeBusinessAudit(db,workspaceId,user.id,"team.removed","member",memberId);
        return json({ok:true});
      }
      const role=String(body.role||"");
      if(!["manager","accountant","staff","viewer"].includes(role)) return fail("نقش انتخاب‌شده معتبر نیست.");
      await db.prepare("UPDATE workspace_members SET role=? WHERE workspace_id=? AND user_id=?").bind(role,workspaceId,memberId).run();
      await writeBusinessAudit(db,workspaceId,user.id,"team.role_changed","member",memberId,{role});
      return json({ok:true,role});
    }
    if(path==="/business/records" && (request.method==="GET" || request.method==="PUT")) {
      const body=request.method==="PUT"?(await readBody(request)||{}):{};
      const workspaceId=String(url.searchParams.get("workspaceId") || body.workspaceId || "");
      const access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access) return fail("فضای کسب‌وکار پیدا نشد یا دسترسی ندارید.",404);
      if(request.method==="GET") {
        if(!businessCan(access,"read")) return fail("اجازه مشاهده اطلاعات را ندارید.",403);
        await db.prepare("CREATE TABLE IF NOT EXISTS business_records (workspace_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
        const row=await db.prepare("SELECT payload,updated_at AS updatedAt FROM business_records WHERE workspace_id=? AND owner_id=?").bind(workspaceId,access.ownerId).first();
        const versionRow=await db.prepare("SELECT revision FROM business_record_versions WHERE workspace_id=?").bind(workspaceId).first();
        const revision=Number(versionRow?.revision||0);
        if(!row) return json({records:null,updatedAt:null,revision,role:access.role});
        try { return json({records:JSON.parse(row.payload),updatedAt:row.updatedAt,revision,role:access.role}); } catch { return fail("اطلاعات فضای کسب‌وکار قابل خواندن نیست.",500); }
      }
      if(!businessCan(access,"records:write")) return fail("نقش شما اجازه ویرایش اطلاعات کسب‌وکار را ندارد.",403);
      const records=body.records;
      if(!records || typeof records!=="object" || Array.isArray(records)) return fail("ساختار اطلاعات کسب‌وکار معتبر نیست.");
      const allowedArrays=["invoices","payables","customers","suppliers","products","transactions","cheques","loans","team","activity","trash","bankImports"];
      const safeRecords={};
      for(const [key,value] of Object.entries(records).slice(0,40)) {
        if(!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)||["__proto__","constructor","prototype"].includes(key)) continue;
        if(key==="team") continue;
        if(key==="settings"&&!businessCan(access,"settings:write")) continue;
        if(allowedArrays.includes(key)) safeRecords[key]=Array.isArray(value)?value.slice(0,2000):[];
        else if(key==="settings"&&value&&typeof value==="object"&&!Array.isArray(value)) safeRecords.settings=Object.fromEntries(Object.entries(value).slice(0,200).map(([k,v])=>[String(k).slice(0,100),String(v??"").slice(0,2000)]));
      }
      await db.prepare("CREATE TABLE IF NOT EXISTS business_records (workspace_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
      const previous=await db.prepare("SELECT payload FROM business_records WHERE workspace_id=? AND owner_id=?").bind(workspaceId,access.ownerId).first();
      let previousRecords={};try{if(previous?.payload)previousRecords=JSON.parse(previous.payload)||{};}catch{}
      const mergedRecords=mergeBusinessRecordPayload(previousRecords,safeRecords),payload=JSON.stringify(mergedRecords);
      if(payload.length>200000)return fail("حجم اطلاعات کسب‌وکار بیش از حد مجاز است.",413);
      const versionRow=await db.prepare("SELECT revision FROM business_record_versions WHERE workspace_id=?").bind(workspaceId).first();
      const revision=Number(versionRow?.revision||0)+1;
      await db.batch([
        db.prepare("INSERT INTO business_records (workspace_id,owner_id,payload,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP WHERE business_records.owner_id=excluded.owner_id").bind(workspaceId,access.ownerId,payload),
        db.prepare("INSERT INTO business_record_versions (workspace_id,revision,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(workspace_id) DO UPDATE SET revision=excluded.revision,updated_at=CURRENT_TIMESTAMP").bind(workspaceId,revision)
      ]);
      await syncBusinessDueReminders(db,workspaceId,access.ownerId,user.id,mergedRecords);
      await writeBusinessAudit(db,workspaceId,user.id,"records.updated","business_records",workspaceId,{keys:Object.keys(safeRecords),revision});
      return json({ok:true,savedAt:new Date().toISOString(),revision,actor:{id:user.id,displayName:user.display_name},role:access.role});
    }
    if(path==="/business/audit" && request.method==="GET") {
      const workspaceId=String(url.searchParams.get("workspaceId")||""),access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access||!businessCan(access,"audit:read")) return fail("اجازه مشاهده تاریخچه را ندارید.",403);
      const rows=await db.prepare("SELECT a.id,a.action,a.entity_type AS entityType,a.entity_id AS entityId,a.details_json AS details,a.created_at AS createdAt,u.id AS actorId,u.display_name AS actorName,u.email AS actorEmail FROM business_audit_log a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 500").bind(workspaceId).all();
      return json({events:(rows.results||[]).map(x=>({...x,details:(()=>{try{return x.details?JSON.parse(x.details):null}catch{return null}})()}))});
    }
    if(path==="/business/journal" && (request.method==="GET"||request.method==="POST")) {
      const body=request.method==="POST"?(await readBody(request)||{}):{},workspaceId=String(url.searchParams.get("workspaceId")||body.workspaceId||""),access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access) return fail("فضای کسب‌وکار پیدا نشد یا دسترسی ندارید.",404);
      if(request.method==="GET") {
        if(!businessCan(access,"read")) return fail("اجازه مشاهده دفتر حساب را ندارید.",403);
        const entries=await db.prepare("SELECT id,entry_date AS date,description,reference,created_at AS createdAt,created_by AS createdBy FROM business_journal_entries WHERE workspace_id=? ORDER BY entry_date DESC,created_at DESC LIMIT 500").bind(workspaceId).all();
        const lines=await db.prepare("SELECT l.id,l.entry_id AS entryId,l.account_code AS accountCode,l.account_name AS accountName,l.debit,l.credit FROM business_journal_lines l JOIN business_journal_entries e ON e.id=l.entry_id WHERE e.workspace_id=? ORDER BY e.created_at DESC").bind(workspaceId).all();
        const byEntry=new Map();for(const line of lines.results||[]){if(!byEntry.has(line.entryId))byEntry.set(line.entryId,[]);byEntry.get(line.entryId).push(line);}
        const accounts=await db.prepare("SELECT l.account_code AS accountCode,l.account_name AS accountName,SUM(l.debit) AS totalDebit,SUM(l.credit) AS totalCredit,SUM(l.debit)-SUM(l.credit) AS balance FROM business_journal_lines l JOIN business_journal_entries e ON e.id=l.entry_id WHERE e.workspace_id=? GROUP BY l.account_code,l.account_name ORDER BY l.account_name").bind(workspaceId).all();
        return json({entries:(entries.results||[]).map(x=>({...x,lines:byEntry.get(x.id)||[]})),accounts:accounts.results||[]});
      }
      if(!businessCan(access,"ledger:write")) return fail("نقش شما اجازه ثبت سند حسابداری را ندارد.",403);
      const date=String(body.date||""),description=String(body.description||"").trim().slice(0,300),reference=String(body.reference||"").slice(0,100),lines=body.lines;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!description||!Array.isArray(lines)||lines.length<2||lines.length>100) return fail("تاریخ، شرح و حداقل دو ردیف سند الزامی است.");
      let debit=0,credit=0;const normalized=[];
      for(const line of lines){const accountName=String(line?.accountName||"").trim().slice(0,120),accountCode=String(line?.accountCode||"").slice(0,30),d=Number(line?.debit||0),cr=Number(line?.credit||0);if(!accountName||!Number.isFinite(d)||!Number.isFinite(cr)||d<0||cr<0||d>1e12||cr>1e12||(d>0&&cr>0)||(d===0&&cr===0))return fail("هر ردیف باید فقط مبلغ بدهکار یا بستانکار داشته باشد.");debit+=d;credit+=cr;normalized.push({accountName,accountCode,debit:d,credit:cr});}
      if(debit<=0||Math.abs(debit-credit)>0.0001)return fail("جمع بدهکار و بستانکار باید برابر و بیشتر از صفر باشد.");
      const entryId=crypto.randomUUID(),statements=[db.prepare("INSERT INTO business_journal_entries (id,workspace_id,entry_date,description,reference,created_by) VALUES (?,?,?,?,?,?)").bind(entryId,workspaceId,date,description,reference,user.id),...normalized.map(x=>db.prepare("INSERT INTO business_journal_lines (id,entry_id,account_code,account_name,debit,credit) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),entryId,x.accountCode,x.accountName,x.debit,x.credit))];
      await db.batch(statements);
      await writeBusinessAudit(db,workspaceId,user.id,"journal.created","journal_entry",entryId,{debit,credit,lines:normalized.length});
      return json({ok:true,entryId,debit,credit},201);
    }
    if(path==="/business/reminders" && (request.method==="GET"||request.method==="POST")) {
      const body=request.method==="POST"?(await readBody(request)||{}):{},workspaceId=String(url.searchParams.get("workspaceId")||body.workspaceId||""),access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access) return fail("فضای کسب‌وکار پیدا نشد یا دسترسی ندارید.",404);
      if(request.method==="GET") {
        if(!businessCan(access,"reminders:read")) return fail("اجازه مشاهده یادآوری‌ها را ندارید.",403);
        const rows=await db.prepare("SELECT id,reminder_type AS type,reference_id AS referenceId,title,due_at AS dueAt,remind_at AS remindAt,status,notified_at AS notifiedAt FROM business_reminders WHERE workspace_id=? ORDER BY remind_at LIMIT 500").bind(workspaceId).all();
        return json({reminders:rows.results||[]});
      }
      if(!businessCan(access,"reminders:manage")) return fail("نقش شما اجازه مدیریت یادآوری‌ها را ندارد.",403);
      const title=String(body.title||"").trim().slice(0,180),dueAt=Number(body.dueAt),remindAt=Number(body.remindAt??dueAt),type=String(body.type||"custom");
      if(!title||!Number.isFinite(dueAt)||!Number.isFinite(remindAt)||dueAt<=0||remindAt>dueAt||!["custom","cheque","loan","invoice","installment"].includes(type)) return fail("اطلاعات یادآوری معتبر نیست.");
      const id=crypto.randomUUID();await db.prepare("INSERT INTO business_reminders (id,workspace_id,owner_id,reminder_type,reference_id,title,due_at,remind_at,status,created_by) VALUES (?,?,?,?,?,?,?,?, 'pending',?)").bind(id,workspaceId,access.ownerId,type,String(body.referenceId||id).slice(0,80),title,dueAt,remindAt,user.id).run();
      await writeBusinessAudit(db,workspaceId,user.id,"reminder.created","reminder",id,{title,dueAt,remindAt});
      return json({ok:true,id},201);
    }
    if(path==="/business/team/invitations" && request.method==="GET") {
      const workspaceId=String(url.searchParams.get("workspaceId")||""),access=await getBusinessAccess(db,workspaceId,user.id);
      if(!access||!["owner","manager"].includes(access.role)) return fail("اجازه مشاهده دعوت‌نامه‌ها را ندارید.",403);
      const rows=await db.prepare("SELECT id,email,role,expires_at AS expiresAt,created_at AS createdAt FROM business_invitations WHERE workspace_id=? AND accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 100").bind(workspaceId).all();
      return json({invitations:rows.results||[]});
    }
if(path==="/finance/transactions" && request.method==="GET") {
     const workspaceId=String(url.searchParams.get("workspaceId")||"");
     const access=await getBusinessAccess(db,workspaceId,user.id);
     if(!access||!businessCan(access,"read")) return fail("فضای کاری پیدا نشد یا دسترسی ندارید.",404);
     const rows=await db.prepare("SELECT id,title,category,amount,kind,transaction_date AS date,note FROM finance_transactions WHERE workspace_id=? AND owner_id=? ORDER BY transaction_date DESC,updated_at DESC").bind(workspaceId,access.ownerId).all();
     return json({items:rows.results||[]});
    }
    if(path==="/finance/transactions" && request.method==="PUT") {
     const body=await readBody(request)||{};
     const workspaceId=String(body.workspaceId||"");
     const access=await getBusinessAccess(db,workspaceId,user.id);
     if(!access||!businessCan(access,"finance:write")) return fail("نقش شما اجازه ثبت تراکنش مالی را ندارد.",403);
     if(!Array.isArray(body.items)||body.items.length>500) return fail("فهرست تراکنش‌ها معتبر نیست.");
     const statements=[];
     for(const item of body.items) {
       const id=String(item?.id||"").slice(0,80),title=String(item?.title||"").trim().slice(0,120),category=String(item?.category||"Other").trim().slice(0,80);
       const amount=Number(item?.amount),kind=String(item?.kind||""),date=String(item?.date||""),note=String(item?.note||"").slice(0,500);
       if(!id||!title||!Number.isFinite(amount)||amount<=0||amount>1e12||!["income","expense"].includes(kind)||!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("یکی از تراکنش‌ها اطلاعات نامعتبر دارد.");
       statements.push(db.prepare("INSERT INTO finance_transactions (id,workspace_id,owner_id,title,category,amount,kind,transaction_date,note) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(workspace_id,id) DO UPDATE SET title=excluded.title,category=excluded.category,amount=excluded.amount,kind=excluded.kind,transaction_date=excluded.transaction_date,note=excluded.note,updated_at=CURRENT_TIMESTAMP WHERE finance_transactions.owner_id=excluded.owner_id").bind(id,workspaceId,access.ownerId,title,category,amount,kind,date,note));
     }
     for(let i=0;i<statements.length;i+=90) await db.batch(statements.slice(i,i+90));
     await writeBusinessAudit(db,workspaceId,user.id,"finance.transactions_saved","transactions",null,{count:body.items.length});
     return json({ok:true,saved:body.items.length});
    }
    const transactionDeleteMatch=path.match(/^\/finance\/transactions\/([^/]+)$/);
    if(transactionDeleteMatch && request.method==="DELETE") {
     const workspaceId=String(url.searchParams.get("workspaceId")||"");
     const access=await getBusinessAccess(db,workspaceId,user.id);
     if(!access||!businessCan(access,"finance:write")) return fail("نقش شما اجازه حذف تراکنش مالی را ندارد.",403);
     const transactionId=decodeURIComponent(transactionDeleteMatch[1]);
     await db.prepare("DELETE FROM finance_transactions WHERE id=? AND workspace_id=? AND owner_id=?").bind(transactionId,workspaceId,access.ownerId).run();
     await writeBusinessAudit(db,workspaceId,user.id,"finance.transaction_deleted","transaction",transactionId);
     return json({ok:true});
    }
    if(path==="/social/stories" && request.method==="GET") {
    await cleanupExpiredStories(env,db);
    const rows=await db.prepare(`
      SELECT s.id,s.user_id AS userId,s.media_url AS mediaUrl,s.type,s.created_at AS createdAt,s.expires_at AS expiresAt,
        u.display_name AS displayName,u.username,u.avatar_url AS avatarUrl,
        EXISTS(SELECT 1 FROM story_views v WHERE v.story_id=s.id AND v.viewer_id=?) AS viewedByMe,
        EXISTS(SELECT 1 FROM story_reactions r WHERE r.story_id=s.id AND r.user_id=?) AS reactedByMe
      FROM stories s JOIN users u ON u.id=s.user_id
      WHERE s.expires_at>datetime('now') AND (
        s.user_id=? OR s.is_demo=1 OR EXISTS(SELECT 1 FROM social_follows f WHERE f.follower_id=? AND f.followed_id=s.user_id)
      )
      ORDER BY CASE WHEN s.user_id=? THEN 0 ELSE 1 END,s.created_at ASC
    `).bind(user.id,user.id,user.id,user.id,user.id).all();
    return json({stories:rows.results||[]});
   }
   if(path==="/social/stories" && request.method==="POST") {
    let type="image",file=null,legacy=false;
    if((request.headers.get("Content-Type")||"").toLowerCase().includes("multipart/form-data")) {
      const form=await request.formData();
      type=form.get("type")==="video"?"video":"image";
      const uploaded=form.get("file");
      if(uploaded instanceof File) file=uploaded;
    } else {
      // Temporary compatibility for already-published clients: decode in memory, never persist payload in D1.
      const body=await readBody(request),dataUrl=String(body?.mediaData||"");
      type=body?.type==="video"?"video":"image";
      const match=dataUrl.match(/^data:(image\/(?:jpeg|png|webp)|video\/(?:mp4|webm|quicktime));base64,([A-Za-z0-9+/=]+)$/);
      if(match && ((type==="image"&&match[1].startsWith("image/"))||(type==="video"&&match[1].startsWith("video/")))) {
        const binary=atob(match[2]),bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
        file=new File([bytes],"legacy-upload",{type:match[1]});
        legacy=true;
      }
    }
    if(!(file instanceof File)) return fail("فایل استوری معتبر نیست.");
    const contentType=String(file.type||"").toLowerCase();
    const validImage=type==="image" && (contentType==="image/webp" || (legacy && ["image/jpeg","image/png"].includes(contentType)));
    const validVideo=type==="video" && ["video/mp4","video/webm","video/quicktime"].includes(contentType);
    if(!validImage&&!validVideo) return fail(type==="image"?"عکس باید به فرمت WebP تبدیل شود.":"فرمت ویدیو پشتیبانی نمی‌شود.");
    const maxSize=type==="video"?20*1024*1024:5*1024*1024;
    if(file.size<1 || file.size>maxSize) return fail(type==="video"?"حجم ویدیو بیشتر از سقف مجاز ۲۰ مگابایت است. یک ویدیوی کوچک‌تر انتخاب کن.":"حجم عکس پس از فشرده‌سازی باید حداکثر ۵ مگابایت باشد.",413);
    const id=crypto.randomUUID(),mediaUrl="/social/stories/"+id+"/media";
    await cleanupExpiredStories(env,db);
    await storeStoryMedia(env,id,file);
    try {
      await db.prepare("INSERT INTO stories (id,user_id,media_url,type,expires_at) VALUES (?,?,?, ?,datetime('now','+24 hours'))")
        .bind(id,user.id,mediaUrl,type).run();
    } catch(error) {
      await deleteStoryMedia(env,id);
      throw error;
    }
    return json({ok:true,story:{id,mediaUrl,type,expiresAt:new Date(Date.now()+86400000).toISOString()}},201);
   }
   const storyViewMatch=path.match(/^\/social\/stories\/([a-f0-9-]+)\/view$/i);
   if(storyViewMatch && request.method==="POST") {
    const story=await db.prepare("SELECT id,user_id AS userId FROM stories WHERE id=? AND expires_at>datetime('now')").bind(storyViewMatch[1]).first();
    if(!story) return fail("استوری پیدا نشد یا منقضی شده است.",404);
    if(story.userId!==user.id) await db.prepare("INSERT OR IGNORE INTO story_views (story_id,viewer_id) VALUES (?,?)").bind(story.id,user.id).run();
    return json({ok:true});
   }
   const storyReactionMatch=path.match(/^\/social\/stories\/([a-f0-9-]+)\/reaction$/i);
   if(storyReactionMatch && request.method==="POST") {
    const story=await db.prepare("SELECT id,user_id AS userId FROM stories WHERE id=? AND expires_at>CURRENT_TIMESTAMP").bind(storyReactionMatch[1]).first();
    if(!story) return fail("استوری پیدا نشد یا منقضی شده است.",404);
    const existing=await db.prepare("SELECT 1 AS yes FROM story_reactions WHERE story_id=? AND user_id=?").bind(story.id,user.id).first();
    if(existing) await db.prepare("DELETE FROM story_reactions WHERE story_id=? AND user_id=?").bind(story.id,user.id).run();
    else {
      await db.prepare("INSERT INTO story_reactions (story_id,user_id) VALUES (?,?)").bind(story.id,user.id).run();
      if(story.userId!==user.id) await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),story.userId,"story_like","پسندیدن استوری",user.display_name+" استوری تو را پسندید.").run();
    }
    return json({liked:!existing});
   }
   const storyReplyMatch=path.match(/^\/social\/stories\/([a-f0-9-]+)\/reply$/i);
   if(storyReplyMatch && request.method==="POST") {
    const story=await db.prepare("SELECT id,user_id AS userId FROM stories WHERE id=? AND expires_at>CURRENT_TIMESTAMP").bind(storyReplyMatch[1]).first();
    if(!story) return fail("استوری پیدا نشد یا منقضی شده است.",404);
    const body=await readBody(request),message=String(body?.body||"").trim().slice(0,1000);
    if(!message) return fail("پیام خالی است.");
    if(story.userId===user.id) return fail("نمی‌توانی به استوری خودت پاسخ بدهی.");
    await db.prepare("INSERT INTO social_direct_messages (id,sender_id,recipient_id,story_id,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),user.id,story.userId,story.id,message).run();
    await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),story.userId,"story_reply","پاسخ به استوری",user.display_name+" به استوری تو پاسخ داد.").run();
    return json({ok:true});
   }


   if(path==="/social/demo-data" && request.method==="DELETE") {
    if(user.role!=="admin") return fail("فقط مدیر می‌تواند داده‌های نمونه را حذف کند.",403);
    const [postCount,userCount]=await Promise.all([
      db.prepare("SELECT COUNT(*) AS total FROM social_posts WHERE is_demo=1").first(),
      db.prepare("SELECT COUNT(*) AS total FROM users WHERE is_demo=1").first()
    ]);
    await db.batch([
      db.prepare("DELETE FROM social_posts WHERE is_demo=1"),
      db.prepare("DELETE FROM users WHERE is_demo=1")
    ]);
    return json({ok:true,deletedPosts:Number(postCount?.total||0),deletedUsers:Number(userCount?.total||0)});
   }

   // NOVYRA social core — additive routes; existing account and legacy API routes stay intact.
   if ((path === "/social/feed" || path === "/social/reels") && request.method === "GET") {
    const reelsOnly = path === "/social/reels";
    const friendsOnly = reelsOnly && url.searchParams.get("friends") === "1";
    const rows = await db.prepare(`
      SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,
        p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,
        p.repost_count AS repostCount,p.share_count AS shareCount,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
        (SELECT COUNT(*) FROM social_post_saves sv WHERE sv.post_id=p.id) AS saveCount,
        EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe,
        EXISTS(SELECT 1 FROM social_post_saves mine WHERE mine.post_id=p.id AND mine.user_id=?) AS savedByMe
      FROM social_posts p JOIN users u ON u.id=p.author_id
      ${reelsOnly ? "WHERE p.media_type='video' AND p.media_url IS NOT NULL AND TRIM(p.media_url)<>''" : ""}
      ${friendsOnly ? "AND EXISTS(SELECT 1 FROM social_follows f WHERE f.follower_id=? AND f.followed_id=p.author_id)" : ""}
      ORDER BY p.created_at DESC LIMIT 50
    `).bind(...(friendsOnly ? [user.id,user.id,user.id] : [user.id,user.id])).all();
    return json({ posts: (rows.results || []).map(shapeSocialPost) });
   }

   if(path === "/social/friends" && request.method === "GET") {
    const rows=await db.prepare(`
      SELECT u.id,u.display_name AS displayName,COALESCE(u.username,LOWER(REPLACE(u.display_name,' ',''))) AS username,
        (SELECT COUNT(*) FROM social_posts p WHERE p.author_id=u.id) AS postCount,
        (SELECT COUNT(*) FROM social_follows f WHERE f.followed_id=u.id) AS followerCount,
        (SELECT COUNT(*) FROM social_follows f WHERE f.follower_id=u.id) AS followingCount,
        1 AS followedByMe
      FROM social_follows mine JOIN users u ON u.id=mine.followed_id
      WHERE mine.follower_id=? ORDER BY u.display_name LIMIT 30
    `).bind(user.id).all();
    return json({friends:rows.results||[]});
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
        SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,
          p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,
          p.repost_count AS repostCount,p.share_count AS shareCount,
          (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,
          (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
          (SELECT COUNT(*) FROM social_post_saves sv WHERE sv.post_id=p.id) AS saveCount,
          EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe,
          EXISTS(SELECT 1 FROM social_post_saves mine WHERE mine.post_id=p.id AND mine.user_id=?) AS savedByMe
        FROM social_posts p JOIN users u ON u.id=p.author_id
        WHERE p.author_id=? ORDER BY p.created_at DESC LIMIT 50
      `).bind(user.id,user.id,user.id).all()
    ]);
    return json({
      profile:{id:user.id,email:user.email,displayName:user.display_name,username:user.username||"",avatarUrl:user.avatar_url||null,bio:user.bio||"",postCount:stats?.postCount||0,followerCount:stats?.followerCount||0,followingCount:stats?.followingCount||0},
      posts:(posts.results||[]).map(shapeSocialPost)
    });
   }


   if (path === "/social/explore" && request.method === "GET") {
    const limit=Math.min(40,Math.max(1,Number(url.searchParams.get("limit")||30)));
    const offset=Math.max(0,Number(url.searchParams.get("offset")||0));
    const seed=Math.min(1000000,Math.max(1,Math.floor(Number(url.searchParams.get("seed")||1))));
    const rows=await db.prepare(`
      SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,
        p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,
        p.repost_count AS repostCount,p.share_count AS shareCount,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
        (SELECT COUNT(*) FROM social_post_saves sv WHERE sv.post_id=p.id) AS saveCount,
        EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe,
        EXISTS(SELECT 1 FROM social_post_saves mine WHERE mine.post_id=p.id AND mine.user_id=?) AS savedByMe
      FROM social_posts p JOIN users u ON u.id=p.author_id
      WHERE p.media_type IN ('image','video') AND p.media_url IS NOT NULL AND TRIM(p.media_url)<>''
      ORDER BY (
        (unicode(substr(p.id,1,1))*? + unicode(substr(p.id,2,1))*? +
         unicode(substr(p.id,3,1))*? + unicode(substr(p.id,4,1))*? +
         unicode(substr(p.id,5,1))*? + unicode(substr(p.id,6,1))*?) % 1000003
        + COALESCE(p.view_count,0)*20
        + (SELECT COUNT(*) FROM social_post_likes popular WHERE popular.post_id=p.id)*50
      ) DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.id,user.id,seed,(seed*3)%1000003+1,(seed*7)%1000003+1,(seed*11)%1000003+1,(seed*13)%1000003+1,(seed*17)%1000003+1,limit,offset).all();
    return json({posts:(rows.results||[]).map(shapeSocialPost),nextOffset:offset+(rows.results||[]).length,hasMore:(rows.results||[]).length===limit});
   }

   const otherProfileMatch=path.match(/^\/social\/users\/([a-f0-9-]+)\/profile$/i);
   if(otherProfileMatch && request.method==="GET") {
    const targetId=otherProfileMatch[1];
    const target=await db.prepare("SELECT id,email,display_name AS displayName,COALESCE(username,LOWER(REPLACE(display_name,' ',''))) AS username,avatar_url AS avatarUrl,bio FROM users WHERE id=?").bind(targetId).first();
    if(!target) return fail("کاربر پیدا نشد.",404);
    const [stats,posts]=await Promise.all([
     db.prepare("SELECT (SELECT COUNT(*) FROM social_posts WHERE author_id=?) AS postCount,(SELECT COUNT(*) FROM social_follows WHERE followed_id=?) AS followerCount,(SELECT COUNT(*) FROM social_follows WHERE follower_id=?) AS followingCount,EXISTS(SELECT 1 FROM social_follows WHERE follower_id=? AND followed_id=?) AS followedByMe").bind(targetId,targetId,targetId,user.id,targetId).first(),
     db.prepare(`SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,p.repost_count AS repostCount,p.share_count AS shareCount,(SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,(SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,(SELECT COUNT(*) FROM social_post_saves sv WHERE sv.post_id=p.id) AS saveCount,EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe,EXISTS(SELECT 1 FROM social_post_saves mine WHERE mine.post_id=p.id AND mine.user_id=?) AS savedByMe FROM social_posts p JOIN users u ON u.id=p.author_id WHERE p.author_id=? ORDER BY p.created_at DESC LIMIT 100`).bind(user.id,user.id,targetId).all()
    ]);
    return json({profile:{...target,...stats},posts:(posts.results||[]).map(shapeSocialPost)});
   }

   const viewPostMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/view$/i);
   if(viewPostMatch && request.method==="POST") {
    const postId=viewPostMatch[1];
    const post=await db.prepare("SELECT id FROM social_posts WHERE id=?").bind(postId).first();
    if(!post) return fail("پست پیدا نشد.",404);
    const inserted=await db.prepare("INSERT OR IGNORE INTO social_post_views (post_id,user_id) VALUES (?,?)").bind(postId,user.id).run();
    const counted=Number(inserted?.meta?.changes||0)>0;
    if(counted) await db.prepare("UPDATE social_posts SET view_count=COALESCE(view_count,0)+1 WHERE id=?").bind(postId).run();
    const current=await db.prepare("SELECT COALESCE(view_count,0) AS viewCount FROM social_posts WHERE id=?").bind(postId).first();
    return json({viewCount:current?.viewCount||0,counted});
   }

   if(path==="/social/saved" && request.method==="GET") {
    const rows=await db.prepare(`
      SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,
        p.author_id AS authorId,u.display_name AS authorName,p.view_count AS viewCount,
        p.repost_count AS repostCount,p.share_count AS shareCount,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id=p.id) AS commentCount,
        (SELECT COUNT(*) FROM social_post_saves sv WHERE sv.post_id=p.id) AS saveCount,
        EXISTS(SELECT 1 FROM social_post_likes mine WHERE mine.post_id=p.id AND mine.user_id=?) AS likedByMe,
        1 AS savedByMe
      FROM social_post_saves own JOIN social_posts p ON p.id=own.post_id
      JOIN users u ON u.id=p.author_id
      WHERE own.user_id=? ORDER BY own.created_at DESC LIMIT 100
    `).bind(user.id,user.id).all();
    return json({posts:(rows.results||[]).map(shapeSocialPost)});
   }

   const savePostMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/save$/i);
   if(savePostMatch && request.method==="POST") {
    const postId=savePostMatch[1];
    if(!await db.prepare("SELECT id FROM social_posts WHERE id=?").bind(postId).first()) return fail("پست پیدا نشد.",404);
    const existing=await db.prepare("SELECT 1 AS yes FROM social_post_saves WHERE post_id=? AND user_id=?").bind(postId,user.id).first();
    if(existing) await db.prepare("DELETE FROM social_post_saves WHERE post_id=? AND user_id=?").bind(postId,user.id).run();
    else await db.prepare("INSERT INTO social_post_saves (post_id,user_id) VALUES (?,?)").bind(postId,user.id).run();
    const total=await db.prepare("SELECT COUNT(*) AS total FROM social_post_saves WHERE post_id=?").bind(postId).first();
    return json({saved:!existing,saveCount:total?.total||0});
   }

   const repostPostMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/repost$/i);
   if(repostPostMatch && request.method==="POST") {
    const postId=repostPostMatch[1];
    const post=await db.prepare("SELECT author_id FROM social_posts WHERE id=?").bind(postId).first();
    if(!post) return fail("پست پیدا نشد.",404);
    const existing=await db.prepare("SELECT 1 AS yes FROM social_post_reposts WHERE post_id=? AND user_id=?").bind(postId,user.id).first();
    if(existing) await db.prepare("DELETE FROM social_post_reposts WHERE post_id=? AND user_id=?").bind(postId,user.id).run();
    else {
      await db.prepare("INSERT INTO social_post_reposts (post_id,user_id) VALUES (?,?)").bind(postId,user.id).run();
      if(post.author_id!==user.id) await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),post.author_id,"post_repost","بازنشر پست",user.display_name+" پستت را بازنشر کرد.").run();
    }
    const total=await db.prepare("SELECT COUNT(*) AS total FROM social_post_reposts WHERE post_id=?").bind(postId).first();
    await db.prepare("UPDATE social_posts SET repost_count=? WHERE id=?").bind(total?.total||0,postId).run();
    return json({reposted:!existing,repostCount:total?.total||0});
   }

   const shareTargetsMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/share-targets$/i);
   if(shareTargetsMatch && request.method==="GET") {
    const rows=await db.prepare("SELECT u.id,u.display_name AS displayName,COALESCE(u.username,LOWER(REPLACE(u.display_name,' ',''))) AS username FROM users u WHERE u.id<>? ORDER BY u.created_at DESC LIMIT 50").bind(user.id).all();
    return json({users:rows.results||[]});
   }

   if(path==="/social/messages" && request.method==="GET") {
    const rows=await db.prepare(`
      SELECT m.id,m.body,m.created_at AS createdAt,
        m.sender_id AS senderId,sender.display_name AS senderName,
        m.recipient_id AS recipientId,recipient.display_name AS recipientName,
        m.shared_post_id AS sharedPostId,
        p.body AS postBody,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,
        p.author_id AS postAuthorId,postAuthor.display_name AS postAuthorName
      FROM social_direct_messages m
      JOIN users sender ON sender.id=m.sender_id
      JOIN users recipient ON recipient.id=m.recipient_id
      LEFT JOIN social_posts p ON p.id=m.shared_post_id
      LEFT JOIN users postAuthor ON postAuthor.id=p.author_id
      WHERE m.sender_id=? OR m.recipient_id=?
      ORDER BY m.created_at DESC LIMIT 100
    `).bind(user.id,user.id).all();
    return json({messages:(rows.results||[]).map(row=>({...row,createdAt:isoDate(row.createdAt),received:row.recipientId===user.id}))});
   }

   const sharePostMatch=path.match(/^\/social\/posts\/([a-f0-9-]+)\/share$/i);
   if(sharePostMatch && request.method==="POST") {
    const postId=sharePostMatch[1], body=await readBody(request);
    const post=await db.prepare("SELECT author_id FROM social_posts WHERE id=?").bind(postId).first();
    if(!post) return fail("پست پیدا نشد.",404);
    const targetUserId=String(body?.targetUserId||"");
    if(targetUserId) {
      if(targetUserId===user.id) return fail("نمی‌توانی محتوا را برای خودت بفرستی.");
      const target=await db.prepare("SELECT id FROM users WHERE id=?").bind(targetUserId).first();
      if(!target) return fail("کاربر مقصد پیدا نشد.",404);
      await db.prepare("INSERT INTO social_direct_messages (id,sender_id,recipient_id,shared_post_id,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),user.id,targetUserId,postId,"یک پست را برایت فرستاد.").run();
      await db.prepare("INSERT INTO notifications (id,user_id,kind,title,body) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),targetUserId,"shared_post","پست ارسال‌شده",user.display_name+" یک پست برایت فرستاد.").run();
    }
    await db.prepare("INSERT INTO social_post_shares (id,post_id,user_id,target_user_id) VALUES (?,?,?,?)").bind(crypto.randomUUID(),postId,user.id,targetUserId||null).run();
    await db.prepare("UPDATE social_posts SET share_count=share_count+1 WHERE id=?").bind(postId).run();
    const total=await db.prepare("SELECT share_count AS total FROM social_posts WHERE id=?").bind(postId).first();
    return json({shared:true,shareCount:total?.total||0});
   }

   if(path==="/social/search-history" && request.method==="GET") {
    const rows=await db.prepare("SELECT h.id,h.search_type AS type,h.query_text AS query,h.target_user_id AS userId,h.created_at AS createdAt,u.display_name AS displayName,COALESCE(u.username,LOWER(REPLACE(u.display_name,' ',''))) AS username FROM social_search_history h LEFT JOIN users u ON u.id=h.target_user_id WHERE h.owner_id=? ORDER BY h.created_at DESC,h.id DESC").bind(user.id).all();
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
     : await db.prepare("SELECT id FROM social_search_history WHERE owner_id=? AND search_type='query' AND LOWER(query_text)=LOWER(?)").bind(user.id,queryText).first();
    const id=existing?.id||crypto.randomUUID();
    await db.prepare("INSERT INTO social_search_history (id,owner_id,search_type,target_user_id,query_text,created_at) VALUES (?,?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at,query_text=excluded.query_text").bind(id,user.id,type,type==="user"?targetId:null,type==="query"?queryText:null).run();
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
          SELECT u.id,u.display_name AS displayName,COALESCE(u.username,LOWER(REPLACE(u.display_name,' ',''))) AS username,
            (SELECT COUNT(*) FROM social_posts p WHERE p.author_id=u.id) AS postCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.followed_id=u.id) AS followerCount,
            (SELECT COUNT(*) FROM social_follows f WHERE f.follower_id=u.id) AS followingCount,
            EXISTS(SELECT 1 FROM social_follows mine WHERE mine.follower_id=? AND mine.followed_id=u.id) AS followedByMe
          FROM users u WHERE u.id<>? AND (u.display_name LIKE ? OR LOWER(COALESCE(u.username,'')) LIKE ? OR LOWER(REPLACE(u.display_name,' ','')) LIKE ?)
          ORDER BY followerCount DESC,u.created_at DESC LIMIT 40
        `).bind(user.id,user.id,likeQuery,likeQuery,likeQuery).all()
      : await db.prepare(`
          SELECT u.id,u.display_name AS displayName,COALESCE(u.username,LOWER(REPLACE(u.display_name,char(32),''))) AS username,
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
        SELECT p.id,p.body,p.media_url AS mediaUrl,p.media_type AS mediaType,p.thumbnail_url AS thumbnailUrl,p.created_at AS createdAt,
          p.author_id AS authorId,u.display_name AS authorName,
          (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id=p.id) AS likeCount,
        COALESCE((SELECT json_group_array(liked.name) FROM (
          SELECT lu.display_name AS name FROM social_post_likes ll
          JOIN users lu ON lu.id=ll.user_id
          WHERE ll.post_id=p.id ORDER BY ll.created_at DESC LIMIT 2
        ) liked),'[]') AS likedByNames,
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
   console.error("novyra-api-error", { requestId, route: path, errorName: String(error?.name || "Error"), message: String(error?.message || "Unknown API failure").slice(0,180) });
   if(path==="/auth/forgot-password") {
    const code=String(error?.message||"unknown_error").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80);
    return fail("ارسال ایمیل بازیابی ناموفق بود. کد خطا: "+code,502);
   }
   return json({ code: "INTERNAL_ERROR", message: "خطای داخلی سرور. دوباره تلاش کن.", requestId }, 500);
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