# Gmail Integration

GrowthLab reads Gmail OAuth credentials only from environment variables. Do not commit real
client secrets, refresh tokens, access tokens, or downloaded Google credential JSON files.

## Required Environment

Copy `.env.example` to `.env` and fill these values locally:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
```

`GOOGLE_REDIRECT_URI` should match the redirect URI configured in Google Cloud. For local
manual OAuth setup, `http://localhost` or a dedicated local callback URL is usually enough,
as long as it matches the OAuth client settings.

## Google Cloud Setup

1. Create or open a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID for a web or desktop app.
5. Add the redirect URI you will use for the OAuth authorization flow.
6. Generate a refresh token with Gmail scopes such as:

```text
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
```

Use the resulting client ID, client secret, redirect URI, and refresh token as environment
variables. Keep the refresh token private.

## Endpoints

### `PUT /gmail/oauth`

Marks Gmail as configured for a user after env credentials are available. This endpoint does
not accept or store secrets.

```json
{
  "userId": "00000000-0000-0000-0000-000000000000",
  "authorizedEmail": "user@example.com",
  "note": "Production Gmail account"
}
```

### `GET /gmail/status/:userId`

Returns whether Gmail env credentials are present and whether the user has a saved safe marker.

### `POST /gmail/send`

Sends an email through Gmail and stores the outgoing message metadata.

```json
{
  "userId": "00000000-0000-0000-0000-000000000000",
  "to": "lead@example.com",
  "subject": "Hello from GrowthLab",
  "body": "Hello!"
}
```

### `POST /gmail/sync-replies`

Scans Gmail for replies and links matching messages back to GrowthLab messages.

```json
{
  "userId": "00000000-0000-0000-0000-000000000000",
  "query": "in:inbox newer_than:30d",
  "maxResults": 25
}
```

## Error Handling

Google API errors are returned as sanitized application errors. Responses include a generic
Gmail provider failure code and status when available, but never include OAuth secrets, tokens,
or raw Google credential payloads.
