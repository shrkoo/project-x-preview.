export async function handlePasswordLogin({ request, env, db, requestId, helpers }) {
  const { cleanEmail, hitAuthLimit, passwordHash, createSession, publicProfile } = helpers;
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Vary": "Origin",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
  let stage = "validate";
  try {
    if (!db) throw new Error("missing_D1_binding_DB");
    const body = await request.json().catch(() => null);
    const email = cleanEmail(body?.email);
    const password = String(body?.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 1024) {
      return json({ code: "INVALID_INPUT", message: "Enter a valid email and password.", requestId }, 400);
    }
    stage = "rate-limit";
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rateKey = "login:" + ip;
    if (!await hitAuthLimit(db, rateKey, 12, 900000)) {
      const limitRow = await db.prepare("SELECT window_started_at FROM auth_rate_limits WHERE rate_key=?").bind(rateKey).first();
      const retryAfterSeconds = Math.max(1, Math.ceil((Number(limitRow?.window_started_at || Date.now()) + 900000 - Date.now()) / 1000));
      return json({ code: "RATE_LIMITED", message: "Too many login attempts. Try again later.", requestId, retryAfterSeconds }, 429);
    }
    stage = "user-lookup";
    const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    // Identical status and message for an unknown account and a wrong password.
    if (!user) return json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", requestId }, 401);
    if (env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.verified_at) {
      return json({ code: "EMAIL_NOT_VERIFIED", message: "Verify your email before logging in.", requestId }, 403);
    }
    if (!user.password_salt || !user.password_hash) {
      return json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", requestId }, 401);
    }
    stage = "password-derive";
    const suppliedHash = await passwordHash(password, user.password_salt);
    if (suppliedHash !== user.password_hash) {
      return json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect.", requestId }, 401);
    }
    stage = "session-create";
    const session = await createSession(db, user.id);
    return json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id, email: user.email, displayName: user.display_name,
        xp: user.xp, gamesPlayed: user.games_played, role: user.role,
        profile: publicProfile(user)
      }
    });
  } catch (error) {
    console.error("novyra-auth-login-error", {
      requestId,
      route: "/auth/login",
      stage,
      errorName: String(error?.name || "Error"),
      message: String(error?.message || "Unknown login failure").slice(0, 180)
    });
    return json({ code: "INTERNAL_ERROR", message: "A server error occurred. Please try again.", requestId }, 500);
  }
}
