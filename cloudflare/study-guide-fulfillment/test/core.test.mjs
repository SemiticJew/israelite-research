import assert from "node:assert/strict";
import test from "node:test";
import {
  DOWNLOAD_EXPIRES_IN_SECONDS,
  accessExpiresAt,
  corsHeaders,
  fulfillmentRecordFromSession,
  hmacSha256,
  isAccessActive,
  parseStripeSignature,
  safeFailure,
  validSessionId,
  validateCheckoutSession,
  verifyStripeSignature
} from "../src/core.js";

const env = {
  ALLOWED_ORIGIN: "https://semiticjew.org",
  GENESIS_PAYMENT_LINK_ID: "plink_1UBeRz9hNc2IU49VhLNd8EVS",
  GENESIS_PRODUCT_SLUG: "genesis-1"
};

function session(overrides = {}){
  return {
    id: "cs_test_1234567890abcdef",
    payment_status: "paid",
    payment_link: "plink_1UBeRz9hNc2IU49VhLNd8EVS",
    amount_total: 999,
    currency: "usd",
    payment_intent: "pi_test_123",
    customer_details: { email: "reader@example.com" },
    metadata: {
      product_slug: "genesis-1",
      product_type: "digital_study_guide",
      source: "semiticjew_storefront"
    },
    ...overrides
  };
}

test("validates a paid Genesis 1 Checkout Session", () => {
  assert.deepEqual(validateCheckoutSession(session(), env), { ok: true });
});

test("rejects unpaid sessions", () => {
  assert.equal(validateCheckoutSession(session({ payment_status: "unpaid" }), env).reason, "unpaid");
});

test("rejects wrong payment link", () => {
  assert.equal(validateCheckoutSession(session({ payment_link: "plink_wrong" }), env).reason, "wrong_payment_link");
});

test("rejects wrong metadata", () => {
  assert.equal(validateCheckoutSession(session({ metadata: { product_slug: "other" } }), env).reason, "wrong_product_slug");
});

test("rejects wrong amount", () => {
  assert.equal(validateCheckoutSession(session({ amount_total: 1000 }), env).reason, "wrong_amount");
});

test("rejects wrong currency", () => {
  assert.equal(validateCheckoutSession(session({ currency: "eur" }), env).reason, "wrong_currency");
});

test("builds an idempotency-ready fulfillment record", () => {
  const now = new Date("2026-09-03T12:00:00.000Z");
  const event = { id: "evt_test_123" };
  const record = fulfillmentRecordFromSession(event, session(), now);
  assert.equal(record.stripe_checkout_session_id, "cs_test_1234567890abcdef");
  assert.equal(record.stripe_event_id, "evt_test_123");
  assert.equal(record.customer_email, "reader@example.com");
  assert.equal(record.payment_status, "paid");
  assert.equal(record.access_expires_at, "2026-09-10T12:00:00.000Z");
});

test("validates access window", () => {
  const active = {
    payment_status: "paid",
    product_slug: "genesis-1",
    access_expires_at: "2026-09-10T12:00:00.000Z"
  };
  assert.equal(isAccessActive(active, new Date("2026-09-09T12:00:00.000Z")), true);
  assert.equal(isAccessActive(active, new Date("2026-09-11T12:00:00.000Z")), false);
});

test("validates Checkout Session ID format", () => {
  assert.equal(validSessionId("cs_live_1234567890abcdef"), true);
  assert.equal(validSessionId("cs_test_1234567890abcdef"), true);
  assert.equal(validSessionId("not-a-session"), false);
});

test("returns processing/failure shapes without internals", () => {
  assert.deepEqual(safeFailure("failed"), { verified: false, status: "failed" });
});

test("fails closed when webhook secret is missing", async () => {
  const now = 1_000_000_000_000;
  const raw = JSON.stringify({ id: "evt_test_123" });
  const sig = await hmacSha256("secret", `${Math.floor(now / 1000)}.${raw}`);
  assert.equal(await verifyStripeSignature(raw, `t=${Math.floor(now / 1000)},v1=${sig}`, "", now), false);
});

test("rejects invalid Stripe signatures", async () => {
  const now = 1_000_000_000_000;
  const raw = JSON.stringify({ id: "evt_test_123" });
  assert.equal(await verifyStripeSignature(raw, `t=${Math.floor(now / 1000)},v1=bad`, "secret", now), false);
});

test("accepts valid Stripe signatures over the raw body", async () => {
  const now = 1_000_000_000_000;
  const raw = JSON.stringify({ id: "evt_test_123" });
  const sig = await hmacSha256("secret", `${Math.floor(now / 1000)}.${raw}`);
  assert.equal(await verifyStripeSignature(raw, `t=${Math.floor(now / 1000)},v1=${sig}`, "secret", now), true);
});

test("rejects stale Stripe signatures", async () => {
  const now = 1_000_000_000_000;
  const raw = JSON.stringify({ id: "evt_test_123" });
  const oldTimestamp = Math.floor(now / 1000) - 301;
  const sig = await hmacSha256("secret", `${oldTimestamp}.${raw}`);
  assert.equal(await verifyStripeSignature(raw, `t=${oldTimestamp},v1=${sig}`, "secret", now), false);
});

test("parses Stripe signature headers", () => {
  assert.deepEqual(parseStripeSignature("t=123,v1=abc,v1=def"), {
    timestamp: "123",
    signatures: ["abc", "def"]
  });
});

test("restricts CORS to Semitic Jew and localhost", () => {
  assert.equal(corsHeaders(env, "https://semiticjew.org")["Access-Control-Allow-Origin"], "https://semiticjew.org");
  assert.equal(corsHeaders(env, "http://localhost:4177")["Access-Control-Allow-Origin"], "http://localhost:4177");
  assert.equal(corsHeaders(env, "https://example.com")["Access-Control-Allow-Origin"], undefined);
});

test("documents 24-hour presigned URL expiry", () => {
  assert.equal(DOWNLOAD_EXPIRES_IN_SECONDS, 86400);
  assert.equal(accessExpiresAt(new Date("2026-09-03T12:00:00.000Z")), "2026-09-10T12:00:00.000Z");
});
