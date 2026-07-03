# `dispatch-units` Edge Function

Assignment engine + Telegram notifier for the Emergency Event Orchestrator.

## What it does

1. Receives `{ incident_id, agency_types? }` from the authenticated client.
2. Calls `public.dispatch_nearest_units(p_incident_id, p_agency_types)` — Haversine-based selection of the nearest active `response_unit` per agency type, atomic insert into `dispatched_units`, action/audit log entries.
3. If at least one unit was dispatched, sends a Telegram MarkdownV2 message via `api.telegram.org/bot<token>/sendMessage`.
4. Logs the notification result (success or failure) via `public.log_notification_result`. **Telegram failures never undo the assignment.**

## One-time setup

The function is already deployed to project `wtheslxthulgwlsyktxz`. Before it can send Telegram messages you must set two secrets.

### 1. Create a Telegram bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather).
2. `/newbot`, follow prompts, copy the **HTTP API token** (looks like `1234567890:AAH...`).
3. Add the bot to your operations group/channel.
4. **Send one message** in the group so the bot has something to pick up.

### 2. Find the chat_id

In a browser, open:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Look for `"chat":{"id": -1001234567890, ...}` — groups have negative IDs, channels start with `-100`. Copy that number.

### 3. Set the secrets in Supabase

Studio → **Project Settings → Edge Functions → Secrets** → add:

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_CHAT_ID`   | the chat id from step 2, e.g. `-1001234567890` |

Or via the CLI:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
```

### 4. Test end-to-end

From the responder dashboard, open an incident in `acknowledged` status and click **Dispatch Nearest Units**. Within ~1s a message should appear in your Telegram group.

To test without the UI, call the function directly:

```bash
curl -X POST https://wtheslxthulgwlsyktxz.supabase.co/functions/v1/dispatch-units \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"incident_id":"INC-2024-001"}'
```

## Response shape

```json
{
  "ok": true,
  "count": 3,
  "dispatched": [
    {
      "agency_type": "Hospital",
      "unit_id": "RU-HOSP-002",
      "dispatched_id": "DU-abc...",
      "unit_name": "King Saud Medical City - Ambulance 2",
      "agency_name": "King Saud Medical City",
      "distance_km": 1.42,
      "dispatched_at": "2026-05-11T..."
    }
  ],
  "skipped": [],
  "notification": { "channel": "Telegram", "ok": true, "detail": "message_id=42" }
}
```

If Telegram fails, `notification.ok === false` and `notification.detail` carries the upstream error. The dispatch is still recorded in `dispatched_units` and visible in the UI.

## Security

- `verify_jwt: true` — every request must carry a valid Supabase user JWT.
- The function forwards that JWT to `dispatch_nearest_units`, which uses `auth.uid()` to enforce role gates (`admin` or `responder`).
- Secrets live only in the Edge Function environment — never in the browser bundle.
