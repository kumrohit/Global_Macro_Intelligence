# Release Guide — Global Macro Intelligence

This document covers everything needed to deploy the app publicly.

---

## Pre-Release Checklist

Before deploying, verify each item:

- [ ] Open `global_macro_intel.html` locally in Chrome/Firefox/Safari and confirm the login screen loads
- [ ] Register a test account, log in, and confirm the session persists on page refresh
- [ ] Click 3–4 countries and confirm the side panel renders (no API key needed for layout)
- [ ] Enter a Gemini API key, click a country, and confirm the AI analysis loads
- [ ] Open the Watchlist panel (★ tab) and add one item
- [ ] Open Custom Analysis (⊕ button) and add 2–3 tags
- [ ] Confirm the page title reads "Global Macro Intelligence — Country Sentiment Terminal"
- [ ] Check browser DevTools → Console: no red errors on load (yellow warnings in catch blocks are fine)
- [ ] Check DevTools → Network: D3 and TopoJSON load from CDN without 404s

---

## Option 1 — GitHub Pages (Recommended)

**Best for:** free hosting directly from your repo, automatic deploys on push.

### Steps

```bash
# 1. Initialize git if not already done
git init
git add .
git commit -m "Initial release"

# 2. Create a GitHub repo (via github.com or gh CLI)
gh repo create global-macro-intelligence --public --source=. --push

# 3. Enable GitHub Pages
# Go to: GitHub repo → Settings → Pages
# Source: Deploy from a branch
# Branch: main   /   Folder: / (root)
# Click Save
```

Your app will be live at:
```
https://<your-username>.github.io/global-macro-intelligence/global_macro_intel.html
```

Pages typically go live within 60 seconds of the first push.

### Updating after changes

```bash
git add global_macro_intel.html
git commit -m "Update: <describe change>"
git push
```

GitHub Pages auto-redeploys on every push to `main`.

---

## Option 2 — Netlify (Drag & Drop, Zero Config)

**Best for:** instant deploy without touching the terminal.

### Steps

1. Go to [app.netlify.com](https://app.netlify.com)
2. Sign in (GitHub login works)
3. Click **"Add new site" → "Deploy manually"**
4. Drag the entire `global_macro_intelligence/` folder onto the upload zone
5. Done — Netlify assigns a URL like `https://random-name-123.netlify.app`

To use a clean URL, rename `global_macro_intel.html` to `index.html` first.

### Connecting to GitHub for auto-deploy

1. **"Add new site" → "Import an existing project"**
2. Authorize GitHub, select your repo
3. Build command: *(leave blank)*
4. Publish directory: `.` (root)
5. Click **Deploy site**

Every `git push` to `main` now triggers an automatic redeploy.

---

## Option 3 — Vercel

**Best for:** global CDN edge deployment, custom domains.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the project directory
cd global_macro_intelligence
vercel

# Follow prompts:
#   Set up and deploy? Y
#   Which scope? <your account>
#   Link to existing project? N
#   Project name: global-macro-intelligence
#   Directory: ./
#   Override settings? N
```

Vercel deploys and prints a URL. For production:

```bash
vercel --prod
```

---

## Option 4 — Any Static Host

The app is a single HTML file. It works on **any static file host**:

| Host | Method |
|------|--------|
| Cloudflare Pages | Connect GitHub repo or drag-drop |
| AWS S3 + CloudFront | Upload file, enable static website hosting |
| Render | Connect GitHub, set publish dir to root |
| Surge.sh | `surge . global-macro-intel.surge.sh` |
| Firebase Hosting | `firebase deploy` after `firebase init` |

---

## Custom Domain Setup

After deploying to GitHub Pages or Netlify:

### GitHub Pages
1. Buy a domain (Namecheap, Cloudflare, etc.)
2. In your DNS provider, add a `CNAME` record:
   - Name: `www` (or `@` for apex)
   - Value: `<your-username>.github.io`
3. In repo → Settings → Pages → Custom domain → enter your domain
4. Check **"Enforce HTTPS"**

### Netlify
1. Site settings → Domain management → Add custom domain
2. Follow Netlify's DNS instructions (they manage DNS automatically if you transfer)

---

## Security Considerations

### API Key
The Gemini API key is entered by the user in the browser and stored **only in the DOM** for the session duration — it is never sent to any server other than `generativelanguage.googleapis.com`. No key is stored in localStorage or committed to the repository.

**Recommendation for public deployments:** Advise users to:
- Use a key with billing limits set in [Google AI Studio](https://aistudio.google.com/app/apikey)
- Restrict the key to the `generativelanguage.googleapis.com` API in the Google Cloud Console

### Authentication
The login system uses client-side localStorage only. Passwords are hashed with a simple deterministic hash — **this is not cryptographically secure**. It prevents casual access but is not suitable for protecting sensitive data. This is appropriate for a personal or team tool; do not use it to gate truly sensitive information.

### Content Security Policy
If your host allows setting response headers, add this CSP header for defense-in-depth:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src https://generativelanguage.googleapis.com https://cdn.jsdelivr.net;
  img-src 'self' data:;
```

---

## Performance Notes

- **First load:** ~200 KB transferred (D3 + TopoJSON from CDN, ~80 KB each)
- **TopoJSON world map** is fetched once from jsDelivr CDN on load (~100 KB)
- **All AI calls** are cached in-memory; refreshing the page clears the cache
- **No analytics, no tracking, no third-party cookies** — the app makes zero external requests except CDN assets and the Gemini API

---

## Known Limitations

| Limitation | Notes |
|-----------|-------|
| API key exposed in browser | Mitigate with Google Cloud key restrictions |
| Auth is client-side only | localStorage-based; not production-grade security |
| Cache is in-memory | Cleared on page refresh; no server-side caching |
| Historical data is AI-generated | Not sourced from live financial data APIs |
| Ticker data is placeholder | Requires a separate financial data API to make live |
| No mobile layout | Optimized for desktop (1280px+ width) |

---

## Sharing the App

If you want to share the app without hosting:

1. Send the single `global_macro_intel.html` file by email or Slack
2. Recipient opens it locally in any browser
3. They enter their own Gemini API key in the API panel

The entire app works offline except for the Gemini API calls.

---

## Post-Release

After going live, update [PROMPTS.md](PROMPTS.md) task tracker with any new features or fixes, and bump the version note at the bottom.

Consider adding a `preview.png` screenshot to the repo root — it will appear in the GitHub repo card and in the Open Graph image tag already set in `global_macro_intel.html`.
