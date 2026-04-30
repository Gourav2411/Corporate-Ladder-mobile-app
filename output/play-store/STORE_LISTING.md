# Play Store Listing Kit — LinkedOut · Corporate Ladder Simulator

Everything you need to fill in the Google Play Console store listing. Copy/paste each section into the matching field. **Read the [Compliance Checklist](#-play-store-compliance-checklist) at the bottom — every item is satisfied by the current build, but a few rows have user-side actions you must complete (privacy URL hosting, screenshots, IARC questionnaire).**

---

## 📦 What's in this folder

| File | Use it for |
| --- | --- |
| `CorporateLadder-v{N}.aab` | The Android App Bundle to upload (latest build) |
| `icon-512.png` | "App icon" — Play Console → Main store listing → Graphics |
| `feature-graphic-1024x500.png` | "Feature graphic" — same screen |
| `promo-graphic-180x120.png` | Optional "Promo graphic" (legacy slot, fine to skip) |
| `STORE_LISTING.md` (this file) | Listing copy below |

⚠️ Screenshots (phone, 1080×1920+ recommended) are NOT generated — capture them on a real phone after sideloading the APK. Aim for 4–8 screenshots: home with Watercooler hero, mid-run, game-over performance review, Companies HQ, Roast My Career card, profile sheet showing the new DELETE_ACCOUNT button.

---

## 📝 Store Listing Copy

### App name (30 char max)
```
LinkedOut: Climb the Ladder
```

> Note: the Play Console limit is **30 characters** for the app name. The text above is 27 chars. The full long-form "LinkedOut · Corporate Ladder Simulator" is used as the H1 across the web, the splash, and inside the listing copy below.

### Short description (80 char max)
```
A satirical workplace runner. Climb the ladder by doing absolutely no real work.
```

### Full description (4000 char max)
```
You've been hired. Your only job: climb the corporate ladder by doing absolutely no actual work.

LinkedOut is the satirical endless runner about modern workplaces — a love letter (and roast) to PIPs, layoffs, "synergy", forced returns to office, and that one Tuesday meeting that should have been an email.

🎮 24+ GAME MODES
Endless mode, Championship season, Hostile Takeover, Quiet Quitting, and twenty more — each a different flavor of corporate dystopia.

📈 100+ SKILLS, 25+ SKINS
Earn synergy. Unlock the skill tree. Equip the cursed haircut. Become the executive your therapist warned you about.

☕ THE WATERCOOLER
A real-time channel of anonymous workplace confessions. Vent. Upvote. Found a private channel for your friends. Or a satirical one for your enemies.

🏢 COMPANIES (UP TO 20 SEATS)
Found your own company. Recruit friends with a 6-character join code. Run a private leaderboard. Lay people off. Reinstate them when you feel guilty.

🎯 BOUNTY BOARD
Wager synergy on a target score. Anyone in the world who beats it, claims it. Pure stakes, instant claims.

👻 GHOST RACE
Race yesterday's #1 in any mode. The ghost of the high score creeps up your screen in real time. Beat them and confetti rains.

🔥 STREAKS, SEASONS & HALL OF FAME
Daily streak rewards. Weekly leaderboard resets every Monday at 00:00 UTC. Last week's top 3 immortalized in the Hall of Fame.

🤖 AI PERFORMANCE REVIEW
At any time, tap "Roast My Career". The AI HR system writes a brutally satirical performance review of your real career and assigns you a fictional new title.

📲 ONE-TAP SHARE
Send your auto-generated LinkedIn-style performance card directly to Instagram Stories, X, LinkedIn, or TikTok. Each share is a unique, custom image.

🛑 P.I.P. YOUR FRIENDS
Generate a personalized "Performance Improvement Plan" challenge link. Send it to a coworker. Watch them try to beat your score. Pettiness as a service.

No ads. No in-app purchases. No energy timers. Just an honest game about a dishonest job.

Built by a tired knowledge worker, for tired knowledge workers.
```

### Category
```
Game · Casual
```

### Tags
```
runner · satire · arcade · casual · workplace · multiplayer · leaderboard · daily · friends · streak
```

---

## 📜 Mandatory URLs (Play Console → Main store listing & App content)

| Play Console field | URL |
| --- | --- |
| Privacy policy URL | `https://corporateladder.xyz/privacy.html` |
| **Account deletion URL** (required since May 2024 for any app with sign-in) | `https://corporateladder.xyz/account-deletion.html` |
| Marketing / website (optional) | `https://corporateladder.xyz/` |

Both `privacy.html` and `account-deletion.html` are static files in `/app/public/` and are served automatically by the SSR build at `corporateladder.xyz`. **Verify both URLs return 200 OK in an incognito window** before submitting the listing.

---

## 🔧 App Content answers (Play Console → "App content" sidebar)

- **App access:** All functionality available without restrictions. (Mention that anonymous play works without sign-in; sign-in unlocks leaderboards / Watercooler / Companies.)
- **Ads:** No.
- **Content ratings:** Run the IARC questionnaire — answer "no" to all violence/sex/drugs/gambling prompts, "yes" only to "satire / dark humor / mild profanity". Expected rating: **Teen (13+)** in most regions, **PEGI 12** in EU.
- **Target audience:** 13+ (satirical content not suited to younger audiences). Do **not** opt into the Designed-for-Families program.
- **News app:** No.
- **Government app:** No.
- **Financial features:** No.
- **Health features:** No.
- **COVID-19 contact tracing:** No.

### Data Safety form (Play Console → App content → Data safety)

This MUST match what the app actually collects. Use these exact answers:

#### Data collected
| Data type | Collected? | Optional? | Purpose | Shared? | Encrypted in transit? | Can user request deletion? |
| --- | --- | --- | --- | --- | --- | --- |
| **Personal info → Email address** | Yes | Optional (only if user signs in) | Account management, App functionality | No | Yes | Yes |
| **Personal info → Name** | Yes | Optional (only if user signs in) | Account management, App functionality | No | Yes | Yes |
| **Personal info → User IDs** | Yes | Optional (only if user signs in) | Account management, App functionality | No | Yes | Yes |
| **App activity → In-app actions** | Yes | Optional | Analytics, App functionality | No | Yes | Yes |
| **App activity → Other user-generated content** | Yes | Optional (Watercooler / Bounties / Companies posts only) | App functionality | No | Yes | Yes |

Everything else: **No, not collected.** (No location, no contacts, no audio, no photos/videos uploaded by us, no ads/analytics SDKs, no advertising ID, no health, no financial info.)

#### Security practices declarations
- ✅ Data is encrypted in transit (TLS 1.2+).
- ✅ You can request that data be deleted (see `/account-deletion.html`).
- ✅ Committed to follow Play's Families Policy: **N/A** (app is 13+).
- ✅ Independent security review: No.

---

## 🚀 Closed Testing checklist (mandatory for new personal accounts)

Google Play requires new **personal** developer accounts to run a closed test with **12 testers for 14+ days** before promoting to production. (Skip this only if your developer account is registered as an "Organization".)

1. Play Console → **Testing** → **Closed testing** → **Create track**.
2. Upload `CorporateLadder-v{N}.aab` (the AAB in this folder).
3. Add 12+ tester emails (or a Google Group). They each click the opt-in link and install the app from Play Store.
4. Wait 14 days.
5. Promote to **Production** → re-upload the same AAB on the Production track.

---

## 📸 Screenshot capture tips

You're capturing these on your own phone (per your preference). Aim for 4–8 phone screenshots; each must be PNG/JPEG, 16:9 to 9:16, between 320 px and 3840 px on the long edge (1080×1920 is the sweet spot).

1. Sideload the latest debug APK from `/app/output/CorporateLadder-debug.apk`, or install from the Closed Testing track.
2. Sign in once so the screens have real data (lifetime synergy, scores).
3. Capture (Power + Volume Down on most Androids):
   - **Home** with the "Live from the Watercooler" hero card showing posts.
   - **Mid-run** with synergy meter and ghost HUD active.
   - **Game over** with the Performance Review card and 4 share buttons.
   - **Companies HQ** with the Org Chart + internal leaderboard.
   - *(Optional)* Roast My Career performance review card.
   - *(Optional)* Profile sheet showing the DELETE_ACCOUNT button — useful evidence if the reviewer flags account-deletion compliance.
4. Don't crop status bars. Don't add device frames or marketing text — Google now flags overlay-heavy screenshots as misleading.
5. In Play Console → Main store listing → Graphics → Phone screenshots → upload them.

---

## 🆕 Release notes template (Play Console → release → "What's new")

Keep it short, ≤500 chars per language. Suggested for v1.0.0 (the **versionName** is now semantic; the upload's **versionCode** still auto-bumps every build):

```
First public release.

• Endless runner with 24 game modes
• Daily streaks · Weekly seasons · Hall of Fame
• Watercooler — real-time anonymous channels
• Companies (up to 20 seats) — found, recruit, lay off
• Bounty Board — wager synergy on score targets
• Ghost Race — beat yesterday's #1 in any mode
• Roast My Career — AI-generated performance review
• One-tap sharing to IG Story, X, LinkedIn, TikTok

No ads. No IAP. No energy timers.
```

---

## ✅ Play Store compliance checklist

This build was hardened in Feb 2026 against the **current** Play Store policies. Each row is either ✅ done in code, or ⏳ a user-side action you must complete in Play Console / Firebase / DNS.

### Technical (already satisfied by the build)

| Requirement | Status | How |
| --- | --- | --- |
| Target SDK ≥ API 34 (35 by Aug 2025) | ✅ | `targetSdk = 35`, `compileSdk = 35` in `/app/android/variables.gradle`. |
| 64-bit architecture | ✅ | `abiFilters 'armeabi-v7a','arm64-v8a'` in `/app/android/app/build.gradle`. arm64-v8a is the 64-bit slice; armeabi-v7a covers older ARM devices. (x86 dropped — Play Store no longer requires it.) |
| App Bundle (AAB) format | ✅ | `bundleRelease` in `/app/scripts/build_apk.sh`. |
| Adaptive icon | ✅ | `mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`. |
| Cleartext traffic forbidden | ✅ | `network_security_config.xml` + `usesCleartextTraffic="false"`. All HTTPS endpoints (Firebase, Gemini, sharing). |
| Auto Backup secured | ✅ | `allowBackup="false"` + `backup_rules.xml` + `data_extraction_rules.xml` (Android 12+). Prevents leaking the locally-stored Gemini API key on device transfer. |
| Per-app language declared | ✅ | `locales_config.xml` — only `en` declared (we don't translate yet). |
| Code shrinking + obfuscation enabled | ✅ | `minifyEnabled true`, `shrinkResources true`, R8 with `proguard-android-optimize.txt`. ProGuard rules keep WebView JS bridges, Capacitor plugins, and Firebase reflective classes. |
| Logs stripped from release builds | ✅ | `-assumenosideeffects class android.util.Log` in `proguard-rules.pro`. |
| Semantic versionName | ✅ | `1.0.0` from `/app/.versionname`. The internal `versionCode` still auto-bumps every build. |
| Stable signing config | ✅ | `release.keystore` checked in for **upload** key; CI/prod must override `CL_KEYSTORE_PASSWORD`/`CL_KEY_ALIAS`/`CL_KEY_PASSWORD`. **Enroll in Play App Signing on first upload** so Google manages the prod signing key. |
| Permissions: only what we use | ✅ | `INTERNET` only. Sensitive permissions (location, contacts, mic, camera, SMS, call log, accessibility) — none requested. |
| `<queries>` for share intents declared | ✅ | Required by Android 11+ package visibility. Already in `AndroidManifest.xml`. |
| In-app account deletion | ✅ | New `DELETE_ACCOUNT` button on the profile sheet. Implemented in `/app/src/app/firebase.service.ts → deleteAccount()` + UI in `/app/src/app/app.html`. Deletes Firestore profile + Firebase Auth record. |
| Public account-deletion URL | ✅ | `/app/public/account-deletion.html` — hosted at `https://corporateladder.xyz/account-deletion.html`. |
| Privacy policy reflects deletion paths | ✅ | `/app/public/privacy.html` updated to document both in-app and email-based deletion. |

### User-side actions (must do before submitting)

| Action | Where | Why |
| --- | --- | --- |
| ⏳ Verify both privacy & deletion URLs return 200 OK in an incognito window | `corporateladder.xyz/privacy.html` and `corporateladder.xyz/account-deletion.html` | Google's review bot will fetch them. Failed fetch = listing rejected. |
| ⏳ Capture 4–8 phone screenshots on a real device | Your phone | We removed the broken Playwright automation; manual capture is the cleanest path. |
| ⏳ Capture a 1080×1920 screenshot of the **Profile sheet showing the DELETE_ACCOUNT button** | Your phone | Optional but recommended — pre-empts the "where's account deletion?" reviewer question. |
| ⏳ Run the IARC content rating questionnaire | Play Console → App content → Content rating | Mandatory. Expected: Teen (13+). |
| ⏳ Fill the Data Safety form using the table above | Play Console → App content → Data safety | The Data Safety table above maps 1:1 to the Play Console form. |
| ⏳ Enroll in **Play App Signing** on first AAB upload | Play Console → first upload prompt | Lets Google manage the production signing key; our local `release.keystore` becomes the *upload* key only. Industry standard since 2021. |
| ⏳ Add the **release SHA-1** of the upload key to Firebase | Firebase Console → Project Settings → Your apps → Android → Add fingerprint | Without this, Native Google Sign-In on the released APK will fail with `auth/unknown-error`. Current dev SHA-1: `91:84:DD:49:FF:91:B8:63:2C:4D:C2:1E:82:C8:F5:66:A7:94:79:F7`. After Play App Signing enrollment, Google issues a NEW production SHA-1 you must also add. |
| ⏳ Republish Firestore rules from `/app/firestore.rules` | Firebase Console → Firestore → Rules | Required for Companies / Bounties / Seasons. |
| ⏳ Run the 14-day Closed Testing track if your dev account is "Personal" | Play Console → Testing → Closed testing | Personal accounts can't ship straight to Production since 2023. |
| ⏳ Confirm `privacy@corporateladder.game` actually receives mail | Your DNS / mail provider | The privacy policy and account-deletion page point users there. A bounce = policy violation. |

### Things we are deliberately NOT doing (for transparency)

| | Decision | Rationale |
| --- | --- | --- |
| **Ads / IAP** | None | We declared "No ads, no IAP" in the listing — keeps Data Safety simple, no ad-id permission needed, no User Choice Billing entanglement. |
| **Foreground service** | None | The game runs only while the activity is visible. No `FOREGROUND_SERVICE_*` permission needed. |
| **Background location / SMS / call log / accessibility** | None | Sensitive-permission restrictions don't apply to us. |
| **Designed-for-Families program** | Opt out | App is satire about adult workplaces; rating is 13+. |
| **AI-generated content disclosure** | Will declare in Data Safety | Roast My Career uses Gemini with the user's own API key. Inputs are sent to Google Gemini directly, not to our servers. The privacy policy already discloses this; mention "AI-generated content" if Play Console asks during submission. |

---

## 📂 Files referenced by this checklist

```
/app/.versionname                                     ← semantic versionName (1.0.0)
/app/.versioncode                                     ← internal versionCode (auto-bumps)
/app/capacitor.config.json                            ← Capacitor + Firebase Auth provider config
/app/android/variables.gradle                         ← targetSdk / compileSdk / minSdk
/app/android/app/build.gradle                         ← R8, signing, ABI filters, semantic versionName
/app/android/app/proguard-rules.pro                   ← R8 keep rules + Log strip
/app/android/app/src/main/AndroidManifest.xml        ← cleartextTraffic=false, backup rules, locale config
/app/android/app/src/main/res/xml/network_security_config.xml
/app/android/app/src/main/res/xml/backup_rules.xml
/app/android/app/src/main/res/xml/data_extraction_rules.xml
/app/android/app/src/main/res/xml/locales_config.xml
/app/public/privacy.html                              ← Hosted at /privacy.html
/app/public/account-deletion.html                     ← Hosted at /account-deletion.html
/app/src/app/firebase.service.ts → deleteAccount()    ← In-app deletion logic
/app/src/app/app.html (Profile Sheet)                ← DELETE_ACCOUNT button + confirmation modal
/app/firestore.rules                                  ← MUST be republished in Firebase Console
/app/scripts/build_apk.sh                             ← Re-builds AAB, bumps versionCode, copies into output/play-store/
```
