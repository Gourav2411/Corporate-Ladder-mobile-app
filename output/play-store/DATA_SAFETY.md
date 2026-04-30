# Google Play — Data Safety form (copy-paste reference)

> Use this to fill the **Data safety** section in Play Console for **Corporate Ladder Simulator** (`app.corporateladder.game`). Each row maps directly to a Play Console question. Last reviewed: 2026‑04‑30.

---

## 1. Data collection &amp; security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** — TLS 1.2+ for every Firebase request; manifest declares `usesCleartextTraffic="false"` and a `networkSecurityConfig` with no cleartext exemptions. |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in‑app one‑tap deletion (Profile → Delete Account) **and** email at `privacy@corporateladder.game`. Public URL: `https://corporate-ladder.web.app/account-deletion.html`. |
| Has your app been independently validated against a global security standard? | **No**. |

## 2. Data types collected

> "Collected" = sent off the device. "Shared" = sent to a 3rd party that isn't a service provider.

### Personal info
| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Email address | **Yes** | No | Required (or Google / Guest) | Account management, app functionality |
| Name (display handle) | **Yes** | No | Required | Account management, app functionality |
| User IDs (Firebase UID) | **Yes** | No | Required | Account management, app functionality |

### App activity
| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| App interactions (game scores, lifetime synergy, achievements, streaks, posts) | **Yes** | No | Required | App functionality |
| Other user‑generated content (Watercooler / Bounty / Companies posts) | **Yes** | No | Optional (you only post when you tap Post) | App functionality |

### NOT collected
- Approximate or precise location
- Personal info: physical address, phone number, race/ethnicity, sexual orientation, political/religious beliefs
- Financial info
- Health & fitness
- Messages: SMS, emails, in‑app messages outside the public Watercooler
- Photos & videos
- Audio
- Files & docs
- Calendar
- Contacts
- App info & performance: crash logs, diagnostics
- Device or other IDs (advertising ID, IMEI, MAC, MEID)

## 3. Data security &amp; usage

- **Sale of data?** ❌ No.
- **Data shared with 3rd parties?** ❌ No (Firebase is a service provider, not a 3rd party).
- **Account deletion in‑app?** ✅ Yes (`Profile → Delete Account`).
- **Account deletion web URL** (required if app has account creation): `https://corporate-ladder.web.app/account-deletion.html`

## 4. Permissions justification

| Manifest entry | Source | Reason |
|---|---|---|
| `INTERNET` | Declared by us | Firebase Auth + Firestore + Gemini API requests. |
| `ACCESS_NETWORK_STATE` | Auto-merged by Firebase SDK | Detect online/offline so Firestore can buffer writes when offline. |
| `READ_GSERVICES` | Auto-merged by `play-services-base` | Required by Google Play Services for Firebase Auth. |
| `<applicationId>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | Auto-merged by AndroidX Core (signature-level) | Internal signature permission protecting the in-process broadcast receiver. Not user-facing. |
| `<queries>` for `com.instagram.android`, `com.twitter.android`, `com.zhiliaoapp.musically`, `com.ss.android.ugc.trill`, `com.linkedin.android`, plus `image/*` SEND intent and `com.instagram.share.ADD_TO_STORY` | Declared by us | Native sharing of the Performance Review card to social apps. We do not query any other packages and we do not request `QUERY_ALL_PACKAGES`. |

> The app declares **no other runtime permissions**. No `ACCESS_*_LOCATION`, `READ/WRITE_EXTERNAL_STORAGE`, `CAMERA`, `RECORD_AUDIO`, `READ_CONTACTS`, `READ_PHONE_STATE`, `POST_NOTIFICATIONS`, etc.

## 5. Required Play Console URLs

| Field | URL |
|---|---|
| Privacy Policy | `https://corporate-ladder.web.app/privacy.html` |
| Account deletion | `https://corporate-ladder.web.app/account-deletion.html` |
| Support email | `privacy@corporateladder.game` |
| Website | `https://corporate-ladder.web.app/` |

## 6. Content rating

- **Target audience:** 13+ (Teen). Age gate during sign-up confirms 13+ (16+ in EU/UK).
- **Violence:** Mild satirical references (firing colleagues, "Pink Slip", "Layoff Friday"). No graphics, no realistic violence.
- **Profanity:** None enforced; users may post in the Watercooler — moderated reactively.
- **Gambling:** None. In-game "Synergy" / "Bounty" currency has no real-world value and cannot be purchased.

## 7. Ads

❌ **No ads, no SDKs, no third-party trackers** are present in the app.

## 8. Families program

❌ Not enrolled. The app is **not** designed for children.

---

## Pre-submission checklist

- [x] Privacy policy live at `https://corporate-ladder.web.app/privacy.html` (GDPR / UK GDPR / CCPA / CPRA / COPPA / Terms of Use).
- [x] Account deletion live at `https://corporate-ladder.web.app/account-deletion.html`.
- [x] In-app account deletion functioning (`Profile → Delete Account`).
- [x] Sign-up flow includes explicit consent checkboxes (Privacy/Terms, age 13+, optional marketing).
- [x] Email-verification link sent on sign-up; in-app banner with Resend CTA shows until verified.
- [x] Manifest hardened: `usesCleartextTraffic=false`, `allowBackup=false`, custom network/backup/data-extraction XML configs, locale config.
- [x] R8/ProGuard enabled in `release` build with `-keep` rules for Capacitor + Firebase reflection.
- [x] Self-signed RSA 2048 keystore (100-year validity) committed at `/app/android/app/release.keystore`.
- [x] AAB targets API 35 (`compileSdk 35`, `targetSdkVersion 35`, `minSdk 23`).
- [x] Single `INTERNET` permission. No restricted permissions (`QUERY_ALL_PACKAGES`, `MANAGE_EXTERNAL_STORAGE`, etc.).
- [x] No ads, no in-app purchases, no analytics SDK, no error-tracking SDK.

