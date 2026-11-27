export async function handleForgotPassword({ body, request, db, env, requestId, helpers }) {
  const {
    cleanEmail, isValidEmail, json, hasMailProvider, hitAuthLimit, digest,
    issueEmailToken, sendMail, renderNovyraEmail, logError
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
      await sendMail(env, target.email, "بازیابی رمز عبور NOVYRA", renderNovyraEmail({
        eyebrow: "ACCOUNT SECURITY", title: "بازیابی رمز عبور",
        intro: "درخواست انتخاب رمز عبور جدید برای حساب NOVYRA شما ثبت شده است. برای ادامه، دکمه زیر را انتخاب کنید.",
        actionLabel: "تغییر رمز عبور", actionUrl: link,
        notice: "این لینک فقط تا یک ساعت معتبر است و پس از آن منقضی می‌شود.",
        footerNote: "اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید؛ رمز عبور حساب شما تغییر نخواهد کرد."
      }));
    } catch (error) {
      logError({ requestId, route: "/auth/forgot-password", code: "EMAIL_SEND_FAILED", errorName: String(error?.name || "Error"), message: String(error?.message || "Email provider failure").slice(0, 160) });
    }
  }

  return json({ ok: true, message: "اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی ارسال می‌شود.", requestId });
}
