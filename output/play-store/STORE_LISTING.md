# Play Store Listing Kit — Corporate Ladder Simulator

Everything you need to fill in the Google Play Console store listing. Copy/paste each section into the matching field.

---

## 📦 What's in this folder

| File | Use it for |
| --- | --- |
| `CorporateLadder-v{N}.aab` | The Android App Bundle to upload (latest build) |
| `icon-512.png` | "App icon" — Play Console → Main store listing → Graphics |
| `feature-graphic-1024x500.png` | "Feature graphic" — same screen |
| `promo-graphic-180x120.png` | Optional "Promo graphic" (legacy slot, fine to skip) |
| `STORE_LISTING.md` (this file) | Listing copy below |

⚠️ Screenshots (phone, 1080×1920+ recommended) are NOT generated — you must capture them on a real phone after sideloading the APK. Aim for 4 screenshots minimum: home screen with Watercooler hero card, an active run, the game-over performance review, and the Companies HQ screen.

---

## 📝 Store Listing Copy

### App name (50 char max)
```
Corporate Ladder Simulator
```

### Short description (80 char max)
```
A satirical workplace runner. Climb the ladder by doing absolutely no real work.
```

### Full description (4000 char max)
```
You've been hired. Your only job: climb the corporate ladder by doing absolutely no actual work.

Corporate Ladder Simulator is the satirical endless runner about modern workplaces — a love letter (and roast) to PIPs, layoffs, "synergy", forced returns to office, and that one Tuesday meeting that should have been an email.

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

## 📜 Privacy policy URL
Your privacy policy is hosted at:
```
https://<your-domain>/privacy.html
```
Replace `<your-domain>` with whatever URL the SSR site is deployed at (e.g. `https://corporate-ladder.web.app/privacy.html`). The static file is at `/app/public/privacy.html` and is automatically served by your existing SSR build.

---

## 🔧 App Content answers (Play Console → "App content" sidebar)
- **App access:** All functionality available without restrictions. (Mention that anonymous play works without sign-in; sign-in unlocks leaderboards / Watercooler / Companies.)
- **Ads:** No.
- **Content ratings:** Run the IARC questionnaire — answer "no" to all violence/sex/drugs prompts, "yes" only to "satire / dark humor". Expected rating: **Teen (13+)** in most regions.
- **Target audience:** 13+ (satirical content not suited to younger audiences).
- **News app:** No.
- **Data safety:**
  - Personal info collected: Email + Name + User ID (for sign-in). Optional, used for App functionality, in-transit encrypted, deletable on request.
  - App activity collected: User-generated content (Watercooler posts, bounties, company posts) + In-app actions (scores, achievements, streaks). Optional, used for App functionality.
  - All data: encrypted in transit (TLS), can be requested for deletion, not shared with third parties.
- **Government app:** No.
- **Financial features:** No.
- **Health features:** No.

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
1. Sideload the latest debug APK from `/app/output/CorporateLadder-debug.apk`.
2. Capture (Power + Volume Down on most Androids) these 4 screens:
   - **Home** with the "Live from the Watercooler" hero card showing posts.
   - **Mid-run** with synergy meter and ghost HUD active.
   - **Game over** with the Performance Review card and 4 share buttons.
   - **Companies HQ** with the Org Chart + internal leaderboard.
3. Resolution should be at least 1080×1920 (any modern phone is fine). Don't crop status bars.
4. In Play Console → Main store listing → Graphics → Phone screenshots → upload all 4.

---

## 🆕 Release notes template (Play Console → release → "What's new")
Keep it short, ≤500 chars per language. Suggested for v1.0.{N}:

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

## ✅ Pre-upload checklist
- [ ] Bumped `versionCode` (build script does this automatically every run).
- [ ] AAB built in this session: `CorporateLadder-v{N}.aab`.
- [ ] Privacy policy hosted at a public URL.
- [ ] 4+ phone screenshots captured.
- [ ] App content answers filled in Play Console.
- [ ] Closed test track set up (or org account on Production directly).
- [ ] Firebase rules re-published (the named DB) — see `/app/firestore.rules`.
- [ ] SHA-1 of `release.keystore` registered in Firebase Console (release: `91:84:DD:49:FF:91:B8:63:2C:4D:C2:1E:82:C8:F5:66:A7:94:79:F7`).
- [ ] If using Play App Signing (recommended) — let Google manage the signing key when uploading the AAB. Keep `/app/android/app/release.keystore` as your **upload** key only.
