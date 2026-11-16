# Gingerbread Workshop 🏠

Build and decorate a 3D gingerbread house in your browser, just like a real kit: stand up the walls and roof, pipe icing, add candy, then take a named photo to share.

**Play:** open `index.html` (it's a single self-contained file, no install needed) or visit the GitHub Pages site for this repo.

Steps: Build → Ice → Decorate → Finish. Works with a mouse or touch. Your progress autosaves in your own browser. Use 💾 **Save** to download your house as a `.gingerbread` file, 📂 **Load** (or drag the file onto the page) to open it again, and 🗂 **My saves** for named save slots in the browser.

Developers: the source is in `src/`; rebuild with `npm i three@0.170.0 esbuild && node build.mjs`.

**Play it in the browser:** [diebeste.github.io/gingerbread-workshop](https://diebeste.github.io/gingerbread-workshop/)

**Privacy policy:** the game collects no data — saves and photos stay on your device. Full policy: [privacy.html](https://diebeste.github.io/gingerbread-workshop/privacy.html)

## Android app

A Play Store–ready Android wrapper lives in [`android-app/`](android-app/). It bundles this same `index.html` offline (Capacitor), with native Save / Load / Photo via the system share sheet and file picker. Signed `.aab` / `.apk` builds are not in this repo; the upload keystore is kept private.

To rebuild the Android app:

```bash
cd android-app
npm install
npm run sync
cd android
./gradlew bundleRelease assembleRelease   # signs if keystore.properties is present
```

Play listing copy and store graphics are in [`android-app/store-listing/`](android-app/store-listing/).
