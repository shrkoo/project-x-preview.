const escapeEmailHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function renderHomaAiResetEmail({ actionUrl }) {
  const safeUrl = escapeEmailHtml(actionUrl);
  const social = [
    ["Instagram", "https://www.instagram.com/homaai2026/"],
    ["X", "https://x.com/HomaAi2026"],
    ["TikTok", "https://www.tiktok.com/@homaai8"],
    ["YouTube", "https://www.youtube.com/@homaai2026"],
    ["LinkedIn", "https://www.linkedin.com/in/shirko-alizadeh-a95001447/"]
  ];
  const socialLinks = social.map(([label, url]) =>
    `<a href="${url}" target="_blank" style="display:inline-block;margin:0 7px;color:#b8a6ff;font-family:Arial,Tahoma,sans-serif;font-size:11px;line-height:20px;text-decoration:none;">${label}</a>`
  ).join("");
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>بازیابی رمز عبور | HomaAi</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0d12;font-family:Tahoma,Arial,sans-serif;color:#f6f6fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">درخواست بازیابی رمز عبور حساب HomaAi شما ثبت شده است.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#0c0d12;background-image:radial-gradient(ellipse at 50% 0%,#29213f 0%,#0c0d12 62%);padding:42px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;border:1px solid #343044;border-radius:24px;background-color:#14161e;background-image:linear-gradient(145deg,rgba(167,139,250,.12),rgba(20,22,30,.96) 42%,rgba(155,231,207,.04));">
        <tr><td align="center" style="padding:34px 28px 12px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border:1px solid #8f79d1;border-radius:13px;background-color:#211c31;color:#c7b7ff;font-family:Arial,sans-serif;font-size:23px;font-weight:700;">H</td>
              <td style="padding-right:12px;color:#f6f6fb;font-family:Arial,Tahoma,sans-serif;font-size:22px;font-weight:700;letter-spacing:.3px;">HomaAi</td>
            </tr>
          </table>
          <div style="padding-top:12px;color:#b9acd9;font-size:12px;line-height:1.9;">هوشمندی در هر تصمیم مالی</div>
        </td></tr>
        <tr><td style="padding:28px 34px 34px;text-align:right;direction:rtl;">
          <div style="margin-bottom:12px;color:#9be7cf;font-size:10px;font-weight:700;letter-spacing:1.8px;">ACCOUNT SECURITY</div>
          <h1 style="margin:0 0 16px;color:#f6f6fb;font-size:25px;line-height:1.7;font-weight:700;">بازیابی رمز عبور</h1>
          <p style="margin:0 0 26px;color:#c3c5d0;font-size:14px;line-height:2.2;">درخواست بازیابی رمز عبور حساب HomaAi شما ثبت شده است. نگران نباشید؛ با انتخاب یک رمز تازه و امن، دوباره با خیال راحت به حساب و اطلاعات مالی خود دسترسی خواهید داشت.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr><td align="center" bgcolor="#8b6cf0" style="border:1px solid #b29aff;border-radius:12px;box-shadow:0 8px 24px rgba(139,108,240,.24);">
              <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 34px;border-radius:12px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">تغییر رمز عبور</a>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 22px;border:1px solid #35443f;border-radius:14px;background-color:#18221f;">
            <tr><td style="padding:15px 17px;text-align:right;">
              <div style="margin-bottom:5px;color:#9be7cf;font-size:12px;font-weight:700;">یادآوری امنیتی</div>
              <div style="color:#c4d5ce;font-size:12px;line-height:2;">این لینک فقط تا یک ساعت معتبر است و پس از آن منقضی می‌شود.</div>
            </td></tr>
          </table>
          <p style="margin:0 0 9px;color:#969aaa;font-size:11px;line-height:2;">اگر دکمه بالا باز نشد، نشانی زیر را در مرورگر خود کپی کنید:</p>
          <div dir="ltr" style="padding:12px 14px;border:1px solid #303241;border-radius:10px;background-color:#101117;color:#b9a8ff;font-family:Arial,sans-serif;font-size:11px;line-height:1.8;word-break:break-all;text-align:left;">
            <a href="${safeUrl}" target="_blank" style="color:#b9a8ff;text-decoration:underline;word-break:break-all;">${safeUrl}</a>
          </div>
          <p style="margin:23px 0 0;color:#969aaa;font-size:12px;line-height:2;">اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید؛ رمز عبور حساب شما تغییر نخواهد کرد.</p>
        </td></tr>
        <tr><td style="padding:22px 20px 26px;border-top:1px solid #292d3a;text-align:center;">
          <div style="color:#e8e4f5;font-size:12px;font-weight:700;">با احترام، تیم HomaAi</div>
          <div style="margin-top:7px;color:#969aaa;font-size:10px;line-height:1.9;">هوشمندی در هر تصمیم مالی</div>
          <div style="margin-top:15px;line-height:1.8;">${socialLinks}</div>
          <div style="margin-top:17px;color:#777b8b;font-size:10px;line-height:1.9;">لطفاً به این ایمیل پاسخ ندهید؛ این پیام به‌صورت خودکار ارسال شده است.</div>
        </td></tr>
      </table>
      <div style="padding:18px 10px;color:#686c7b;font-size:10px;line-height:1.8;text-align:center;">© HomaAi</div>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function handleForgotPassword({ body, request, db, env, requestId, helpers }) {
  const {
    cleanEmail, isValidEmail, json, hasMailProvider, hitAuthLimit, digest,
    issueEmailToken, sendMail, logError
  } = helpers;
  const email = cleanEmail(body?.email);
  if (!isValidEmail(email)) {
    return json({ code: "INVALID_EMAIL", message: "ایمیل معتبر وارد کن.", requestId }, 400);
  }
  if (!hasMailProvider(env)) {
    logError({ requestId, route: "/auth/forgot-password", code: "EMAIL_SEND_FAILED", reason: "EMAIL_PROVIDER_NOT_CONFIGURED" });
    return json({ code: "EMAIL_SEND_FAILED", message: "سرویس ارسال ایمیل در این محیط تنظیم نشده است.", requestId }, 503);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const emailKey = await digest(email);
  if (!await hitAuthLimit(db, "forgot-password-ip:" + ip, 60, 3600000)) {
    return json({ code: "RATE_LIMITED", message: "درخواست‌های بازیابی از این شبکه موقتاً محدود شده است.", requestId, retryAfterSeconds: 3600 }, 429);
  }
  if (!await hitAuthLimit(db, "forgot-password-email:" + emailKey, 10, 3600000)) {
    return json({ code: "RATE_LIMITED", message: "برای این ایمیل درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کن.", requestId, retryAfterSeconds: 3600 }, 429);
  }
  if (!await hitAuthLimit(db, "forgot-password-cooldown:" + emailKey, 1, 60000)) {
    return json({ code: "RATE_LIMITED", message: "برای ارسال دوباره کمی صبر کن.", requestId, retryAfterSeconds: 60 }, 429);
  }

  const target = await db.prepare("SELECT id,email FROM users WHERE email=?").bind(email).first();
  if (target) {
    await db.prepare("UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND kind='reset' AND used_at IS NULL").bind(target.id).run();
    const token = await issueEmailToken(db, target.id, "reset", 60 * 60 * 1000);
    const link = (env.APP_URL || "https://novyra.pages.dev") + "/?reset=" + encodeURIComponent(token);
    try {
      await sendMail(env, target.email, "بازیابی رمز عبور HomaAi", renderHomaAiResetEmail({ actionUrl: link }));
    } catch (error) {
      logError({ requestId, route: "/auth/forgot-password", code: "EMAIL_SEND_FAILED", errorName: String(error?.name || "Error"), message: String(error?.message || "Email provider failure").slice(0, 160) });
      return json({ code: "EMAIL_SEND_FAILED", message: "ارسال ایمیل بازیابی انجام نشد. تنظیمات سرویس ایمیل را بررسی کنید و دوباره تلاش کنید.", requestId }, 502);
    }
  }

  return json({ ok: true, message: "اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی ارسال می‌شود.", requestId });
}
