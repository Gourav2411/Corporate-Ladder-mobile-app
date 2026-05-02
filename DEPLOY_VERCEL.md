# Deploying LinkedOut to Vercel

The web app (Angular 21 + SSR) ships to Vercel via the official Angular preset.
Static assets, SSR pages, and the APK/AAB downloads all go through one deploy.

## One-time setup (already done — keep here for reference)

| Concern | Decision |
| --- | --- |
| Framework preset | `angular` (auto-detects `outputMode: "server"` in `angular.json`) |
| Build command | `yarn build:vercel` (= `ng build --configuration production` + `node scripts/copy-downloads.mjs`) |
| Output directory | `dist/app` (Vercel reads `dist/app/browser/` for static + auto-mounts `dist/app/server/server.mjs` as a serverless function) |
| Install command | `yarn install --frozen-lockfile` |
| Node version | `>=20` (auto from `package.json` engines field; ensure Vercel project settings match) |
| APK/AAB downloads | Mirrored from `public/downloads/` → `dist/app/browser/downloads/` by `scripts/copy-downloads.mjs` during the build |
| Custom headers | APK = `application/vnd.android.package-archive`, AAB = `application/octet-stream`, both `Content-Disposition: attachment` (forces save-as instead of in-browser open) |

Files driving the deploy:
- `vercel.json` — framework preset, build command, output dir, MIME headers
- `.vercelignore` — keeps `android/`, `output/`, big artifact folders out of the deploy upload
- `scripts/copy-downloads.mjs` — mirrors APK/AAB into the static output

## Deploying a new build (every release)

1. Build & sign new APK/AAB: `bash scripts/build_apk.sh` (auto-bumps versionCode, writes `output/play-store/LinkedOut-v<N>.aab`).
2. Mirror to the public folder: `cp output/LinkedOut-*.{apk,aab} public/downloads/`
3. Bump the version reference in `public/downloads.html` (search for `v<previous>`).
4. Commit + push:
   ```bash
   git add -A
   git commit -m "deploy: LinkedOut v<N> + latest web build"
   git push origin main
   ```
5. Vercel auto-deploys on the push. Check the dashboard — once green, hit `https://<your-domain>/downloads.html` to verify.

## Quick smoke-test on the deployed URL

```bash
DOMAIN="https://your-vercel-domain.vercel.app"
curl -s -o /dev/null -w "  /                           HTTP %{http_code}\n" "$DOMAIN/"
curl -s -o /dev/null -w "  /downloads.html             HTTP %{http_code}\n" "$DOMAIN/downloads.html"
curl -s -o /dev/null -w "  /downloads/LinkedOut-v18.aab HTTP %{http_code}\n" "$DOMAIN/downloads/LinkedOut-v18.aab"
curl -s -o /dev/null -w "  /privacy.html               HTTP %{http_code}\n" "$DOMAIN/privacy.html"
curl -s -o /dev/null -w "  /account-deletion.html      HTTP %{http_code}\n" "$DOMAIN/account-deletion.html"
```

All should return `HTTP 200`.

## Troubleshooting

- **Build fails on `ng build`**: bump the Vercel project's Node version to ≥20 in *Project Settings → General → Node.js Version*.
- **`/downloads/*.aab` returns 404**: `scripts/copy-downloads.mjs` couldn't find any APK/AAB at build time. Check `public/downloads/` is committed and not blocked by `.gitignore`.
- **SSR routes timing out**: Vercel's hobby tier limits serverless functions to 10 s; the Angular SSR render is fast (~100 ms cold) but the first cold-start can be slow. Upgrade plan or pre-render with `ng build --prerender` if it becomes an issue.
- **Firebase Auth domain error**: add your Vercel domain (`your-app.vercel.app` and any custom domain) to *Firebase Console → Authentication → Settings → Authorized domains*.
