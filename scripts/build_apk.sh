#!/bin/bash
# Build Android APKs (debug + release) AND a Google Play AAB for Corporate Ladder Simulator.
# Re-run anytime after editing Angular source.

set -e

# --- Toolchain (required) ---
export JAVA_HOME=/opt/jdk-21.0.5+11
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

ROOT="/app"
cd "$ROOT"

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

cp "$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"         "$ROOT/output/CorporateLadder-debug.apk"
cp "$ROOT/android/app/build/outputs/apk/release/app-release.apk"     "$ROOT/output/CorporateLadder-release.apk"
cp "$ROOT/android/app/build/outputs/bundle/release/app-release.aab"  "$ROOT/output/CorporateLadder-release.aab"

# Mirror APKs to the website's downloads folder
cp "$ROOT/output/CorporateLadder-debug.apk"   "$ROOT/public/downloads/"
cp "$ROOT/output/CorporateLadder-release.apk" "$ROOT/public/downloads/"

# Bundle the Play Store kit
cp "$ROOT/output/CorporateLadder-release.aab" "$ROOT/output/play-store/CorporateLadder-v$NEXT.aab"
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
echo "  AAB to upload  = $ROOT/output/play-store/CorporateLadder-v$NEXT.aab"
echo
echo "  Signing keystore: /app/android/app/release.keystore"
echo "  (default storepass/keypass: corpladder123, alias: corporateladder)"
echo "  Override at build time via env: CL_KEYSTORE_PASSWORD, CL_KEY_ALIAS, CL_KEY_PASSWORD"
