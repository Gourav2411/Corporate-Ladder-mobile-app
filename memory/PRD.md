# LinkedOut · Corporate Ladder Simulator — Mobile (APK) Conversion

## Original problem statement
> Convert the current webapp to a mobile app and apk, expand virality with game-theory mechanics (streaks/seasons/sharing), prepare for Play Store launch, redesign UI to a "CRED × Swiggy" aesthetic, ensure GDPR/CCPA/COPPA compliance, and rebrand.

The current webapp is an **Angular 21 + SSR** game (Firebase auth, Firestore multiplayer, Tailwind v4, canvas-based runner). The user requested:
- Android only (APK + AAB)
- Keep SSR for web; add a separate static build for mobile
- No Gemini API key required at build time
- Both debug and release APKs
- **Brand**: rebranded to **LinkedOut** (subtitle: *Corporate Ladder Simulator*) — coral wordmark with gold-foil tape striking out the word "Out".

## Architecture

| Concern | Decision |
| --- | --- |
| Mobile shell | **Capacitor 7** (WebView wrapper for Android) |
| Web build (unchanged) | `ng build` (default `production` config) → SSR + Express server in `dist/app` |
| Mobile build (new) | `ng build --configuration mobile` → static SPA in `dist/app-mobile/browser` |
| Capacitor webDir | `dist/app-mobile/browser` |
| Native Android project | `android/` (Gradle, AGP 8.7.2, Kotlin 1.8.22, compileSdk 35, minSdk 23) |
| App id | `app.corporateladder.game` *(unchanged — Play Store package id is permanent)* |
| App name | **LinkedOut** *(displayed on launcher, splash, header)* |
| Launcher icon | LinkedOut wordmark — coral "Out" struck through with gold-foil tape on midnight navy. Generated via Gemini Nano Banana (`scripts/gen_logo.py`) and rasterised to all densities (`scripts/gen_android_icons.py`). |
| Release signing | Self-signed RSA 2048 keystore (100-year validity) at `/app/android/app/release.keystore` |
| Toolchain | OpenJDK 21 (Temurin), Android SDK platform-35 / build-tools 35.0.0, qemu-user-static + amd64 libc to run x86_64 build tools on this aarch64 host. Auto-provisioned via `scripts/setup_android_toolchain.sh`. |

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

## Implemented (2026-05-03 — Pseudo-3D canvas upgrade + hydration-bug fix + v18 build)
The cinematic canvas was missing true 3D depth cues. Layered three new pseudo-3D pieces and **fixed a critical Angular SSR hydration bug** that was painting every frame to a detached canvas:

1. **Vanishing-point perspective floor** (replaces the old flat carpet grid). The floor (groundLevel → canvas.height) projects as if the camera is in front of the scene looking INTO the room: vertical rays fan from a horizon vanishing point at `(canvas.width/2, groundLevel)` toward the bottom edge, plus quadratic-eased horizontal depth bands that compress near the horizon. Tier-themed depth gradient (palette.wall → palette.bg) painted under the rays. Lateral scroll on the rays + per-band scroll on the bands fakes the runner crossing tiles.
2. **Player cast shadow** — elliptical contact shadow rendered ON the ground plane *before* any limb draw. Shrinks (1.0 → 0.35) and fades (alpha 0.55 → 0.19) as the player jumps higher (`Math.max(0.35, 1 - jumpDelta/220)`). Sells the airtime.
3. **Obstacle cast shadows + depth-scale** — every obstacle now gets an ellipse shadow at `groundLevel + 4`, drawn before the obstacle box. Visual-only depth scale (1.0 at player → 0.78 at far right edge) wraps the obstacle draw in a centred translate/scale around its footing — collision boxes are unchanged so gameplay isn't affected.

