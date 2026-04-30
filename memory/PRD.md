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
- 2026-02-15 — **Splash overlay containment-block bug fixed + APK v8:**
  - **Bug**: onboarding splash carousel was rendering as an *inline panel* squeezed between the in-game scoreboard and "Today's Quests" instead of as a full-screen overlay.
  - **Root cause**: my new `.glass-panel` class on the canvas wrapper applied `backdrop-filter: blur(24px)`. CSS spec says `backdrop-filter` creates a new containing block that "traps" descendant `position: fixed` elements — so `fixed inset-0 z-[80]` on the splash was being scoped to the canvas region, not the viewport.
  - **Fix**: cut the entire onboarding `@if` block (~360 lines) from inside the canvas wrapper and re-mounted it as a sibling of `<main>` at document-root level, escaping the backdrop-filter containing-block. Marked the new location with a `<!-- ONBOARDING OVERLAY (mounted at root to escape backdrop-filter containing-block traps) -->` comment so future agents don't re-introduce the bug.
  - Verified via screenshot: splash now covers full 414×900 viewport edge-to-edge with no menu UI bleeding through.
  - **APK v8 built**: `/app/output/CorporateLadder-debug.apk` (5.8 MB), `release.apk` (2.4 MB), `release.aab` + `play-store/CorporateLadder-v8.aab` (3.6 MB). versionCode 8, versionName 1.0.8.


- 2026-02-15 — **Design consistency pass + lifetime synergy hero + APK v7:**
  - **Lifetime Synergy hero card on menu** — addressed user's "global synergy doesn't show up" feedback. Glass-panel pill in the menu greeting block shows lifetime Σ + flame streak counter side-by-side. `numerals-display` gold-gradient typography.
  - **In-game scoreboard reskinned** — 4 glass-panel cards replace the cyan brutal-bordered HUD: Run · Synergy (coral trend-up), Level (cyan stairs + smooth progress bar), Sys Load (rose gauge), Morale (emerald heart). Lifetime Σ chip nested under Run · Synergy when signed-in.
  - **Game header bar reskinned** — "Offline · Endless" / "Live · Multiplayer" pulse indicator + glass Pause/Retire pills with Phosphor icons (ph-play/ph-pause/ph-airplane-tilt).
  - **5 menu nav tiles reskinned** — Rankings / Multiplayer / Watercooler / Companies / Roast My Career — all glass-panels with Phosphor duotone icons (trophy/users-three/coffee/buildings/microphone-stage). Roast tile is gradient-coral with NEW pill, others share consistent layout: 40px rounded icon-square + Cabinet Grotesk title + small mono caption.
  - **Bottom-row panels reskinned** — old cyan/fuchsia/purple brutal-bordered "CORE_OBJECTIVES / EXEC_ACTIONS / SYS_LOGS" → glass-panel "Today's Quests / Executive Actions / Activity Feed" with Phosphor target/briefcase/receipt icons. Inner action buttons preserved (info-dense, mid-priority for next session).
  - **Mode picker upgraded** — large Phosphor duotone icon for currently-selected mode (rendered via new `modePhIcon(id)` mapper covering 24+ modes: trend-up/timer/shark-fin/eye-slash/rocket-launch/flame/buildings/arrows-clockwise/waves/hourglass-medium etc.) Native `<select>` retained for mobile compat but with caret-down + glass styling — emoji-in-options removed for a cleaner look.
  - **APK v7 / AAB v7 built** — `/app/output/CorporateLadder-debug.apk` (5.8 MB), `release.apk` (2.4 MB), `release.aab` + `play-store/CorporateLadder-v7.aab` (3.6 MB). versionCode 7, versionName 1.0.7, all R8 + ABI filters + backup-locked compliance flags retained.


