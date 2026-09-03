# Study Guides Checkout Integration

The first storefront version is static and intentionally does not complete purchases.

## Current State

- Storefront page: `/study-guides.html`
- Genesis 1 product page: `/study-guides/genesis-1.html`
- Future free sample route reserved: `/study-guides/genesis-1-preview.html`
- Frontend analytics events:
  - `view_item`
  - `select_item`
  - `begin_checkout`
- No `purchase` event is fired by the static pages.
- The Genesis 1 paid PDF is not stored in a public site path.

## Production-Safe Recommendation

For this static-site architecture, the smallest practical purchase system is a hosted product checkout plus webhook-based fulfillment:

1. Use Stripe Payment Links or Stripe Checkout for the Genesis 1 digital product.
2. Configure a webhook endpoint on a minimal backend/serverless function.
3. Verify Stripe webhook signatures server-side.
4. Store the paid PDF in private storage, not in this repository's public web root.
5. After verified payment, generate a short-lived signed download URL or email a secure fulfillment link.
6. Fire purchase/conversion tracking only from the verified success path, never from the Buy click.

Zeffy should remain dedicated to donations unless Semitic Jew Inc intentionally configures a separate product-sales flow. Donation conversions and study-guide purchase conversions should use separate Google Ads conversion categories.

## Required Configuration

- Product checkout URL for Genesis 1.
- Serverless/backend webhook endpoint.
- Private file storage for the paid PDF.
- Confirmation email or order confirmation route.
- Separate Google Ads purchase conversion action, if ad purchase tracking is desired.

## Security Notes

- Do not commit the paid PDF under `/assets/`, `/pdf/`, `/study-guides/`, or any predictable public URL.
- Do not put Stripe secret keys, webhook secrets, or fulfillment tokens in frontend JavaScript.
- Do not fire `purchase` based on a client-side click or URL parameter alone.
