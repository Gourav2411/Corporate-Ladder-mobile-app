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
- P1 — Add Capacitor splash screen plugin so cold-start shows branded splash instead of white flash.
- P1 — Bump versionCode/versionName on each rebuild (currently hardcoded `1` / `1.0`).
- P2 — Wire `@capacitor/share` so the in-game "Share P.I.P. challenge link" uses the native Android share sheet.
- P2 — Generate Play Store assets (feature graphic 1024×500, screenshots) when the user is ready to publish.
- P2 — Add iOS Capacitor target (requires macOS + Xcode, deferred per user choice).

## Files of interest
- `angular.json` — added `mobile` build configuration.
- `capacitor.config.json` — Capacitor wrapper config.
- `android/app/build.gradle` — release signing + Kotlin stdlib exclusion.
- `android/gradle.properties` — `android.aapt2FromMavenOverride` for aarch64 host.
- `scripts/build_apk.sh` — rebuild script.
- `scripts/gen_android_icons.py` — launcher-icon generator.
- `output/CorporateLadder-debug.apk`, `output/CorporateLadder-release.apk` — built APKs.