- 2026-02-15 — **CRED × Swiggy Phase 1 + 2 + partial Phase 3 design migration shipped:**
  - **Phase 1 — Chassis & Typography (DONE):**
    - `index.html`: added Cabinet Grotesk via Fontshare + Phosphor Icons (regular + duotone + fill weights) via jsdelivr CDN.
    - `styles.css`: full design-token CSS variables (`--bg-base`, `--bg-surface`, `--bg-glass`, `--brand-coral` `#FC8019`, `--brand-gold` `#E5C07B`, plus terminal-cyan/rose preserved). New utility classes: `.glass-panel`, `.glass-panel-strong`, `.gold-foil-tape`, `.coral-pill`, `.font-display`, `.numerals-display` (gold gradient), `.bottom-sheet` (with `clBottomSheetIn` keyframe), `.sheet-handle`, `.tap-bounce`.
  - **Phase 2 — Auth & Onboarding (DONE):**
    - All 3 splash screens reskinned: glass-panel cards, gold-foil tape, Cabinet Grotesk display headers ("You've been hired.", "Vent. Upvote. Bond.", "Found. Wager. Dominate."), Phosphor duotone icons replacing emoji (ph-strategy/ph-tree-structure/ph-coat-hanger/ph-buildings/ph-target/ph-ghost), coral-pill Next button, atmospheric coral/gold radial blurs.
    - Auth screen converted to Swiggy bottom-sheet over CRED-style atmospheric backdrop ("Welcome to the Executive Lounge"). Pill-shaped tabs (New Hire / Returning / Guest). All form inputs use Phosphor duotone icons (ph-user-circle, ph-envelope, ph-lock-key, ph-shield-check). Coral primary CTA, gold guest CTA, white Continue-with-Google button.
    - Friendly Cabinet-Grotesk subheaders per tab ("Clock in.", "Welcome back.", "Guest pass.").
    - Bottom navigation rail uses coral-pill Next button + Phosphor arrows.
  - **Phase 3 (partial) — Home menu (DONE):**
    - Menu top bar reskinned: coral/gold gradient logo + ph-trend-up + Cabinet Grotesk wordmark; coral-pill Sign In; glass-pill Rankings/Account/Bribe-HR; flame streak chip with numerals-display gold-gradient text; gold medal-icon pill for current title.
    - Menu body: time-of-day personalized greeting ("Good evening, Sandy 👋") + "Ready to grind nothing?" Cabinet Grotesk hero + Tier-0 mono caption.
    - Mode picker as glass-panel card with rounded select + coral-pill Start button.
    - "Live from the Watercooler" hero card converted to glass-panel with rounded coral icon-bubble + Phosphor arrow-right CTA.
    - Logged-out Access-Required gate redesigned to glass-panel ("Welcome to the Executive Lounge") with gold-foil tape, coral-pill Sign In + outline gold Try-as-Guest secondary.
  - **Phase 5 (partial) — Game-over share rail (DONE):**
    - "Post to Watercooler" button promoted to coral-pill with ring + Phosphor coffee icon (highlighted as the primary share CTA per spec).
    - All 6 social share buttons reskinned to glass-panel with Phosphor duotone brand icons (ph-instagram-logo, ph-x-logo, ph-linkedin-logo, ph-tiktok-logo, ph-share-network, ph-camera, ph-chat-circle-text) in coral/pink/blue accent colors.
    - "Bribe HR" + "Post to LinkedIn" buttons rounded-full + Phosphor diamond / linkedin icons.


- 2026-02-15 — **Email/Password + Guest auth + tabbed login screen + Post-to-Watercooler:**
  - `firebase.service.ts`: added `signUpWithEmail`, `signInWithEmail`, `sendPasswordReset`, `resendVerificationEmail`, `isEmailUnverified`, `isGuest`, `signInAsGuest`, `linkGuestToEmail`, `linkGuestToGoogle`. Sends verification email automatically on sign-up; supports anonymous → permanent account upgrade preserving uid + Firestore profile.
  - `app.ts`: added `authTab`/`authEmail`/`authPassword`/`authPasswordConfirm`/`authBusy`/`authError`/`authNotice`/`authShowPassword` signals + `submitSignUp/submitSignIn/submitPasswordReset/submitGuest/submitGoogleSignIn` handlers. `friendlyAuthError(code)` maps Firebase error codes to user copy. `nextOnboardingStep()` now: when a signed-in user reaches step 3, auto-launches the existing tutorial flow via `startGame('endless')` — implementing the requested **Sign Up → Splash → Tutorial → Game** order.
  - `app.html`: Step-3 login screen rewritten as a 3-tab card — **New Hire / Returning / Guest**. Each tab has its own form, validations, error/notice banners, and password show/hide toggle. Tabs are color-coded: cyan for sign-up/in, amber for guest. Continue with Google rendered under both auth-tab forms.
  - `app.html` game-over rail: new **"Post to Watercooler #brags" button** that posts a structured Performance Review (mode/title/score/emails/doers-fired/linkedInPost excerpt) to the `#brags` channel via `fb.createWatercoolerPost`. Disabled for guests.
  - **🚨 USER ACTION REQUIRED**: enable **Email/Password** and **Anonymous** providers in Firebase Console → Authentication → Sign-in method. Verified via REST API call: currently both return `OPERATION_NOT_ALLOWED` / `ADMIN_ONLY_OPERATION`.
