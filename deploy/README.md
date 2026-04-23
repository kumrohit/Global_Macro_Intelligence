# Global Macro Intelligence — Deploy

This folder contains everything needed to deploy the app publicly. The entire application is the single file `index.html`.

---

## What's in this folder

| File | Purpose |
|------|---------|
| `index.html` | The complete application (HTML + CSS + JS) |
| `netlify.toml` | Netlify auto-deploy config + security headers |
| `vercel.json` | Vercel deploy config + security headers |
| `_headers` | Cloudflare Pages / Netlify `_headers` syntax |

---

## Option 1 — Netlify (Recommended — zero terminal required)

### Drag & Drop (30 seconds)

1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Click **Add new site → Deploy manually**
3. Drag this entire `deploy/` folder onto the upload zone
4. Done — Netlify gives you a live URL like `https://random-name.netlify.app`

### Auto-deploy from GitHub

1. Push the repo to GitHub (see Git section below)
2. **Add new site → Import an existing project → GitHub**
3. Select your repo
4. Set **Publish directory** to `deploy`
5. Leave Build command blank
6. Click **Deploy site**

Every `git push` to `main` redeploys automatically.

---

## Option 2 — Vercel (One CLI command)

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Deploy from this folder
cd deploy
vercel

# Follow the prompts:
#   Set up and deploy? Y
#   Project name: global-macro-intelligence  (or any name)
#   Directory: ./
#   Override settings? N

# Go live in production
vercel --prod
```

---

## Option 3 — GitHub Pages (Free, stays in your repo)

```bash
# From the repo root (one level up from this folder):

# 1. Push repo to GitHub
git init
git add .
git commit -m "Initial release"
gh repo create global-macro-intelligence --public --source=. --push

# 2. Enable Pages:
#    GitHub → repo → Settings → Pages
#    Source: Deploy from a branch
#    Branch: main   Folder: /deploy
#    Click Save

# Your app goes live at:
# https://<your-username>.github.io/global-macro-intelligence/
```

> GitHub Pages typically goes live within 60 seconds of the first push.

---

## Option 4 — Cloudflare Pages (Global CDN, free tier)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages → Create a project**
2. Connect GitHub and select your repo
3. Set **Root directory** to `deploy`
4. Leave Build command and output directory blank
5. Click **Save and Deploy**

The `_headers` file in this folder is automatically picked up by Cloudflare Pages for security headers.

---

## Option 5 — Any static host

This app is a single HTML file — it works on any host that can serve a file.

```bash
# Surge.sh
npm i -g surge
cd deploy
surge . your-app-name.surge.sh

# Firebase Hosting
firebase init hosting   # set public dir to deploy/
firebase deploy

# AWS S3 + CloudFront
aws s3 sync . s3://your-bucket --acl public-read
# Enable "Static website hosting" in S3 bucket settings
```

---

## After deploying — first run checklist

- [ ] Open the URL and confirm the login screen loads
- [ ] Register a test account, log in, refresh — session persists
- [ ] Click 3–4 countries — side panel renders correctly
- [ ] Enter your Gemini API key (bottom-right panel) and click a country — AI analysis loads
- [ ] Open the ★ Watchlist tab and add one item
- [ ] Open ⊕ Custom Analysis and add 2–3 tags — report generates
- [ ] Open Profile → Daily Capsule — digest generates
- [ ] Check browser DevTools → Console: no red errors on load

---

## Updating the app

When you edit `global_macro_intel.html` in the project root, copy it back to this folder before deploying:

```bash
# From repo root
cp global_macro_intel.html deploy/index.html
git add deploy/index.html
git commit -m "Update: <describe change>"
git push
```

If you connected Netlify or Cloudflare Pages to GitHub, the push triggers an automatic redeploy.

---

## Custom domain

### Netlify
1. Site settings → Domain management → Add custom domain
2. Follow Netlify's DNS instructions

### Cloudflare Pages
1. Pages → your project → Custom domains → Set up a custom domain
2. If your domain is on Cloudflare DNS, it's activated instantly

### GitHub Pages
1. repo → Settings → Pages → Custom domain → enter domain
2. Add a `CNAME` DNS record pointing to `<your-username>.github.io`
3. Check **Enforce HTTPS**

---

## Security notes

**API key** — entered by the user in the browser, held only in memory for the session. Never stored in a file or sent to any server other than `generativelanguage.googleapis.com` (Gemini) or `api.anthropic.com` (Claude). Advise users to set billing limits in Google AI Studio or Anthropic Console.

**Authentication** — client-side only, backed by `localStorage`. Passwords are hashed deterministically (djb2). Sufficient for a personal or team tool; not suitable for protecting truly sensitive data.

**Content Security Policy** — the `netlify.toml`, `vercel.json`, and `_headers` files in this folder set a strict CSP that allows only the required CDN and API origins.
