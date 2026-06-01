#!/bin/bash
# Build Android APKs (debug + release) AND a Google Play AAB for Corporate Ladder Simulator.
# Re-run anytime after editing Angular source.

set -e

ROOT="/app"
cd "$ROOT"

# --- Load keystore credentials from /app/.env.keystore (gitignored) -----------
# This file holds CL_KEYSTORE_PASSWORD / CL_KEY_ALIAS / CL_KEY_PASSWORD for
# the LinkedOut Play Store keystore (xyz.corporateladder.linkedout). The
# build will FAIL if these are missing and gradle can't find them in the
# environment, since the new keystore has no hardcoded fallback.
if [ -f "$ROOT/.env.keystore" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env.keystore"
  set +a
  echo "==> [keystore] credentials loaded from /app/.env.keystore"
else
  echo "==> [keystore] WARNING: /app/.env.keystore not found — release signing will fail unless CL_KEYSTORE_PASSWORD/CL_KEY_PASSWORD are exported in the env."
fi

# --- Provision toolchain (idempotent — re-runs only what's missing) ---
# /opt is wiped between Kubernetes sessions, so this script can't assume the
# JDK/SDK survive. setup_android_toolchain.sh installs JDK 21, the Android SDK
# (build-tools 35.0.0 / platform-35 / platform-tools), qemu-user-static,
# amd64 libc, and the QEMU-x86_64 aapt2 wrapper at /opt/aapt2-wrapper/aapt2.
bash "$ROOT/scripts/setup_android_toolchain.sh"

# --- Toolchain (now guaranteed present) ---
export JAVA_HOME=/opt/jdk-21.0.5+11
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# --- Bump versionCode (every build is a new uploadable version) ---
VFILE="$ROOT/.versioncode"
if [ -f "$VFILE" ]; then
  CUR=$(cat "$VFILE" | tr -d '[:space:]')
  NEXT=$((CUR + 1))
else
  NEXT=2
fi
echo "$NEXT" > "$VFILE"
echo "==> versionCode bumped to $NEXT (versionName 1.0.$NEXT)"

echo "==> [1/5] Building Angular static (mobile configuration)..."
npx ng build --configuration mobile

echo "==> [2/5] Syncing web assets into Capacitor Android project..."
npx cap sync android

echo "==> [3/5] Building APKs (debug + release)..."
cd "$ROOT/android"
./gradlew --no-daemon assembleDebug assembleRelease

echo "==> [4/5] Building Play Store AAB (release)..."
./gradlew --no-daemon bundleRelease

echo "==> [5/5] Collecting outputs..."
mkdir -p "$ROOT/output" "$ROOT/output/play-store" "$ROOT/public/downloads"

cp "$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"         "$ROOT/output/LinkedOut-debug.apk"
cp "$ROOT/android/app/build/outputs/apk/release/app-release.apk"     "$ROOT/output/LinkedOut-release.apk"
cp "$ROOT/android/app/build/outputs/bundle/release/app-release.aab"  "$ROOT/output/LinkedOut-release.aab"

# Mirror APKs to the website's downloads folder
cp "$ROOT/output/LinkedOut-debug.apk"   "$ROOT/public/downloads/"
cp "$ROOT/output/LinkedOut-release.apk" "$ROOT/public/downloads/"

# Bundle the Play Store kit (versioned AAB for upload)
cp "$ROOT/output/LinkedOut-release.aab" "$ROOT/output/play-store/LinkedOut-v$NEXT.aab"

# Mirror the versioned AAB into public/downloads/ so it's reachable via the deployed
# website (downloads.html links to /downloads/LinkedOut-v$NEXT.aab).
cp "$ROOT/output/LinkedOut-release.aab" "$ROOT/public/downloads/LinkedOut-v$NEXT.aab"

# Also expose a timestamped copy so users can't accidentally pick up a stale
# cached file with the same filename from their local Downloads folder.
TS=$(date +%Y%m%d-%H%M)
cp "$ROOT/output/LinkedOut-release.aab" "$ROOT/public/downloads/LinkedOut-v${NEXT}-PlayStore-${TS}.aab"
[ -f "$ROOT/scripts/gen_play_assets.py" ] && python3 "$ROOT/scripts/gen_play_assets.py" || true

echo
echo "  Built artifacts:"
ls -lh "$ROOT/output/"
echo
echo "  Play Store kit:"
ls -lh "$ROOT/output/play-store/"
echo
echo "  versionCode    = $NEXT"
echo "  versionName    = 1.0.$NEXT"
echo "  AAB to upload  = $ROOT/output/play-store/LinkedOut-v$NEXT.aab"
echo
echo "  Signing keystore: /app/android/app/linkedout-release.keystore"
echo "  Credentials read from: /app/.env.keystore (CL_KEYSTORE_PASSWORD / CL_KEY_ALIAS / CL_KEY_PASSWORD)"
echo "  🚨 Back up BOTH the keystore file AND the .env.keystore — losing either means losing Play Store update access."
