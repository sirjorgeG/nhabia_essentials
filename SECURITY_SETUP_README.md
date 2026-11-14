# Nhabia Essentials — secure review feature

## Not yet live / required setup
This package is a prepared implementation, **not a deployed or security-audited site**. The review feature will not accept submissions until setup is completed. Do not upload the included `.git` folder (it has been excluded from this package).

1. **Back up Supabase first.** Review the SQL against the existing schema; it assumes `products.id` is `bigint`/integer. If it is UUID, adapt `reviews.product_id` and the function validation.
2. In Supabase Authentication, identify the **actual owner's** `auth.users.id` UUID. Run `supabase/reviews_setup.sql` in SQL Editor, then execute the commented `insert into public.site_admins` statement with that UUID. Never substitute an email address for the UUID.
3. **Audit existing product and Storage RLS before release.** Only owner accounts should be able to add, update or delete products and upload files. The current ZIP did not include SQL policies, so this cannot be verified from the files alone.
4. Create a **Cloudflare Turnstile** widget for the production domain. Put its **public site key** in `js/review-config.js`. Set its **secret key** in Netlify environment variables as `TURNSTILE_SECRET_KEY`.
5. Set Netlify environment variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVIEW_RATE_SALT` (a long random secret). Set these for Functions scope, never put these values in JavaScript, GitHub, or screenshots. The existing public Supabase anon key is expected to be visible; privileged keys must not be.
6. Test locally with Netlify CLI (`netlify dev`), **not VS Code Live Server**, because the review submission requires a Netlify Function.
7. Test: anonymous read only approved reviews; anonymous inserts denied by RLS; captcha rejects bad tokens; rate limit rejects >3 attempts/hour per IP; non-owner signed-in users denied dashboard and updates; owner can approve/reject; HTML/script tags render as text.
8. Deploy to a **preview branch first**; check DevTools console and Netlify function logs, then deploy to production only after tests pass.
9. Review privacy notice, UK GDPR retention, spam/abuse reporting, and a method for removing personal data before launch. The current implementation stores a pseudonymous hashed IP in the rate-limit table; schedule deletion of old rate-limit rows. Avoid presenting reviews as verified purchases: no purchase verification is implemented.

## Design
- Shop cards show ~19 words with expandable original description; original images preserved.
- Public reviews show up to 5 approved reviews per product.
- No customer login required; submissions remain pending until owner approval.
- Homepage retains its original featured product descriptions and links to Shop.

## Limitations
- **No email verification yet**; it requires a transactional email provider and one-time verification tokens. Turnstile, moderation and rate limits are included, but cannot guarantee no fake reviews.
- No reliable way to guarantee uniqueness of reviews without accounts or purchase records.
- The site's existing admin product/storage permissions are not fully verifiable from the ZIP. Validate them separately.
- Production serverless security depends on correct Netlify environment variables and Supabase RLS deployment.