- 2026-02-15 — **CRED × Swiggy redesign blueprint** generated by `design_agent_full_stack` and saved to:
  - `/app/design_guidelines.json` (machine-readable spec)
  - `/app/design_guidelines.md` (human-readable, 7.6 KB) — palette, typography, spacing, motion, component-by-component plans, Phosphor Icons recommendation, 5-phase migration plan, "what to keep / what to kill" lists.


- 2026-02-15 — **Play Store policy compliance pass** (release build is now policy-clean):
  - In-app account deletion: new `DELETE_ACCOUNT` button on profile sheet → `FirebaseService.deleteAccount()` (Firestore profile + Firebase Auth revoke). Required by Play's May-2024 Account Deletion policy.
  - Public deletion URL: `/app/public/account-deletion.html` (hosted at `https://corporateladder.xyz/account-deletion.html`).
  - Privacy policy updated to reference both deletion paths.
  - AndroidManifest hardening: `usesCleartextTraffic=false`, `networkSecurityConfig`, `dataExtractionRules` (Android 12+), `backup_rules.xml`, `localesConfig`, `allowBackup=false`.
  - build.gradle hardening: R8 minify + shrinkResources ON, `proguard-android-optimize.txt`, `abiFilters armeabi-v7a/arm64-v8a` (64-bit Play requirement), Java 17 source/target, semantic `versionName=1.0.0` from `/app/.versionname`.
  - ProGuard keep rules for WebView JS bridges, Capacitor plugins, Firebase reflection. Strips `Log.v/d/i` in release.
  - `STORE_LISTING.md` rewritten with full Data Safety table, deletion URL, IARC guidance, and a 26-row Play Store compliance checklist.
- 2026-02-15 — **Exit Interview viral hook** wired into the deletion flow:
  - Captures `displayName / days-employed / lifetimeSynergy / topScore+mode / achievements` BEFORE deletion (since the profile doc is wiped right after).
  - Renders a satirical "Resignation Accepted" card with a randomized title + reason ("creative differences with reality", "to spend more time with their LinkedIn", etc.).
  - 4 share buttons: X/Twitter intent, LinkedIn share-offsite + clipboard copy, native (Capacitor on Android, Web Share API on web, clipboard fallback), and a copy-to-clipboard.
  - Share URL is UTM-tagged: `?utm_source=exit_interview` for analytics on re-onboarding clicks.
  - Sharing is fully optional — the deletion is already complete by the time the card shows.
- 2026-02-15 — **3-step onboarding splash carousel + thematic login screen**:
  - Splash 0: "YOU'VE BEEN HIRED." hero + stat grid (24+ modes / 100+ skills / 25+ skins).
  - Splash 1: "VENT. UPVOTE. BOND." with three floating mock Watercooler posts (CSS keyframe float).
  - Splash 2: "FOUND. WAGER. DOMINATE." with three feature pillars (Companies / Bounties / Ghost Race) + bar-fill animation.
  - Step 3 (login): Terminal-styled card with `cl_glitch` ACCESS REQUIRED title, boot log lines (staggered fade-in), optional handle input, sharp brutalist Google Sign-In button + anonymous-play exit.
  - Auto-shows on first visit (`localStorage.cl_onb_seen` flag); returning users go straight to step 3.
  - Replaces the old plain "Access Restricted" card on the menu with the same terminal aesthetic for consistency.
  - Animations live in `/app/src/styles.css` (cl-aurora, cl-scanlines, cl-glitch, cl-bootline, cl-float-card, cl-tape, cl-caret, cl-bar-fill, cl-dot-active, cl-splash-enter).

### Backlog (P1 / P2)
- P1 — Wire **Hook #2 (Personalized P.I.P. links)** — challenge-a-coworker landing pages with leaderboards.
- P1 — Capacitor splash screen plugin so cold-start shows branded splash instead of white flash.
- P2 — Firebase Cloud Function proxy for Gemini, so "Roast My Career" doesn't need a per-user API key.
- P2 — TikTok Open SDK for true 1-tap TikTok sharing.
- P2 — Hook #3 (Layoff Friday weekly tournament) and Hook #4 (Confessional mode in Watercooler).
- P2 — Hook #2 (Personalized P.I.P. landing pages — full flow, not just link copy).
- P2 — Continue refactor: extract Watercooler, Company HQ, Roast, Profile sheet into standalone Angular components (Phase 1 done — pure data extracted to `game-data.ts`, app.ts down 21%).
- P3 — iOS Capacitor target (requires macOS + Xcode).

