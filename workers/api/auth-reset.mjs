export async function handlePasswordReset({ body, db, requestId, helpers }) {
  const token = String(body?.token || "");
  const salt = String(body?.salt || "");
  const suppliedHash = String(body?.passwordHash || "");
  const { json, digest, isNewPasswordHash } = helpers;

  if (!/^[a-f0-9]{32}$/i.test(salt) || !isNewPasswordHash(suppliedHash, salt)) {
    return json({ code: "INVALID_INPUT", message: "اطلاعات رمز جدید معتبر نیست.", requestId }, 400);
  }

  const tokenHash = await digest(token);
  const record = await db.prepare(
    "SELECT id,user_id FROM email_tokens WHERE token_hash=? AND kind='reset' AND expires_at>? AND used_at IS NULL"
  ).bind(tokenHash, Date.now()).first();

  if (!record) {
    return json({ code: "TOKEN_EXPIRED", message: "لینک بازیابی معتبر نیست یا منقضی شده است.", requestId }, 410);
  }

  await db.batch([
    db.prepare("UPDATE users SET password_hash=?,password_salt=? WHERE id=?").bind(suppliedHash, salt, record.user_id),
    db.prepare("UPDATE email_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(record.id),
    db.prepare("DELETE FROM sessions WHERE user_id=?").bind(record.user_id)
  ]);

  return json({ ok: true, message: "رمز عبور تغییر کرد؛ دوباره وارد شو.", requestId }, 200);
}