### Hydration bug fix (CRITICAL)
- Iteration_1 of the testing agent surfaced a 100 % repro: in-game canvas painted **completely black** despite gameLoop firing at 75 fps and 30k+ fillRect calls/sec. Root cause: `this.ctx = canvasRef.nativeElement.getContext("2d")` was captured inside `afterNextRender(...)` in the constructor, *before* Angular hydration swapped/replaced the SSR-rendered `<canvas>` for its CSR counterpart. Every subsequent draw landed on the orphaned (detached) canvas. Visible canvas got nothing.
- Fix:
  - `actuallyStartGame()` (~`app.ts:2421`) now re-acquires `this.ctx` if `this.ctx.canvas !== this.canvasRef.nativeElement`, restarting the loop if needed.
  - `draw()` (~`app.ts:4712`) self-heals the same way at the top of every frame so any future regression is auto-corrected.
- Verified by iteration_2 of the testing agent: getImageData now returns non-zero RGB at every sampled coord (was [0,0,0,0]); visual screenshot shows tier-1 cubicle background, player, obstacles with cast shadows, perspective floor banding all rendering correctly.

### v18 artifacts
- `output/play-store/LinkedOut-v18.aab` (4.5 MB, signed) — **upload to Play Console**
- `output/LinkedOut-release.apk` (3.3 MB)
- `output/LinkedOut-debug.apk` (6.7 MB)
- Mirrored to `public/downloads/`; `downloads.html` updated to point at v18.
- Verified `versionCode=18`, `versionName=1.0.18`.

## Implemented (2026-05-03 — Watercooler titles + reply threads + v16 build)
- **Schema upgrade** (`firebase.service.ts`): `WatercoolerPost` interface gained an optional `title?: string` (≤120 chars, trimmed) and a denormalised `replyCount?: number`. New `WatercoolerReply` interface stored under `watercooler/{threadId}/replies/{replyId}` with `{authorId, authorName, content, createdAt}`. Backwards-compatible — existing posts without a title still render fine.
- **New service methods**:
  - `createWatercoolerPost(content, channel, isAnonymous, title?)` — accepts optional title; strips undefined fields before write (Firestore is strict).
  - `getWatercoolerReplies(threadId)` — orderBy `createdAt asc`, capped at 200.
  - `replyToWatercoolerPost(threadId, content, isAnonymous)` — writes reply doc + atomically `increment(replyCount, 1)` on parent (best-effort, non-fatal).
- **Composer UX**: both inline (desktop) and bottom-sheet (mobile) composers gained an optional title input above the body textarea (`data-testid="composer-title-input"` / `composer-title-input-mobile`).
- **Thread cards reskinned** to coral-glass-panel buttons (was gritty `bg-[#0A0A15]` panels). Each card shows: title (if any) in display font, body truncated to 3 lines (`line-clamp-3`), upvote button, and a `chats-circle` icon with the live `replyCount`. Tapping the card opens the new Thread Detail Sheet.
- **Thread Detail Sheet** (new fullscreen `fixed inset-0 z-[110]` overlay, `data-testid="thread-detail-overlay"`): sticky header with back button + channel breadcrumb, ring-highlighted original-post card, lazy-loaded replies list with loading spinner / empty state, and a sticky bottom reply composer with anonymous-reply toggle. Optimistic UI — replies append instantly while the network call is in flight; the parent post's `replyCount` increments locally too.
- **v16 artifacts**: `output/play-store/LinkedOut-v16.aab` (4.5 MB, signed), `output/LinkedOut-release.apk` (3.3 MB), `output/LinkedOut-debug.apk` (6.7 MB). Verified `versionCode=16`.

