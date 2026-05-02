#!/bin/bash
# Deploy LinkedOut to Firebase Hosting.
#
# Prereqs (one-time):
#   1. npm i -g firebase-tools
#   2. firebase login
#   3. Make sure your Firebase project has Hosting enabled in the console.
#
# Run: bash scripts/deploy_web.sh
#
# Output: https://<project-id>.web.app  (or your custom domain)
#
set -e
ROOT="/app"
cd "$ROOT"

PROJECT_ID="gen-lang-client-0540931255"

echo "==> [deploy] Production build (SSR-prerendered + static)..."
yarn build

echo "==> [deploy] Refreshing /downloads/ inside dist/ ..."
mkdir -p dist/app/browser/downloads
cp -f public/downloads/*.apk public/downloads/*.aab dist/app/browser/downloads/ 2>/dev/null || true

echo "==> [deploy] Deploying to Firebase Hosting (project: $PROJECT_ID)..."
if ! command -v firebase >/dev/null 2>&1; then
  echo "    [!] firebase CLI missing. Install with: npm i -g firebase-tools" >&2
  exit 2
fi

firebase deploy --only hosting --project "$PROJECT_ID"

echo
echo "==> Done. Live at:"
echo "    https://${PROJECT_ID}.web.app/"
echo "    https://${PROJECT_ID}.web.app/privacy.html"
echo "    https://${PROJECT_ID}.web.app/account-deletion.html"
echo "    https://${PROJECT_ID}.web.app/downloads.html"