## Implemented (2026-04-30 — Reskin Phase 3 + Refactor Phase 1 + Play Store v9)
- **Reskin Phase 3** to CRED × Swiggy (`glass-panel`, coral/gold, Phosphor icons): Tutorial Orientation, Wardrobe, Story / Promotion modal, Require-Login gate, Game Over Performance Review card, Skills / Leadership Training, Profile / Account drawer (now a Swiggy-style bottom sheet on mobile), Companies HQ, Multiplayer Lobby, Championship timer, menu Wardrobe / Skills entry buttons. Removed obsolete `<mat-icon>` references; consolidated all share + action buttons under `coral-pill` / `glass-panel` primitives.
- **Refactor Phase 1**: extracted ~1,300 lines of pure data (TITLES, SYNERGY/LIFETIME thresholds, STORY_EVENTS, SKILL_TREE + SkillNode interface, AVAILABLE_SKINS, AVAILABLE_MODES, AVAILABLE_AVATARS) from monolithic `app.ts` into a new `src/app/game-data.ts`. `app.ts` is down from 6,246 → 4,938 lines (-21%).
- **Play Store / GDPR / CCPA / COPPA compliance**:
  - Rewrote `public/privacy.html` as a single-page Privacy Policy + Terms of Use covering GDPR Art. 7/13/15-22 rights, UK GDPR, CCPA/CPRA (California) and other US states, COPPA, retention windows, lawful basis, data-controller details, breach-notification SLA, governing law, satire disclaimer, no-IAP / no-ads disclaimer, fictional in-game currency disclaimer.
  - **Double opt-in** on every auth flow: explicit "I agree to Privacy Policy & Terms" + "I confirm I'm 13+" checkboxes that gate the submit handler (`requireConsent()`) for sign-up, sign-in, Guest, and Google. Granular OPTIONAL "email me about updates" checkbox (off by default). Consent flags persisted to localStorage (`cl_tos_v1`, `cl_age_v1`, `cl_marketing_v1`, `cl_consent_at`).
  - **Email verification** banner in the menu: shows when `fb.isEmailUnverified()` is true, with a coral "Resend" CTA wired to `fb.resendVerificationEmail()` (already implemented in firebase.service.ts).
  - Created `output/play-store/DATA_SAFETY.md` — copy-paste reference for the Play Console Data Safety form (data types, encryption, deletion URLs, permissions justification, auto-injected permissions from Firebase/AndroidX).
- **Toolchain provisioning**: created `scripts/setup_android_toolchain.sh` — idempotent installer for JDK 21, Android SDK platform-35 + build-tools 35.0.0, qemu-user-static, amd64 libc, and the QEMU-x86_64 aapt2 wrapper. `scripts/build_apk.sh` now invokes it on every run (no manual setup needed even on a wiped pod).
- **v9 build artifacts**: `output/CorporateLadder-release.apk` (2.4 MB, R8-minified), `output/CorporateLadder-debug.apk` (5.8 MB), `output/play-store/CorporateLadder-v9.aab` (3.6 MB). Manifest verified: only `INTERNET` user-declared; `targetSdkVersion=35`, `minSdk=23`.

## Files of interest
- `angular.json` — `mobile` build configuration.
- `capacitor.config.json` — Capacitor wrapper config.
- `.versioncode` / `.versionname` — auto-bumping versionCode + semantic 1.0.0 versionName.
- `android/app/build.gradle` — R8, signing, ABI filters, Java 17, semantic versionName.
- `android/app/proguard-rules.pro` — keep rules + Log strip.
- `android/app/src/main/AndroidManifest.xml` — backup/data-extraction/locales/network-security wired.
- `android/app/src/main/res/xml/{network_security_config,backup_rules,data_extraction_rules,locales_config}.xml`
- `src/app/firebase.service.ts → deleteAccount()` — in-app account deletion.
- `src/app/app.ts` / `app.html` — main component. Reduced to 4937 lines after extracting data constants.
- `src/app/game-data.ts` — extracted constants (titles, thresholds, story, skill tree, skins, modes, avatars).
- `public/privacy.html`, `public/account-deletion.html` — required public legal pages.
- `output/play-store/STORE_LISTING.md` — full Play Console copy + compliance checklist.
- `scripts/build_apk.sh` — re-build script (re-run after edits to bump versionCode and re-sync Capacitor).