## Implemented (2026-05-03 — Cinematic graphics upgrade + v15 build)
The canvas runner was visually flat 2D rectangles. Layered seven new graphics passes inside `draw()` (all driven by the existing `tierPalette()` so the polish scales with career tier):
1. **Vertical sky gradient** (cached per-tier) — replaces the flat `palette.bg` fill. The world now has a sense of horizon.
2. **Distant city skyline parallax** (`drawSkyline()`) — 8 silhouetted towers scrolling at 0.2× speed, each with a deterministic-pseudo-random window grid lit in the tier accent. Adds genuine depth.
3. **Volumetric ceiling LEDs** — bright core rect + a downward-facing linear-gradient "cone" that fakes a shaft of light from each panel. `shadowBlur` 24 for subtle bloom.
4. **Glass-pane vertical sheen** on every back-wall meeting room — top-down white-alpha gradient that fakes a glossy reflection.
5. **NPC silhouettes** — three colleagues nodding around each meeting-room table (sin-bob), and one hunched colleague typing inside every cubicle (faster sin-bob), each with a tier-accent tie. Gives the office *life*.
6. **Animated monitor code + glow halo** — the code lines on each monitor now drift left over time (typing), and each screen has a tier-tinted bloom rectangle. Also: glossy floor sheen kicks in at tier 2+.
7. **Post-effects pass** (`drawPostEffects()`) — full-screen radial vignette + a 64×64 procedural film-grain canvas tiled with animated jitter (7 % alpha) + a tier-tinted top-edge light bleed. Three draw calls per frame, instant cinematic polish.
- All gradient + grain canvases are **cached** (rebuilt only on canvas resize / tier change), so framerate is unaffected on mobile.
- Code style: clear section banners (`GRAPHICS LAYER X / 7 — ...`) explain what each block does and why the order matters.
- **v15 artifacts**: `output/play-store/LinkedOut-v15.aab` (4.4 MB, signed), `output/LinkedOut-release.apk` (3.3 MB), `output/LinkedOut-debug.apk` (6.7 MB). Verified `versionCode=15`. `public/downloads/` + `downloads.html` refreshed.

## Implemented (2026-05-02 — Menu HUD bleed-through fix + v14 build)
- **Bug**: the `Synergy Boost Active · 2× Combo Multiplier` banner (and the Sabotage / Achievement HUD overlays) were rendering on the menu screen, leaking ON TOP of the "Working late, …  Ready to grind nothing?" greeting on mobile. Cause: those three HUD overlays only checked their own state signal (`synergyBoostTimer() > 0`, `sabotageText`, `achievements.onAchievementUnlocked()`) without gating on the game state, so they fired anywhere — including the menu — for as long as the timers from the previous run were still alive.
- **Fix**: gated all three HUD overlays with `&& gameState() === 'playing'` so they only render mid-game. The signals themselves are unchanged (so they keep ticking down), but their UI is hidden outside gameplay.
- **v14 artifacts**: `output/play-store/LinkedOut-v14.aab` (4.4 MB, signed), `output/LinkedOut-release.apk` (3.3 MB), `output/LinkedOut-debug.apk` (6.7 MB). Verified `versionCode=14`, `application-label='LinkedOut'`. `public/downloads/` + `downloads.html` refreshed to point at v14.

## Implemented (2026-05-02 — Mobile promotion-card overflow fix + v13 build)
- **Mobile overflow fix for the promotion ceremony** (`gameState() === 'story'`): the overlay was rendering `absolute inset-0` inside the canvas wrapper (~300px tall on mobile), so the gold-foil tape and title were bleeding beyond the viewport edge. Fixed by:
  - `absolute inset-0 z-30` → `fixed inset-0 z-[60]` (escapes the canvas container, covers full viewport)
  - Added `overflow-x-hidden` on the overlay + `overflow-hidden` on the card so no element can bleed horizontally.
  - Atmospheric glow: `w-[600px]` → `w-[min(600px,100vw)]` (clamped to viewport on narrow screens).
  - Card: `max-w-2xl` → `max-w-[calc(100vw-1.5rem)] sm:max-w-2xl` (fits mobile width minus a 0.75 rem side margin).
  - Gold-foil tape: `text-base sm:text-lg` → `text-xs sm:text-lg` + `whitespace-nowrap` + dropped redundant `inline-block`. Tape rotation now contained inside its card.
  - Typography: H2 `text-3xl` → `text-2xl` mobile. All prose blocks gained `break-words max-w-full` so long words wrap instead of overflowing.
  - Tier ring icon: `w-24 h-24`/`text-5xl` → `w-20 h-20`/`text-4xl` on mobile.
  - "Accept Promotion" CTA: `w-full sm:w-auto` — full-width tap target on mobile.
