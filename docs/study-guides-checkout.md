# Study Guides Checkout Integration

## Deployment Architecture

SemiticJew.org is currently deployed as a static GitHub Pages site.

- GitHub workflow: `.github/workflows/pages.yml`
- Production branch trigger: `main`
- Artifact upload path: `.`
- Custom domain: `CNAME` contains `semiticjew.org`
- Application package: `package.json` contains validation and Capacitor scripts only
- No repository-local API, serverless function, Netlify, Vercel, Firebase, Cloudflare Worker, or AWS deployment configuration was found.

GitHub Pages cannot run Stripe webhook code, verify webhook signatures, create order records, or generate private signed download URLs. Secure fulfillment therefore requires a small external backend plus private storage.

## Current Public Routes

- Storefront page: `/study-guides.html`
- Genesis 1 product page: `/study-guides/genesis-1.html`
- Genesis 1 free sample page: `/study-guides/genesis-1-preview.html`
- Order success page prepared for verified fulfillment: `/study-guides/order-complete.html`
- Public sample PDF path: `/assets/study-guides/genesis-1/genesis-1-sample.pdf`

The sample PDF is intentionally public. The complete 36-page paid Genesis 1 PDF must remain outside this public repository and outside the GitHub Pages artifact.

## Stripe Purchase Resources

- Stripe account: `acct_1TQrBk9hNc2IU49V`
- Product: `prod_VC2WrX2A6LnBvG`
- Price: `price_1UBeRh9hNc2IU49VZrBLmmZp`
- Price amount: `$9.99 USD`
- Payment Link: `https://donate.semiticjew.org/b/bJe9AN8Wq8s1biZ8oscbC01`
- Payment Link ID: `plink_1UBeRz9hNc2IU49VhLNd8EVS`
- Expected metadata:
  - `product_slug = genesis-1`
  - `product_type = digital_study_guide`
  - `source = semiticjew_storefront`

This Payment Link sells a digital educational resource. It is not a donation. The current `donate.semiticjew.org` checkout domain may confuse purchasers and should be renamed or separated later, but DNS/domain changes are outside this storefront pass.

## Required Secure Flow

1. Customer clicks Buy on SemiticJew.org.
2. Frontend fires `begin_checkout`.
3. Customer completes Stripe-hosted checkout.
4. Stripe sends a webhook to the external fulfillment backend.
5. Backend verifies the Stripe webhook signature with `STRIPE_WEBHOOK_SECRET`.
6. Backend handles `checkout.session.completed` and, if delayed methods are enabled, `checkout.session.async_payment_succeeded`.
7. Backend verifies the session is paid and belongs to Genesis 1 by checking the allowed price/product/payment link and expected metadata.
8. Backend creates or updates an idempotent purchase record.
9. Backend authorizes access to the private paid PDF by issuing a short-lived download token or signed URL.
10. Stripe redirects the customer to `/study-guides/order-complete.html?session_id={CHECKOUT_SESSION_ID}`.
11. The success page calls a server-side verifier endpoint using the Checkout Session ID.
12. The backend independently verifies that fulfillment is authorized before returning download access.
13. The success page fires `purchase` analytics only after verified authorization.

Do not fulfill based only on a browser URL, a clicked button, or a client-side success flag.

## Recommended External Backend

For the current GitHub Pages deployment, the smallest practical architecture is:

- Static storefront: GitHub Pages at `semiticjew.org`
- Checkout: Stripe-hosted Payment Link
- Fulfillment API: Cloudflare Worker, Netlify Function, Vercel Function, or another small HTTPS backend
- Private paid PDF storage: Cloudflare R2, AWS S3, or equivalent private object storage
- Purchase records: Cloudflare D1/KV, a small managed database, or equivalent durable store

Cloudflare Worker plus R2 is the preferred first implementation if Semitic Jew already controls DNS through Cloudflare or is willing to create a Cloudflare account. It keeps webhook verification, private object storage, token generation, and download serving in one small deployment. If DNS is not on Cloudflare, Netlify/Vercel Functions plus S3/R2 is also acceptable.

## Backend Routes To Implement

- Webhook route: `POST /stripe/webhook`
- Success-page verification route: `GET /study-guides/verify-order?session_id={CHECKOUT_SESSION_ID}`
- Secure download route: `GET /study-guides/download/genesis-1?token={download_token}`

The exact hostname depends on the external backend, for example `https://fulfillment.semiticjew.org`.

## Purchase Record

Store the smallest record needed for idempotency and customer support:

