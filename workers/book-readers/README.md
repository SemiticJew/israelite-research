# Book reader signup — free-plan deployment

Cloudflare Workers + D1 store records; Turnstile checks submissions. Zeffy sends the paperback launch notice after a private CSV import. This is single opt-in: no confirmation email is sent and no claim of verified purchases/email ownership is made. Counters count unique lowercased email addresses, not verified people. Existing email submissions do not change preferences. No paid subscription or automated email campaign is created.

## 1. Cloudflare login and database (Mac Terminal)

From `/Users/you_me/israelite-research`:

```sh
cd workers/book-readers
npx wrangler login
npx wrangler d1 create semitic-jew-book-readers
```

Use your existing Cloudflare account. Keep Workers on its Free plan. If a database with this name already exists, use it; do not recreate it. Copy the returned database_id into wrangler.jsonc in place of REPLACE_WITH_D1_DATABASE_ID. No account secrets belong in this file.

```sh
npx wrangler d1 migrations apply semitic-jew-book-readers --remote
```

## 2. Free Turnstile widget

In Cloudflare Dashboard > Turnstile, add a Managed widget for `semiticjew.org` and `www.semiticjew.org`. Copy the PUBLIC site key for the website. Store the SECRET key only via the following prompt:

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

Never paste the secret into chat, HTML, Git, or an issue. Copy the actual deployed workers.dev URL printed by Wrangler.

## 3. Connect and test

```sh
node configure-page.mjs 'https://YOUR-ACTUAL-WORKER.workers.dev' 'YOUR-PUBLIC-TURNSTILE-SITE-KEY'
```

The worker accepts production website origins only. To test locally, temporarily add `http://localhost:8000` to ALLOWED_ORIGINS and localhost to the widget's hostnames; deploy the Worker. Run the website's local preview from the repository root. Revert the local origin and hostname before launch.

Check: counts begin at 0; a signup with both options adds 1 to total and 1 to each format; repeated uppercase/lowercase email adds nothing; invalid/bypassed Turnstile fails. No contact details are returned by any public endpoint. Test-only records can be deleted through D1 Console; deletion triggers update counters.

Commit only this feature's files after testing. Do not include other local changes, secrets, or exported CSVs.

## 4. Launch email list

From this worker directory, when ready for the paperback announcement:

```sh
node export-paperback.mjs
```

The private CSV is saved in your Downloads folder, not the website. Import it into a dedicated Zeffy `Christian Marxism — Paperback` segment and map Email. Respect Zeffy's existing unsubscribes; do not resubscribe suppressed contacts or include ebook-only signups. Send only the requested paperback notification and include Zeffy's unsubscribe option. Verify sender/domain in Zeffy before launch. A launch email has NOT been scheduled or sent by this code.

Zeffy advertises 5,000 emails/day, or 30,000/day with a connected sending domain. At 10,000–20,000 recipients, connect your sending domain or send across days within its limits. Confirm account allowances before sending.

## Operations and privacy

D1 records include email, ebook choice, paperback consent, signup timestamp, and consent version. No payment details are collected. The public counter represents unique email signups; it does not verify Amazon sales or mailbox ownership. Only account administrators can inspect/delete/export records using Cloudflare. Delete a contact on request through D1 Console and remove/suppress them in Zeffy as appropriate. Handle preference changes through the same private support process; this form does not allow unauthenticated edits.

The included privacy-page update explains Cloudflare storage, Turnstile processing, the Zeffy paperback list, and contact@semiticjew.org for removal. Do not upload CSVs to the public repository. Review and delete temporary launch records after the campaign when no longer needed.

Stay on Free plans. Workers Free has 100,000 requests/day; D1 includes 5 million rows read/day and 100,000 rows written/day with 5 GB account storage. The three counters are maintained with database triggers, so reading counts reads one row rather than rescanning your email list. Free quotas are shared with other projects and can interrupt service if exceeded. Turnstile reduces bots but is not email verification and cannot prevent all fake signups.

Sources checked October 18, 2026:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://www.zeffy.com/home/newsletter-emailing
- https://support.zeffy.com/importing-contacts-into-zeffy-po19h
