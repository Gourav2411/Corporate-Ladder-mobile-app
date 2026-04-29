# Corporate Ladder Simulator — Android APKs

The Angular web app has been wrapped in **Capacitor** to produce native Android APKs.
The original SSR web build is **untouched** — `npm run dev` and `ng build` (default) still produce the SSR site.

## What's in this folder

| File | Size | Use |
| --- | --- | --- |
| `CorporateLadder-debug.apk`   | ~4 MB | Sideload on any phone for testing. Signed with the standard Android debug key. |
| `CorporateLadder-release.apk` | ~3 MB | Production-style APK, signed with a self-generated release key. |

Both APKs install the same app:
- Package id: `app.corporateladder.game`
- App name: **Corporate Ladder Simulator**
- minSdk 23 (Android 6+), targetSdk 35 (Android 15)
- Adaptive launcher icon on dark `#050510` background

## Install on a phone

1. Copy either APK to your Android device (USB, email, Drive, etc.).
2. Open the file → Android will ask to allow "Install from unknown source" → grant.
3. Tap **Install**.

Or via ADB on a connected device:

```
adb install -r /app/output/CorporateLadder-release.apk
```

## In-app caveats (Android wrapper)

- **Google Sign-In:** Firebase popup-based Google auth uses `https://localhost` inside the WebView.
  In Firebase Console → *Authentication → Settings → Authorized domains*, add **`localhost`** so sign-in succeeds. Anonymous play continues to work without sign-in.
- **Multiplayer / Watercooler / Leaderboards:** Continue to use the existing Firestore project — no changes.
- **Network required** the first time to load Firebase / Material icons; gameplay itself runs offline.

## Rebuilding the APK after Angular source changes

```
bash /app/scripts/build_apk.sh
```

This script:
1. Runs `ng build --configuration mobile` (static SPA → `dist/app-mobile/browser`)
2. Syncs assets into the Android project (`npx cap sync android`)
3. Runs Gradle `assembleDebug` and `assembleRelease`
4. Copies fresh APKs to `/app/output/` and `/app/public/downloads/`

## Release-key info

- Keystore path: `/app/android/app/release.keystore`
- Default credentials (override with env vars at build time):
  - `CL_KEYSTORE_PASSWORD` (default `corpladder123`)
  - `CL_KEY_ALIAS` (default `corporateladder`)
  - `CL_KEY_PASSWORD` (default `corpladder123`)
- Validity: 100 years (RSA 2048)

> ⚠️ Keep the keystore safe — it is required for every future Play Store update of this app.

## What was added vs the original repo

- `angular.json` — new `mobile` build configuration that produces a static SPA at `dist/app-mobile/browser` (no SSR), with `baseHref: "./"` for file:// loading inside Capacitor.
- `capacitor.config.json` — Capacitor config (appId, appName, webDir).
- `android/` — auto-generated Capacitor Android project with brand icons, signing config and Kotlin stdlib conflict fix.
- `scripts/gen_android_icons.py` — regenerates launcher icons from a stylized chart-up motif matching the in-game cyan aesthetic.
- `scripts/build_apk.sh` — one-shot build script.
- `public/downloads/*.apk` — convenient download links (served by the SSR/dev web app).

The web (SSR) build is unaffected — `ng build` still produces the SSR server bundle exactly as before.
