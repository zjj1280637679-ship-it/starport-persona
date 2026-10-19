# 《九州沉浮录》AI-only rotating invitation

This protects **only** the shared paid API route `POST /api/jiuzhou/turn`. The static GitHub Pages site, illustrations and offline game require **no** invitation. Other Worker routes are unchanged.

## Deploy

1. Merge/deploy the Worker patch and the companion `jiuzhou-chronicles` front-end patch.
2. Open Cloudflare Dashboard → Workers & Pages → `starport-deepseek-gateway` → Settings → Variables and Secrets.
3. Add a **Secret** (never a public Variable): name `JIUZHOU_INVITE_CODE`, value a hard-to-guess case-sensitive code, ideally at least 20 random characters (min 8, max 128).
4. Save/deploy the change in Cloudflare. Do **not** put the code into `wrangler.toml`, GitHub Secrets, front-end JavaScript, issue comments or screenshots.
5. Visit the public game and play its local mode; no code is needed. Trigger DeepSeek AI for the first time. The visitor sees a password-like "解锁 AI 剧情" dialog. The code is stored **in memory only** for this open page; every API turn transmits it via HTTPS.
6. For **rotation**, edit the Cloudflare **same Secret** value and save/deploy. The Worker compares against the Secret on **every** AI call. After the replacement deployment propagates, old invitations return HTTP 401 `invite_invalid` and the browser clears its cached in-memory code, asking for the new one next time.

## Fail-closed behavior

- No Secret configured or invalid Secret length → HTTP 503 `invite_not_configured`, no DeepSeek request.
- Missing, wrong or expired/rotated code → HTTP 401 `invite_invalid`, no DeepSeek request.
- Valid code → passes the invitation gate, then proceeds to the Worker’s other existing controls and normal DeepSeek request.
- `/health` exposes only `inviteRequired` and `inviteConfigured`; **never** the actual code.
- Clients cannot use Origin spoofing to bypass invitation verification; the Worker checks every shared AI POST.
- The invitation **can be shared by an invited visitor**. It is a shared access code, not individual account authentication; a full user-based account system would be needed for user-level revocation or attribution.

The game intentionally continues to work locally without AI even while the invitation has not been configured. This change does not restore an IP rate limit, and other ongoing branch work may independently remove Turnstile and limits from the Jiuzhou route.
