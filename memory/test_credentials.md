# Test Credentials — Corporate Ladder Simulator

## Production Firebase Project
- **Project ID**: `gen-lang-client-0540931255`
- **Auth Domain**: `gen-lang-client-0540931255.firebaseapp.com`

## ⚠️ Auth Providers Status (verified 2026-02-15 via REST API)
| Provider | Status | Action Required |
| --- | --- | --- |
| Google Sign-In | ✅ Enabled | None |
| **Email/Password** | ✅ Enabled (verified by user 2026-04-30) | None |
| **Anonymous (Guest)** | ✅ Enabled (verified by user 2026-04-30) | None |

Until the user enables Email/Password + Anonymous in Firebase Console, the new "New Hire" and "Guest" auth tabs will show:
- `auth/operation-not-allowed` for Email/Password sign-up/sign-in
- `admin-restricted-operation` for Guest mode

## Test Accounts
Pre-seeded Play Store reviewer account (credentials also in `memory/PLAY_STORE_REVIEWER_CREDS.md`):
- **Email**: `playstore.reviewer@corporateladder.xyz`
- **Password**: `nT7q8cxIwYomIpvw!1`
- **Firebase UID**: `1u4ruTih1DXYGr3HCpwQRlGo4Ux1`
- Created via Firebase Auth REST API on 3 May 2026.

## Quickest path to in-game canvas (for testing agents)
1. Onboarding splash auto-shows on first visit. Click "Next" 3× to reach the auth screen.
2. Click the **GUEST** tab → tick the 2 required consent checkboxes → click **"ENTER AS GUEST"**. Firebase Anonymous Auth issues a badge and lands you on the menu.
3. From the menu, scroll until the coral **"Start ENDLESS"** pill (`data-testid="start-sprint-btn"`) is visible (it sits below the 24-mode picker carousel) and click it.
4. In-canvas: press **Space** (or tap canvas) to jump. Verify the new **pseudo-3D perspective floor + cast shadow under player + cast shadow + depth-scaling under obstacles** all render.

## Admin Accounts (already in code)
Email-based admin check in `firebase.service.ts → isAdmin()`:
- `gourav.k.24@gmail.com`
- `24gourav11@gmail.com`

These see admin-only UI affordances when signed in via Google.
