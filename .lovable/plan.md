

# Mailgun + Cloudflare Integration Plan

This plan covers setting up Mailgun from scratch for outbound email delivery, and Cloudflare for DNS management (SPF/DKIM/DMARC) plus Email Routing for inbound reply detection.

---

## Phase 1: Mailgun Account Setup

### 1.1 Create Mailgun Account
- Sign up at mailgun.com (Flex plan is free for low volume)
- Verify your account identity

### 1.2 Add a Sending Domain
- In Mailgun dashboard, go to **Sending > Domains > Add New Domain**
- Add the domain you want to send from (e.g., `mail.yourdomain.com` -- using a subdomain is best practice to protect your root domain's reputation)
- Mailgun will give you DNS records to add (covered in Phase 2)

### 1.3 Collect Credentials
You will need three values from Mailgun:
- **API Key**: Found in Mailgun dashboard > API Security > Private API key
- **Webhook Signing Key**: Found in Mailgun dashboard > Webhooks > Signing Key (used to verify inbound webhook payloads)
- **Sending Domain**: The domain you registered (e.g., `mail.yourdomain.com`)

---

## Phase 2: Cloudflare DNS Configuration

### 2.1 Mailgun DNS Records
In your Cloudflare DNS panel for the domain, add the records Mailgun provides:

| Type  | Name                         | Value                         | Purpose         |
|-------|------------------------------|-------------------------------|-----------------|
| TXT   | `mail.yourdomain.com`        | `v=spf1 include:mailgun.org ~all` | SPF             |
| TXT   | `smtp._domainkey.mail...`    | *(Mailgun DKIM value)*        | DKIM            |
| TXT   | `_dmarc.yourdomain.com`      | `v=DMARC1; p=none; ...`      | DMARC           |
| CNAME | `email.mail.yourdomain.com`  | `mailgun.org`                 | Tracking        |
| MX    | `mail.yourdomain.com`        | `mxa.mailgun.org` / `mxb...` | Receive (for MG) |

**Important**: Set these records to **DNS Only** (grey cloud) in Cloudflare -- do NOT proxy them.

### 2.2 Cloudflare Email Routing (Reply Detection)
To catch inbound replies on your root domain or a different subdomain:

1. In Cloudflare dashboard, go to **Email > Email Routing**
2. Enable Email Routing for the domain
3. Add a **Catch-All** or specific address rule that forwards to a webhook
4. Cloudflare Email Routing can forward to another email address, OR you can use a Cloudflare Worker to POST the inbound email to the `lcs-mailgun-webhook` edge function (or a new dedicated inbound-reply edge function)

---

## Phase 3: Wire Secrets into the Project

Once you have your Mailgun credentials, we add them as backend secrets so the edge functions and adapter can use them:

| Secret Name                    | Where Used                                    |
|--------------------------------|-----------------------------------------------|
| `MAILGUN_API_KEY`              | `mailgun-adapter.ts` (outbound sends)         |
| `MAILGUN_WEBHOOK_SIGNING_KEY`  | `lcs-mailgun-webhook` edge function (inbound) |

### 3.1 Configure Mailgun Webhooks
In Mailgun dashboard > **Webhooks**, point these events to the edge function URL:

```
https://orexplnmgolioaayhojg.supabase.co/functions/v1/lcs-mailgun-webhook
```

Events to enable: `delivered`, `failed`, `bounced`, `complained`, `opened`, `clicked`

---

## Phase 4: Inbound Reply Edge Function (New)

Create a new edge function `lcs-inbound-reply` to handle forwarded replies from Cloudflare Email Routing. This function:

1. Receives the forwarded email (from Cloudflare Worker or email-to-webhook bridge)
2. Extracts the original `communication_id` from the reply headers (In-Reply-To / References)
3. Inserts a `REPLY_RECEIVED` signal into `lcs.signal_queue`
4. Logs the event to CET

This completes the reply-detection loop that the existing `lcs-mailgun-webhook` already has stub code for (`eventName === 'replied'`).

---

## Phase 5: Update ENV Manifest

Update `docs/lcs/ENV_MANIFEST.md` to reflect the Cloudflare additions if any Worker secrets are needed.

---

## Summary of Steps (in order)

1. You create a Mailgun account and add your sending domain
2. You add Mailgun's DNS records in Cloudflare (SPF, DKIM, DMARC, MX)
3. You enable Cloudflare Email Routing for inbound replies
4. You provide me with the `MAILGUN_API_KEY` and `MAILGUN_WEBHOOK_SIGNING_KEY`
5. I wire the secrets into the project
6. I create the `lcs-inbound-reply` edge function for reply detection
7. You configure Mailgun webhooks to point at the edge function URL
8. You verify DNS propagation and send a test email

---

## Technical Details

### Files Modified
- **New**: `supabase/functions/lcs-inbound-reply/index.ts` -- Cloudflare Email Routing webhook receiver
- **Updated**: `docs/lcs/ENV_MANIFEST.md` -- document new secrets

### Files Unchanged (already correct)
- `src/app/lcs/adapters/mailgun-adapter.ts` -- outbound adapter is ready
- `supabase/functions/lcs-mailgun-webhook/index.ts` -- delivery webhook is ready
- `src/runtime/lcs/webhook-handler.ts` -- runtime handler is ready

### No Database Changes Required
The existing `lcs.event` and `lcs.signal_queue` tables already support all the event types needed.

