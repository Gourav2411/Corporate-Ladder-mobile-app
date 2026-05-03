# Play Store Listing — LinkedOut (xyz.corporateladder.linkedout)

Everything you need to fill in every field of the Google Play Console store listing. Copy/paste each block into the matching form field.

---

## 🎯 App name (max 30 chars)

```
LinkedOut
```
*(9 chars — you already have this)*

Alt if you want something punchier:
```
LinkedOut: Climb the Ladder
```
*(27 chars)*

---

## 📝 Short description (max 80 chars)

**Recommended (74 chars):**
```
Satirical runner. Climb the corporate ladder. Do absolutely no real work.
```

**Alternatives:**
```
Dodge emails. Jump PIPs. Get promoted. The corporate runner gone feral. (71)
```
```
Climb the corporate ladder by doing zero actual work. Fully satirical. (70)
```
```
Tap. Grind. Get LinkedOut. The endless runner for burned-out workers. (70)
```

---

## 📄 Full description (max 4,000 chars)

```
You've been hired. Your only job: climb the corporate ladder by doing absolutely no actual work.

LinkedOut is the satirical endless runner about modern workplaces — a love letter (and roast) to PIPs, layoffs, "synergy", forced returns to office, and that one Tuesday meeting that should have been an email.

🎮 24+ GAME MODES
Endless mode, Championship season, Hostile Takeover, Quiet Quitting, Layoff Friday, Return-to-Office sprint, and twenty more — each a different flavor of corporate dystopia.

📈 100+ SKILLS, 25+ SKINS
Earn synergy. Unlock the skill tree. Equip the cursed haircut. Become the executive your therapist warned you about.

🏢 FROM CUBICLE TO PENTHOUSE — VISUALS ESCALATE AS YOU CLIMB
Start in a grey cubicle farm. Score points → the whole scene warms up to a manager floor. Keep pushing → the director wing, VP suite, penthouse, and finally the crimson server hellscape. Every run is its own cinematic journey. Confetti rains when you tier up.

☕ THE WATERCOOLER
A real-time channel of anonymous workplace confessions. Start threads. Tag coworkers with @mentions. Upvote the best roasts. Found a private channel for your friends (or a petty one for your enemies).

🏢 COMPANIES (UP TO 20 SEATS)
Found your own company. Recruit friends with a 6-character join code. Run a private leaderboard. Lay people off. Reinstate them when you feel guilty about the bonus.

🎯 BOUNTY BOARD
Wager synergy on a target score. Anyone in the world who beats it, claims it. Pure stakes, instant claims.

👻 GHOST RACE
Race yesterday's #1 in any mode. The ghost of the high score creeps up your screen in real time. Beat them, confetti rains. Lose to them, the chat remembers.

🔥 STREAKS, SEASONS & HALL OF FAME
Daily streak rewards. Weekly leaderboard resets every Monday at 00:00 UTC. Last week's top 3 immortalized in the Hall of Fame.

🎨 OFFLINE-FIRST, CLOUD-SYNCED
Works on the subway with no reception. Syncs silently when you're back on WiFi. Never loses a run.

🔒 PRIVACY-FIRST DESIGN
No trackers. No ads. No in-app purchases. Delete your account anytime — the Delete button inside the Profile sheet nukes every trace in 24 hours (GDPR-compliant).

😂 WHY THIS GAME
Because your job is already a game you can't quit — might as well play a better one. LinkedOut takes the absurdity of modern work culture and turns it into 60-second dopamine bursts you can play in line for coffee, between two status updates, or during a meeting that should've been an email.

👉 If your calendar is full of "syncs", if your 1:1 was rescheduled for the third time, if you've ever typed "per my last email" with rage — LinkedOut is your breather.

Tap. Grind. Get LinkedOut.

-----------------------------------------------
Built with ❤️ and existential dread in India. No ads, no tracking, no in-app purchases — ever. Issues? Email hello@corporateladder.xyz.
```

*(3,092 chars — well under the 4,000 limit, leaves room to add a localized version later)*

---

## 🎨 Graphics (all generated & ready to upload)

### App icon (512×512 PNG, ≤ 1 MB)
📁 `/app/output/play-store/icon-512.png` (304 KB)

### Feature graphic (1024×500 PNG, ≤ 15 MB)
📁 `/app/output/play-store/feature-graphic-1024x500.png` (183 KB)

### Phone screenshots (6 × 1080×1920 PNG)
Upload in this order:

| File | Hero text |
| --- | --- |
| `phone-01_hero.png` | "CLIMB THE LADDER" |
| `phone-02_runner.png` | "ENDLESS RUNNER" |
| `phone-03_modes.png` | "CHOOSE YOUR POISON" |
| `phone-04_social.png` | "THE WATERCOOLER" |
| `phone-05_tier.png` | "FROM CUBICLE TO PENTHOUSE" |
| `phone-06_company.png` | "RUN YOUR COMPANY" |

📁 All in `/app/output/play-store/screenshots/phone-*.png`

### 7-inch tablet screenshots (4 × 1200×1920 PNG)
📁 `/app/output/play-store/screenshots/tab7-*.png`

### 10-inch tablet screenshots (4 × 1600×2560 PNG)
📁 `/app/output/play-store/screenshots/tab10-*.png`

---

## 🎬 Video (optional — YouTube URL)

You don't have one yet. Skip this field for the first launch — it's optional.

To add one later: record a 30-sec landscape gameplay clip on your phone (Android's built-in screen recorder works), upload as "Unlisted" to YouTube, paste the URL here. **Ads must be OFF, age-restriction must be OFF.**

---

## 🖥 Google Play Games on PC / Chromebook / XR — OPTIONAL, SKIP ALL

You're shipping an Android phone game — skip these entire sections for launch. They're only needed if you want your game surfaced on:
- **Play Games on PC** (Windows emulator)
- **Chromebook**
- **Android XR** (VR/AR headsets)

For the first Play Store listing, ignore these fields. You can add them in a later release once you have user traction.

---

## 📋 Reviewer test account (required if app has login)

Put this in **Policy → App content → App access**:

**Username:** `playstore.reviewer@corporateladder.xyz`
**Password:** `nT7q8cxIwYomIpvw!1`

(Full instructions in `/app/memory/PLAY_STORE_REVIEWER_CREDS.md`)

---

## ✅ Pre-submit checklist

- [ ] App name, short desc, full desc pasted
- [ ] App icon uploaded
- [ ] Feature graphic uploaded
- [ ] 6 phone screenshots uploaded (in order 01 → 06)
- [ ] 4 × 7-inch tablet screenshots uploaded
- [ ] 4 × 10-inch tablet screenshots uploaded
- [ ] Privacy policy URL set → `https://mobile-deploy-40.preview.emergentagent.com/privacy.html` *(or your future custom domain)*
- [ ] Data safety questionnaire — reference `/app/output/play-store/DATA_SAFETY.md`
- [ ] App access creds pasted (reviewer account above)
- [ ] IARC content rating questionnaire completed
- [ ] AAB uploaded → `LinkedOut-v2.aab` (`xyz.corporateladder.linkedout`, SHA1 `AF:D4:1A:...`)
- [ ] Target country = India (or wherever — recommend starting India-only, expand later)
- [ ] Content rating filled in Play Console (game → humor → mild satirical content → no gambling / violence)
