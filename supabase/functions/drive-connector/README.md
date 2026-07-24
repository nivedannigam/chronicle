# drive-connector

Supabase Edge Function for Google Drive connector integration.

## Actions

| Action                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `ping`                | Health check                                    |
| `connect`             | Save OAuth tokens                               |
| `browse`              | Browse folders/files                            |
| `discover`            | Recursive medical file discovery (PDF/JPEG/PNG) |
| `import` / `download` | Download file to storage                        |

## OAuth token flow

The edge function loads `connector_connections` and `connector_oauth_tokens` before every Google Drive call.

- Refreshes access tokens when expiry is within **5 minutes**
- Persists refreshed `access_token` and `token_expires_at`
- Uses `Authorization: Bearer <google_access_token>` for all Google API requests
- Returns `{ success: false, error: "Google authentication expired. Please reconnect Google Drive." }` on auth failure

Structured OAuth logs: `token_state`, `refreshing_token`, `token_refreshed`, `google_api_request`, `google_api_response`.

Unit tests: `npm test -- supabase/functions/drive-connector/google-oauth-token.test.ts`

## Deploy

```bash
npx supabase functions deploy drive-connector --project-ref mqmznhyndzqtieaxaiyu
```

## Test

```bash
pnpm test:drive-connector
```

Expected response:

```json
{
	"success": true,
	"message": "Drive connector is alive"
}
```
