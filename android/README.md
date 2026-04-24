# Global Macro Intelligence — Android & Mobile Deployment

The app is a single HTML file enhanced as a **Progressive Web App (PWA)**.  
No app store, no build tools, no native code required.

---

## What's in this folder

| File | Purpose |
|------|---------|
| `index.html` | Complete mobile-optimised app |
| `manifest.json` | PWA manifest — controls install name, icon, colours |
| `sw.js` | Service worker — enables offline use + caching |
| `icons/` | Place your app icons here (see Icon Guide below) |
| `README.md` | This guide |

---

## Option 1 — Install as Android App (30 seconds, no store required)

This is the recommended path. Android Chrome supports full PWA install with a home-screen icon and standalone window (no browser chrome).

### Steps

1. **Deploy the `android/` folder** to any HTTPS host (Netlify, Vercel, GitHub Pages — see deploy/README.md for instructions).

2. **On your Android phone**, open Chrome and navigate to your deployed URL.

3. Chrome will show an **"Add to Home screen"** banner, or tap the ⋮ menu → **"Install app"**.

4. The app installs to your home screen and launches in standalone mode — exactly like a native app.

> The app works offline for previously visited countries once the service worker caches the map data.

---

## Option 2 — Capacitor (True APK for Play Store)

Use [Capacitor](https://capacitorjs.com/) (by Ionic) to wrap the HTML in a native Android WebView and generate an `.aab` / `.apk`.

### Prerequisites

```bash
# Install Node.js (v18+) and Android Studio
# Make sure JAVA_HOME and ANDROID_HOME env vars are set
```

### One-time setup

```bash
# Install Capacitor CLI
npm install -g @capacitor/cli

# In this folder (android/)
npm init -y
npm install @capacitor/core @capacitor/android

# Initialise Capacitor — point webDir at this folder
npx cap init "Global Macro Intelligence" "com.gmi.terminal" --web-dir .

# Add Android platform
npx cap add android
```

### Build & run

```bash
# Copy latest index.html into the Android web assets
npx cap copy android

# Open Android Studio (builds the APK)
npx cap open android
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK** to create a release build
2. Or press **▶ Run** to sideload directly on a connected device

### Update after HTML changes

```bash
cp ../global_macro_intel.html ./index.html
npx cap copy android
npx cap open android   # rebuild in Android Studio
```

---

## Option 3 — Bubblewrap (Trusted Web Activity for Play Store)

Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) wraps a PWA as a Trusted Web Activity (TWA) — the lightest way to publish a PWA on the Play Store.

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Initialise — use your deployed PWA URL
bubblewrap init --manifest https://your-deployed-url.netlify.app/manifest.json

# Build the Android project
bubblewrap build

# Output: app-release-signed.apk  — ready to upload to Play Store
```

Requirements:
- Deployed PWA with HTTPS (not localhost)
- A Google Play developer account ($25 one-time fee)

---

## Option 4 — WebView Android Studio (Manual, full control)

```
1. Open Android Studio → New Project → Empty Views Activity
2. In activity_main.xml replace the layout with:
   <WebView android:id="@+id/webview"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
3. In MainActivity.kt:
   val wv = findViewById<WebView>(R.id.webview)
   wv.settings.javaScriptEnabled = true
   wv.settings.domStorageEnabled = true
   wv.loadUrl("file:///android_asset/index.html")
4. Copy index.html into app/src/main/assets/
5. Build → Generate Signed APK
```

---

## Icon Guide

Place these PNG files in `android/icons/`:

| File | Size | Used for |
|------|------|---------|
| `icon-192.png` | 192×192 px | Android home screen |
| `icon-512.png` | 512×512 px | Play Store / splash |
| `screenshot-mobile.png` | 390×844 px | Play Store screenshot |

**Quick icon generation (no design tools needed):**

```bash
# Install sharp-cli
npm install -g sharp-cli

# Generate from any source image (replace source.png)
sharp -i source.png -o icons/icon-192.png resize 192 192
sharp -i source.png -o icons/icon-512.png resize 512 512
```

Or use [PWABuilder.com](https://www.pwabuilder.com/) — paste your deployed URL and it generates icons + manifest + store packages automatically.

---

## Mobile UX Features Added

The HTML has been enhanced with these mobile-specific improvements:

- **Bottom navigation bar** — tap Social, Watch, Analyse, Community, Profile from anywhere on the map
- **Full-width side panels** on phones (< 480 px)
- **Responsive topbar** — tickers and clock hidden on small screens; bottom nav replaces them
- **Touch-optimised map** — `touch-action: manipulation` eliminates 300 ms tap delay
- **Larger tap targets** — close buttons, country paths
- **API widget** repositioned above bottom nav on phones
- **Service worker** caches map tiles + app shell for offline use
- **PWA manifest** enables "Add to Home screen" with app name and theme colour

---

## After deploying — mobile checklist

- [ ] Open on Android Chrome → tap ⋮ → **Install app** → confirms home screen icon
- [ ] Launch from home screen → opens in standalone mode (no browser bar)
- [ ] Tap a country → side panel slides in full width
- [ ] Bottom nav tabs all work: Social, Watch, Analyse, Community, Profile
- [ ] Enter Gemini API key → AI analysis loads
- [ ] Put phone in flight mode → reload → map still renders (service worker)
- [ ] Rotate to landscape → layout adapts