- Stripe Checkout Session ID
- Stripe PaymentIntent ID
- Stripe event ID
- Customer email
- Product slug
- Price ID
- Payment Link ID
- Payment status
- Fulfilled timestamp
- Download token hash
- Token expiration

Use Stripe event ID and Checkout Session ID to make webhook retries idempotent.

## Private PDF Storage

Do not commit the complete Genesis 1 PDF to this repository.

Recommended object key:

- Private object: `private/study-guides/genesis-1/genesis-1-complete.pdf`

The paid PDF should be readable only by the fulfillment backend. The customer should receive either a short-lived signed object URL or a backend download URL backed by a server-side token. A seven-day download window with several allowed downloads is reasonable for a first release and easier for customer support than strict single-use access.

## Frontend Integration Points

Buy buttons currently remain unconnected because the verifier and private storage are not deployed yet. After the external backend is live:

1. Configure the Stripe Payment Link success URL as:
   `https://semiticjew.org/study-guides/order-complete.html?session_id={CHECKOUT_SESSION_ID}`
2. Configure the static success page with the verifier endpoint, for example:
   `window.SEMITIC_JEW_FULFILLMENT_ENDPOINT = "https://fulfillment.semiticjew.org/study-guides/verify-order";`
3. Connect `data-study-guide-checkout` buttons to:
   `https://donate.semiticjew.org/b/bJe9AN8Wq8s1biZ8oscbC01`

The order page script expects the verifier to return JSON like:

```json
{
  "verified": true,
  "product_slug": "genesis-1",
  "checkout_session_id": "cs_live_placeholder",
  "download_url": "https://fulfillment.semiticjew.org/study-guides/download/genesis-1?token=placeholder"
}
```

Return HTTP `202` or `{ "status": "processing" }` while Stripe confirmation is still pending. Do not expose Stripe API errors or stack traces to the customer.

## Analytics

Current storefront analytics:

- `view_item`
- `select_item`
- `begin_checkout`
- `view_study_guide_sample`
- `download_study_guide_sample`

No public storefront page fires `purchase` on click. The prepared order-complete script fires `purchase` only after the verifier returns a confirmed Genesis 1 authorization. It uses the Checkout Session ID as the transaction ID and deduplicates in `localStorage` to reduce repeat conversion events from refreshes.

Donation conversion behavior remains in `js/include.js` and must stay separate from study-guide purchases.

## Required Environment Variables

Do not commit real secret values.

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_GENESIS_1_PRODUCT_ID`
- `STRIPE_GENESIS_1_PRICE_ID`
- `STRIPE_GENESIS_1_PAYMENT_LINK_ID`
- `STRIPE_GENESIS_1_PRODUCT_SLUG`
- `STRIPE_GENESIS_1_PRODUCT_TYPE`
- `STRIPE_GENESIS_1_SOURCE`
- `PAID_GUIDE_STORAGE_BUCKET`
- `PAID_GUIDE_OBJECT_KEY`
- `DOWNLOAD_TOKEN_SECRET`
- `DOWNLOAD_TOKEN_TTL_SECONDS`
- `ORDER_STORE`
- `SUPPORT_EMAIL`

The repository includes `.env.example` with placeholder values only.

## Test Procedure

The Stripe identifiers above are live-mode resources. Do not run a real charge for development testing.

Before connecting Buy buttons:

1. Create separate Stripe test-mode product, price, and payment link IDs.
2. Deploy the fulfillment backend with test-mode secrets.
3. Configure the test Payment Link success URL to the order-complete route.
4. Send Stripe CLI test webhook events to the backend.
5. Verify webhook signature validation rejects unsigned or altered payloads.
6. Verify successful sessions must match Genesis 1 price/product/payment-link metadata.
7. Verify duplicate Stripe events do not create duplicate fulfillment records.
8. Verify the download token expires and never exposes the private object path.
9. Verify `purchase` analytics fires only after the verifier returns confirmed access.
10. After test success, repeat configuration with live-mode secrets and the live Payment Link.

## Security Notes

- Do not commit the paid PDF under `/assets/`, `/pdf/`, `/study-guides/`, or any predictable public URL.
- Do not put Stripe secret keys, webhook secrets, storage keys, or fulfillment tokens in frontend JavaScript.
- Do not fire `purchase` based on a client-side click or URL parameter alone.
- Do not grant access because a customer reached `/study-guides/order-complete.html`.
- Verify Stripe webhook signatures server-side.
- Verify the Genesis 1 product, price, payment link, and metadata before fulfillment.
- Keep Zeffy donations and Stripe product purchases in separate conversion categories.
