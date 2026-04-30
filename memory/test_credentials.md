# Test Credentials — Corporate Ladder Simulator

## Production Firebase Project
- **Project ID**: `gen-lang-client-0540931255`
- **Auth Domain**: `gen-lang-client-0540931255.firebaseapp.com`

## ⚠️ Auth Providers Status (verified 2026-02-15 via REST API)
| Provider | Status | Action Required |
| --- | --- | --- |
| Google Sign-In | ✅ Enabled | None |
| **Email/Password** | ❌ **NOT ENABLED** | Firebase Console → Authentication → Sign-in method → Email/Password → Enable |
| **Anonymous (Guest)** | ❌ **NOT ENABLED** | Firebase Console → Authentication → Sign-in method → Anonymous → Enable |

Until the user enables Email/Password + Anonymous in Firebase Console, the new "New Hire" and "Guest" auth tabs will show:
- `auth/operation-not-allowed` for Email/Password sign-up/sign-in
- `admin-restricted-operation` for Guest mode

## Test Accounts
None pre-seeded. Once Email/Password is enabled, any new sign-up via the in-app "New Hire" tab works.

## Admin Accounts (already in code)
Email-based admin check in `firebase.service.ts → isAdmin()`:
- `gourav.k.24@gmail.com`
- `24gourav11@gmail.com`

These see admin-only UI affordances when signed in via Google.
