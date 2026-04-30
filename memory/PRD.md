# Corporate Ladder Simulator — Mobile (APK) Conversion

## Original problem statement
> Convert the current webapp to a mobile app and apk

The current webapp is an **Angular 21 + SSR** game called *Corporate Ladder Simulator* (Firebase auth, Firestore multiplayer, Tailwind v4, canvas-based runner). The user requested:
- Android only (APK)
- Keep SSR for web; add a separate static build for mobile
- No Gemini API key required at build time
- Both debug and release APKs
- Keep current branding & icon

## Architecture

| Concern | Decision |
| --- | --- |
| Mobile shell | **Capacitor 7** (WebView wrapper for Android) |
| Web build (unchanged) | `ng build` (default `production` config) → SSR + Express server in `dist/app` |
| Mobile build (new) | `ng build --configuration mobile` → static SPA in `dist/app-mobile/browser` |
| Capacitor webDir | `dist/app-mobile/browser` |
| Native Android project | `android/` (Gradle, AGP 8.7.2, Kotlin 1.8.22, compileSdk 35, minSdk 23) |
| App id | `app.corporateladder.game` |
| App name | "Corporate Ladder Simulator" |
| Launcher icon | Custom — dark `#050510` adaptive icon with cyan rising-chart motif (matches in-game UI) |
| Release signing | Self-signed RSA 2048 keystore (100-year validity) at `/app/android/app/release.keystore` |
| Toolchain | OpenJDK 21 (Temurin), Android SDK platform-35 / build-tools 35.0.0, qemu-user-static + amd64 libc to run x86_64 build tools on this aarch64 host |

## Implemented
- 2026-01-29 — Added Capacitor + Android wrapper:
  - `angular.json`: new `mobile` configuration (no SSR, `baseHref: "./"`, larger budgets for the canvas-heavy bundle).
  - `capacitor.config.json`: appId, appName, webDir.
  - `android/`: created via `npx cap add android`; signing config wired into `app/build.gradle`.
  - Kotlin stdlib duplicate-class conflict resolved (excluded `kotlin-stdlib-jdk7` / `kotlin-stdlib-jdk8`).
  - AAPT2 wrapper at `/opt/aapt2-wrapper/aapt2` (qemu-x86_64-static) to run the x86_64-only AAPT2 on this aarch64 container; configured via `android.aapt2FromMavenOverride` in `gradle.properties`.
  - Custom adaptive launcher icons generated for all densities by `scripts/gen_android_icons.py`.
  - `scripts/build_apk.sh` one-shot rebuild script.
- Built and verified APKs:
  - `/app/output/CorporateLadder-debug.apk` (4.1 MB, debug-signed)
  - `/app/output/CorporateLadder-release.apk` (3.2 MB, release-signed; v1+v2 signatures verified by apksigner)
  - Mirrored to `/app/public/downloads/` for direct download via the SSR web app.

## Verified
- Mobile static build succeeds (`ng build --configuration mobile`).
- SSR production build still works unchanged (`ng build --configuration production` → `dist/app`).
- `apksigner verify` confirms both APKs are properly signed (v1 + v2 schemes).
- `aapt2 dump badging` confirms package id, app name, min/target SDK, launcher icon all correct.

## Known caveats (documented in /app/output/README.md)
- Firebase Google Sign-In popup runs against `https://localhost` inside the WebView. The user must add `localhost` to *Firebase → Authentication → Authorized domains* for Google sign-in to work in the APK. Anonymous gameplay works without sign-in.
- Initial network access required to load Firestore/Material assets; gameplay itself runs offline.

## Next Action Items / Backlog

### Done in this session (Feb 2026)
- 2026-02-15 — **Play Store policy compliance pass** (release build is now policy-clean):
  - In-app account deletion: new `DELETE_ACCOUNT` button on profile sheet → `FirebaseService.deleteAccount()` (Firestore profile + Firebase Auth revoke). Required by Play's May-2024 Account Deletion policy.
  - Public deletion URL: `/app/public/account-deletion.html` (hosted at `https://corporateladder.xyz/account-deletion.html`).
  - Privacy policy updated to reference both deletion paths.
  - AndroidManifest hardening: `usesCleartextTraffic=false`, `networkSecurityConfig`, `dataExtractionRules` (Android 12+), `backup_rules.xml`, `localesConfig`, `allowBackup=false`.
  - build.gradle hardening: R8 minify + shrinkResources ON, `proguard-android-optimize.txt`, `abiFilters armeabi-v7a/arm64-v8a` (64-bit Play requirement), Java 17 source/target, semantic `versionName=1.0.0` from `/app/.versionname`.
  - ProGuard keep rules for WebView JS bridges, Capacitor plugins, Firebase reflection. Strips `Log.v/d/i` in release.
  - `STORE_LISTING.md` rewritten with full Data Safety table, deletion URL, IARC guidance, and a 26-row Play Store compliance checklist.

### Backlog (P1 / P2)
- P1 — Wire **Hook #2 (Personalized P.I.P. links)** — challenge-a-coworker landing pages with leaderboards.
- P1 — Capacitor splash screen plugin so cold-start shows branded splash instead of white flash.
- P2 — Firebase Cloud Function proxy for Gemini, so "Roast My Career" doesn't need a per-user API key.
- P2 — TikTok Open SDK for true 1-tap TikTok sharing.
- P2 — Hook #3 (Layoff Friday weekly tournament) and Hook #4 (Confessional mode in Watercooler).
- P2 — Refactor the >5500-line `app.ts` / `app.html` into per-feature standalone components (Watercooler, Company HQ, Roast).
- P3 — iOS Capacitor target (requires macOS + Xcode).

## Files of interest
- `angular.json` — `mobile` build configuration.
- `capacitor.config.json` — Capacitor wrapper config.
- `.versioncode` / `.versionname` — auto-bumping versionCode + semantic 1.0.0 versionName.
- `android/app/build.gradle` — R8, signing, ABI filters, Java 17, semantic versionName.
- `android/app/proguard-rules.pro` — keep rules + Log strip.
- `android/app/src/main/AndroidManifest.xml` — backup/data-extraction/locales/network-security wired.
- `android/app/src/main/res/xml/{network_security_config,backup_rules,data_extraction_rules,locales_config}.xml`
- `src/app/firebase.service.ts → deleteAccount()` — in-app account deletion.
- `src/app/app.ts` / `app.html` — `DELETE_ACCOUNT` button + confirmation modal on profile sheet.
- `public/privacy.html`, `public/account-deletion.html` — required public legal pages.
- `output/play-store/STORE_LISTING.md` — full Play Console copy + compliance checklist.
- `scripts/build_apk.sh` — re-build script (re-run after edits to bump versionCode and re-sync Capacitor).
