#!/usr/bin/env bash
#
# Verify Better Auth session-cookie attributes against the running app.
# Catches regressions in convex/auth.ts `defaultCookieAttributes` (e.g.
# a sloppy edit dropping `HttpOnly` or flipping `SameSite=None`).
#
# Requirements: `pnpm dev` (or prod equivalent) running, plus TEST_EMAIL +
# TEST_PASSWORD env vars pointing at a verified account. Otherwise the
# script no-ops with a friendly skip so it doesn't fail CI by default.
#
# Usage:
#   TEST_EMAIL=alice@test.local TEST_PASSWORD=… pnpm test:cookies
#   BASE_URL=https://albo.team … pnpm test:cookies     # prod (expect Secure)

set -euo pipefail

URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${TEST_EMAIL:-}"
PASSWORD="${TEST_PASSWORD:-}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "test:cookies — skipped (set TEST_EMAIL and TEST_PASSWORD to enable)"
  exit 0
fi

echo "test:cookies — POST $URL/api/auth/sign-in/email"
RESP=$(
  curl -sS -i -X POST "$URL/api/auth/sign-in/email" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
)

COOKIE_LINES=$(echo "$RESP" | grep -i "^set-cookie:" || true)
if [[ -z "$COOKIE_LINES" ]]; then
  echo "FAIL: no Set-Cookie header in response"
  echo "$RESP" | head -20
  exit 1
fi

SESSION_LINE=$(echo "$COOKIE_LINES" | grep -i "albo\." | head -1 || true)
if [[ -z "$SESSION_LINE" ]]; then
  echo "FAIL: no albo.* cookie set on sign-in"
  echo "$COOKIE_LINES"
  exit 1
fi

require() {
  if ! echo "$SESSION_LINE" | grep -iq "$1"; then
    echo "FAIL: cookie missing '$1'"
    echo "  $SESSION_LINE"
    exit 1
  fi
}

require "HttpOnly"
require "SameSite=Lax"

if [[ "$URL" == https://* ]]; then
  require "Secure"
fi

echo "OK: session cookie attrs verified"
echo "  $SESSION_LINE"