- **v13 artifacts**: `output/play-store/LinkedOut-v13.aab` (4.4 MB, signed), `output/LinkedOut-release.apk` (3.3 MB), `output/LinkedOut-debug.apk` (6.7 MB). Verified `versionCode=13`, `application-label='LinkedOut'`.
- `public/downloads/` refreshed with v13 files; `downloads.html` updated to point at `LinkedOut-v13.aab`.

## Implemented (2026-05-02 — Deployment readiness for APK + AAB + web)
- Created `/app/public/downloads.html` — a styled landing page with direct download buttons for APK (debug + release) and AAB.
- Mirrored artifacts into `/app/public/downloads/`: `LinkedOut-debug.apk` (6.7 MB), `LinkedOut-release.apk` (3.3 MB), `LinkedOut-release.aab` (4.4 MB), `LinkedOut-v12.aab` (4.4 MB).
- **Source-code deployment fixes** (per `deployment_agent` review):
  - `src/server.ts` port default 4000 → 3000, host now binds 0.0.0.0.
  - `package.json` `start` is now `ng build && node dist/app/server/server.mjs` (production-grade SSR for K8s pod restarts). Old `ng serve` lives at `start:dev`.
  - All 6 hardcoded URL fallbacks in `src/app/app.ts` (LinkedIn share, copy invite, exit interview, etc.) routed through a single `appUrl()` helper that prefers `window.location.origin`, then `process.env.APP_URL`, then the Firebase Hosting fallback only as last resort.
