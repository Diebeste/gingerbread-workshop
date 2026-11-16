# Gingerbread House Workshop — Android app

Capacitor wrapper around the self-contained Gingerbread House Workshop game, packaged for Google Play.

- **App name:** Gingerbread House Workshop
- **applicationId:** `com.diebeste.gingerbreadworkshop`
- **version:** 1.0.0 (versionCode 1)
- **minSdk:** 23 · **targetSdk / compileSdk:** 35
- The game is bundled offline in `www/` (no dependency on the GitHub Pages site).

## Prerequisites

- JDK 21
- Android SDK with platform 35 and build-tools 35
- The Play upload keystore at `/home/box/.secrets/gingerbread-upload.jks` and `/home/box/.secrets/gingerbread-keystore.properties` (not in this repo)

```bash
export JAVA_HOME=/path/to/jdk21
export ANDROID_HOME=/path/to/android-sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## Build

```bash
npm install
npm run sync          # rebuilds www from /workspace/gingerbread-house and caps syncs Android
cd android
./gradlew bundleRelease assembleRelease
```

Outputs:

- `android/app/build/outputs/bundle/release/app-release.aab`
- `android/app/build/outputs/apk/release/app-release.apk`

Play listing copy, the 512×512 icon, feature graphic, and phone screenshots live in `release/` once a release is assembled. Never copy the keystore or its password into `release/` or git.

## Native save / load / photo

On Android, Save and Photo write a temporary file and open the system share sheet so the player can keep or send it. Load uses the system file picker (`<input type="file">`, handled by Capacitor’s WebChromeClient). Autosave and “My saves” use the WebView’s localStorage and persist across launches. The back button closes an open dialog, or otherwise minimizes the app (progress is already autosaved). Both portrait and landscape are allowed.

## Privacy policy

https://diebeste.github.io/gingerbread-workshop/privacy.html
