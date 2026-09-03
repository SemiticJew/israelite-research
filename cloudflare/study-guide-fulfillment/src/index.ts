import { AwsClient } from "aws4fetch";
import {
  COMPLETE_GUIDE_KEY,
  DOWNLOAD_EXPIRES_IN_SECONDS,
  ALLOWED_EVENTS,
  corsHeaders,
  fulfillmentRecordFromSession,
  isAccessActive,
  jsonResponse,
  safeFailure,
  validSessionId,
  validateCheckoutSession,
  verifyStripeSignature
} from "./core.js";

export interface Env {
  FULFILLMENT_DB: D1Database;
  STUDY_GUIDES_BUCKET: R2Bucket;
  STRIPE_WEBHOOK_SECRET?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  ALLOWED_ORIGIN: string;
  GENESIS_PAYMENT_LINK_ID: string;
  GENESIS_PRICE_ID: string;
  GENESIS_PRODUCT_SLUG: string;
}

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type FulfillmentRecord = {
  stripe_checkout_session_id: string;
  product_slug: string;
  payment_status: string;
  access_expires_at: string;
};

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin") || "";
  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  const verified = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return jsonResponse({ received: false }, 400, env, origin);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return jsonResponse({ received: false }, 400, env, origin);
  }

  if (!ALLOWED_EVENTS.has(event.type)) {
    return jsonResponse({ received: true, ignored: true }, 200, env, origin);
  }

  const session = event.data?.object || {};
  const validation = validateCheckoutSession(session, env);
  if (!validation.ok) {
    return jsonResponse({ received: false }, 400, env, origin);
  }

  const record = fulfillmentRecordFromSession(event, session);
  await env.FULFILLMENT_DB.prepare(`
    INSERT OR IGNORE INTO fulfillments (
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_event_id,
      customer_email,
      product_slug,
      payment_link_id,
      amount_total,
      currency,
      payment_status,
      fulfilled_at,
      access_expires_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.stripe_checkout_session_id,
    record.stripe_payment_intent_id,
    record.stripe_event_id,
    record.customer_email,
    record.product_slug,
    record.payment_link_id,
    record.amount_total,
    record.currency,
    record.payment_status,
    record.fulfilled_at,
    record.access_expires_at,
    record.created_at,
    record.updated_at
  ).run();

  return jsonResponse({ received: true }, 200, env, origin);
}

async function generatePresignedUrl(env: Env): Promise<string> {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
    throw new Error("R2 signing is not configured.");
  }

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto"
  });

  const encodedKey = COMPLETE_GUIDE_KEY.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${encodedKey}`);
  url.searchParams.set("X-Amz-Expires", String(DOWNLOAD_EXPIRES_IN_SECONDS));
  url.searchParams.set("response-content-disposition", "attachment; filename=\"Genesis_1_Creation_Order_and_the_Beginning_of_All_Things.pdf\"");

  const signed = await client.sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true, allHeaders: false }
  });

  return signed.url;
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin") || "";
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";

  if (!validSessionId(sessionId)) {
    return jsonResponse(safeFailure("failed"), 400, env, origin);
  }

  const record = await env.FULFILLMENT_DB.prepare(`
    SELECT stripe_checkout_session_id, product_slug, payment_status, access_expires_at
    FROM fulfillments
    WHERE stripe_checkout_session_id = ?
    LIMIT 1
  `).bind(sessionId).first<FulfillmentRecord>();

  if (!record) {
    return jsonResponse({ verified: false, status: "processing" }, 202, env, origin);
  }

  if (!isAccessActive(record)) {
    return jsonResponse(safeFailure("expired"), 403, env, origin);
  }

  const object = await env.STUDY_GUIDES_BUCKET.head(COMPLETE_GUIDE_KEY);
  if (!object) {
    return jsonResponse({ verified: false, status: "unavailable" }, 503, env, origin);
  }

  try {
    const downloadUrl = await generatePresignedUrl(env);
    return jsonResponse({
      verified: true,
      status: "ready",
      product_slug: "genesis-1",
      product: "genesis-1",
      checkout_session_id: sessionId,
      download_url: downloadUrl,
      download_expires_in: DOWNLOAD_EXPIRES_IN_SECONDS
    }, 200, env, origin);
  } catch {
    return jsonResponse({ verified: false, status: "unavailable" }, 503, env, origin);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, env, origin);
    }

    if (request.method === "POST" && url.pathname === "/stripe/webhook") {
      return handleWebhook(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/order/verify") {
      return handleVerify(request, env);
    }

    return jsonResponse({ error: "not_found" }, 404, env, origin);
  }
};