- **Deployment path locked in: Firebase Hosting** (Emergent native deployment doesn't support Angular SSR — confirmed via support_agent). Created:
  - `/app/firebase.json` — points to `dist/app/browser`, SPA rewrites, custom MIME headers for APK/AAB downloads.
  - `/app/.firebaserc` — links to project `gen-lang-client-0540931255` (existing Firebase project).
  - `/app/scripts/deploy_web.sh` — one-command deploy: `bash scripts/deploy_web.sh`.
- Verified end-to-end: `node dist/app/server/server.mjs` listens on `0.0.0.0:3000`, HTTP 200 on `/`, `/downloads.html` (6.7 KB), `/downloads/LinkedOut-v12.aab` (4.6 MB served correctly).

## Implemented (2026-05-01 — Game UI overhaul + Subway-Surfer escalation + v12 build)
- **Mode picker reskin** (`src/app/app.html` lines ~365): replaced the single `<select>` dropdown with a vivid CRED-style horizontal-snap card carousel (mobile) / 2-col grid (desktop). Each card has a mode-tinted radial glow (24 unique colours via `modeColor()`/`modeGradient()`), Phosphor duotone icon, name, description, and a difficulty chip with a flame icon (Cosy → Cataclysmic). Selected card shows a coral ring + "Selected" pulse pill. CTA pill displays the chosen mode name in a gold-foil tape pill.
- **Promotion ceremony glow-up** (`gameState() === 'story'`): layered atmospheric glows + 15 falling confetti particles (CSS `confetti-fall` keyframe), gold-foil "Promotion · Granted" tape with `slam-in` cubic-bezier animation, a glowing tier ring with the new Crown icon, the new title slammed in coral, and a "Drip Unlocked · Auto-Equipped" reveal card showing the wardrobe skin that just unlocked at this tier.
- **Auto-skin reveal**: each promotion now finds the matching `AVAILABLE_SKINS` entry whose `unlockLevel === levelIndex+1` and auto-equips it. Drives the dress-change moment in the ceremony.
- **Subway-Surfer-style difficulty curve**: speed cap raised 11 → 14, ramp interval 500 → 400 frames (`+0.6` per ramp), per-promotion +0.6 speed bump, obstacle-spawn floor lowered (18 frames @ tier 5 vs old hard-25 floor), additional `tierBoost = tier * 3` reduces spawn interval per tier. Result: each promotion makes the runner faster + more frequent obstacles.
- **Tier-based background palette** (`TIER_PALETTES`): 6 themed environments — Cubicle Farm (cyan), Open Office (warm cyan), Glass Tower (teal), Boardroom (coral), Penthouse (gold), Server Hellscape (crimson). The canvas `draw()` function pulls every fill colour (BG, walls, panels, desks, monitor screens, ceiling LEDs, code lines, charts, carpet) from the active palette via `tierPalette()`. Wardrobe persists across tiers; environment shifts on every promotion.
- **HUD reskin**: achievement-unlock toast → glass-panel + slam-in animation; Sabotage overlay → coral-rose glass; Synergy Boost banner → emerald glass with lightning icon; Ghost-runner HUD pill → glass-panel with phosphor medal icon; keyboard cheat-sheet → glass-panel pill.
- **Tier Progress Strip** (under the header during gameplay): a Subway-Surfer-style permanent HUD strip showing current Title + crown icon tinted with tier accent + "Next · {next title}" + a 0–100 progress bar gradient (tier accent → coral) tracking synergy toward the next promotion threshold. Computed via `progressToNextPromotion()` against `STORY_EVENTS` keys.
- **v12 artifacts**: `output/play-store/LinkedOut-v12.aab` (4.4 MB, signed, **upload to Play Console**), `output/LinkedOut-release.apk` (3.3 MB), `output/LinkedOut-debug.apk` (6.7 MB). Manifest verified: `application-label='LinkedOut'`, `versionCode=12`.

## Implemented (2026-04-30 — Rebrand to LinkedOut + v11 build)
- **Brand: LinkedOut** — generated a premium app icon via Gemini Nano Banana (`gemini-3-pro-image-preview`): bold "Linked" in white over coral "Out" struck through with a tilted warm-gold-foil tape strip on midnight-navy with a coral-upper-right + gold-lower-left radial-glow backdrop. Sources: `output/play-store/icon-1024-source.png`, `output/play-store/icon-512.png`, `public/icon-512.png`. Reproducible via `python3 scripts/gen_logo.py`.
- **Android launcher**: rasterised all five mipmap densities (mdpi → xxxhdpi) for legacy round-rect, legacy circle, adaptive foreground, plus monochrome (Android 13+ themed icon). Adaptive XMLs at `mipmap-anydpi-v26/`. `values/ic_launcher_background.xml` set to `#050510`.
- **Feature graphic** (1024×500) regenerated by `scripts/gen_feature_graphic.py` — left-side rounded icon thumbnail, right-side tagline "The grind. Gamified. Quietly." in DejaVu Black + gold subtitle "Corporate Ladder Simulator".
- **Text rebrand**: `app_name` and `title_activity_main` in `strings.xml`, `appName` in `capacitor.config.json`, `<title>` in `index.html`, splash hero in `app.html`, header brand pill, `LINKEDOUT_OS` status bar, `linkedInPost` / `slackPost` / native-share copy / IG/Twitter/LinkedIn/TikTok templates / Roast footer / company-invite / runtime share fallbacks all switched to LinkedOut. `package.json` name: `linkedout`.
- The fictional in-game employer **stays** as "Corporate Ladder Inc." — intentional double-layered satire (the **app** is *LinkedOut*, the **company** that fires you is *Corporate Ladder Inc.*).
- **Privacy + Terms + Data Safety + Store Listing** updated to "LinkedOut · Corporate Ladder Simulator" subtitle. Play Store app-name field shortened to **"LinkedOut: Climb the Ladder"** (27/30 chars).
- **v11 artifacts**: `output/play-store/LinkedOut-v11.aab` (4.4 MB, signed, **upload this to Play Console**), `output/LinkedOut-release.apk`, `output/LinkedOut-debug.apk`. Manifest verified: `application-label='LinkedOut'`, `versionCode=11`.

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
