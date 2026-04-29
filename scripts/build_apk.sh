#!/bin/bash
# Build Android APKs (debug + release) for Corporate Ladder Simulator.
# Re-run anytime after editing Angular source to refresh the APKs.

set -e

# --- Toolchain (required) ---
export JAVA_HOME=/opt/jdk-21.0.5+11
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

ROOT="/app"
cd "$ROOT"

echo "==> [1/4] Building Angular static (mobile configuration)..."
npx ng build --configuration mobile

echo "==> [2/4] Syncing web assets into Capacitor Android project..."
npx cap sync android

echo "==> [3/4] Building APKs (debug + release)..."
cd "$ROOT/android"
./gradlew --no-daemon assembleDebug assembleRelease

echo "==> [4/4] Collecting APKs into /app/output and /app/public/downloads ..."
mkdir -p "$ROOT/output" "$ROOT/public/downloads"
cp "$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"     "$ROOT/output/CorporateLadder-debug.apk"
cp "$ROOT/android/app/build/outputs/apk/release/app-release.apk" "$ROOT/output/CorporateLadder-release.apk"
cp "$ROOT/output/CorporateLadder-debug.apk"   "$ROOT/public/downloads/"
cp "$ROOT/output/CorporateLadder-release.apk" "$ROOT/public/downloads/"

echo
echo "  Built APKs:"
ls -lh "$ROOT/output/"
echo
echo "  Signing keystore: /app/android/app/release.keystore"
echo "  (default storepass/keypass: corpladder123, alias: corporateladder)"
echo "  Override at build time via env: CL_KEYSTORE_PASSWORD, CL_KEY_ALIAS, CL_KEY_PASSWORD"
