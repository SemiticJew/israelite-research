# Study Guide Assets

This directory is reserved for public storefront assets only.

Do not place paid PDF files here. Anything committed under `assets/` can be served publicly by the static site.

Expected public assets:

- `assets/study-guides/genesis-1/cover.jpg` - final Genesis 1 product cover image for storefront display.
- `assets/study-guides/genesis-1/preview-cover.jpg` - optional cover or image for a future free preview page.

Expected private fulfillment asset:

- The completed 36-page Genesis 1 paid PDF should live outside the public static web root, in the selected payment/fulfillment provider or private backend storage.

Recommended secure delivery pattern:

1. Customer completes payment through the configured product checkout.
2. Payment provider sends a verified webhook to backend fulfillment.
3. Backend records the order and creates a short-lived signed download URL.
4. Customer receives an order confirmation and expiring download access.
5. Google Ads/Analytics purchase conversion fires only after the verified successful payment event.
