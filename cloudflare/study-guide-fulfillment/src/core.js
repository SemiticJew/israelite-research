export const COMPLETE_GUIDE_KEY = "private/study-guides/genesis-1/genesis-1-complete.pdf";
export const DOWNLOAD_EXPIRES_IN_SECONDS = 86400;
export const ACCESS_WINDOW_DAYS = 7;
export const ALLOWED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded"
]);

export function corsHeaders(env, origin){
  const allowedOrigin = env.ALLOWED_ORIGIN || "https://semiticjew.org";
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Stripe-Signature",
    "Access-Control-Max-Age": "86400"
  };

  if (origin === allowedOrigin || isLocalDevelopmentOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function jsonResponse(body, status = 200, env = {}, origin = ""){
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(env, origin)
    }
  });
}

export function safeFailure(status = "failed"){
  return { verified: false, status };
}

export function timingSafeEqual(a, b){
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function parseStripeSignature(header){
  const parts = String(header || "").split(",");
  const signatures = [];
  let timestamp = "";

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value || "";
    if (key === "v1" && value) signatures.push(value);
  }

  return { timestamp, signatures };
}

export async function hmacSha256(secret, payload){
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(rawBody, signatureHeader, secret, now = Date.now()){
  if (!secret || !signatureHeader) return false;

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const age = Math.abs(now / 1000 - timestampSeconds);
  if (age > 300) return false;

  const expected = await hmacSha256(secret, `${timestamp}.${rawBody}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

export function isLocalDevelopmentOrigin(origin){
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin || "");
}

export function validSessionId(value){
  return /^cs_(test|live)_[A-Za-z0-9_]{8,}$/.test(value || "");
}

export function accessExpiresAt(now = new Date()){
  const expires = new Date(now.getTime() + ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return expires.toISOString();
}

export function isAccessActive(record, now = new Date()){
  if (!record) return false;
  if (record.payment_status !== "paid") return false;
  if (record.product_slug !== "genesis-1") return false;
  return new Date(record.access_expires_at).getTime() >= now.getTime();
}

export function validateCheckoutSession(session, env){
  if (!session || typeof session !== "object") {
    return { ok: false, reason: "missing_session" };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "unpaid" };
  }

  if (session.payment_link !== env.GENESIS_PAYMENT_LINK_ID) {
    return { ok: false, reason: "wrong_payment_link" };
  }

  const metadata = session.metadata || {};
  if (metadata.product_slug !== env.GENESIS_PRODUCT_SLUG) {
    return { ok: false, reason: "wrong_product_slug" };
  }

  if (metadata.product_type !== "digital_study_guide") {
    return { ok: false, reason: "wrong_product_type" };
  }

  if (metadata.source !== "semiticjew_storefront") {
    return { ok: false, reason: "wrong_source" };
  }

  if (session.amount_total !== 999) {
    return { ok: false, reason: "wrong_amount" };
  }

  if (String(session.currency || "").toLowerCase() !== "usd") {
    return { ok: false, reason: "wrong_currency" };
  }

  if (!session.id || !validSessionId(session.id)) {
    return { ok: false, reason: "bad_session_id" };
  }

  return { ok: true };
}

export function fulfillmentRecordFromSession(event, session, now = new Date()){
  const customer = session.customer_details || {};
  return {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent || null,
    stripe_event_id: event.id,
    customer_email: customer.email || session.customer_email || null,
    product_slug: "genesis-1",
    payment_link_id: session.payment_link,
    amount_total: session.amount_total,
    currency: String(session.currency || "").toLowerCase(),
    payment_status: session.payment_status,
    fulfilled_at: now.toISOString(),
    access_expires_at: accessExpiresAt(now),
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };
}
