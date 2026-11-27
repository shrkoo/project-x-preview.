/**
 * NOVYRA transactional email bridge for Google Apps Script.
 *
 * Deploy as a Web App: Execute as "Me", access "Anyone".
 * In Project Settings > Script Properties, add:
 *   EMAIL_BRIDGE_SECRET = a long random secret (32+ characters)
 *
 * Configure ONLY the preview Cloudflare Worker:
 *   EMAIL_BRIDGE_URL = deployed Apps Script Web App URL (/exec)
 *   EMAIL_BRIDGE_SECRET = same secret
 *
 * This implements the existing Worker bridge contract:
 *   POST JSON { secret, to, subject, html }
 *   response JSON { success: true } or { success: false }
 *
 * Keep the secret out of source control. The script sends from the Google
 * account that owns the Apps Script deployment. Gmail sending quotas apply.
 */

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expected = String(props.getProperty("EMAIL_BRIDGE_SECRET") || "");
    if (expected.length < 32) {
      return jsonResponse({ success: false, error: "bridge_not_configured" });
    }

    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const supplied = String(payload.secret || "");
    if (!constantTimeEqual(expected, supplied)) {
      return jsonResponse({ success: false, error: "unauthorized" });
    }

    const to = String(payload.to || "").trim();
    const subject = String(payload.subject || "").trim().slice(0, 180);
    const html = String(payload.html || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
        !subject || !html || html.length > 200000) {
      return jsonResponse({ success: false, error: "invalid_payload" });
    }

    const plain = html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s{3,}/g, " ")
      .trim();

    GmailApp.sendEmail(to, subject, plain || subject, {
      htmlBody: html,
      name: "NOVYRA"
    });
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("NOVYRA email bridge failure: " + String(err && err.message || err));
    return jsonResponse({ success: false, error: "send_failed" });
  }
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
