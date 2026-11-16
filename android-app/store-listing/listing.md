# Play Store listing — Gingerbread House Workshop

Use these fields when creating the app in the Google Play Console. The signed Android App Bundle to upload is `gingerbread-workshop-1.0.0.aab` in this folder. A signed APK is included for sideloading and device tests.

- **App name:** Gingerbread House Workshop
- **Application ID:** `com.diebeste.gingerbreadworkshop`
- **Version:** 1.0.0 (versionCode 1)
- **Default language:** English (United States) is fine
- **Category:** Casual (Games). Optionally add the Families program after the content rating is set, if you want it listed for families.
- **Tags (suggestions):** Holiday, Simulation, Casual, Decorating, Offline
- **Privacy policy URL:** https://diebeste.github.io/gingerbread-workshop/privacy.html
- **Contact / developer name:** Diebeste (or your Play developer name)

## Short description

(80-character limit; this is 79 characters including the period)

```
Build and decorate a 3D gingerbread house, then share a photo of your creation.
```

## Full description

```
Build a gingerbread house the way you would at the table: stand up the walls and roof, pipe the icing, add candy, then take a photo to share.

Gingerbread House Workshop is a cozy, offline 3D workshop. Drag each piece of the kit onto the board and watch it snap into place with a seam of icing. Pipe raised lines and dots in five colours, lay wafer shingles on the roof, and decorate with gumdrops, peppermints, candy canes, a pretzel fence, and more. When you are happy with it, add your name and take a photo of your house.

Features
• Four steps: Build, Ice, Decorate, and Finish
• Snap-together kit with icing seams and a setting time, just like a real house
• Piping bag with three tips and five icing colours, plus snowy icicle drips
• A tray of candies, wafer roof tiles, trees, and a pretzel fence that snaps around the yard
• Undo and redo, plus a “build it for me” helper if you want to jump to decorating
• Autosave as you go, named save slots, and a .gingerbread file you can keep or share
• Photo export with your name on a caption, ready to save or send
• Works in portrait or landscape, with touch dragging, pinch to zoom, and one-finger look-around
• Plays fully offline — no account, no ads, and no internet required

Your house stays on your device. Autosave and “My saves” live in the app. Use Save to export a file, Load to open one, and Photo to share a picture. Nothing is sent to us.

Happy decorating.
```

## Graphics

Place these in the Play Console store listing:

| Asset | File | Notes |
| --- | --- | --- |
| High-res icon | `icon-512.png` | 512 × 512 PNG, 32-bit |
| Feature graphic | `feature-graphic-1024x500.png` | 1024 × 500 PNG (required) |
| Phone screenshots | `screenshots/01-build.png` … `05-finish.png` | 1080 × 1920, at least two required; all five can be uploaded |

A 1024 × 1024 source icon is also in this folder as `icon-1024.png` if you need it later.

## Content rating (IARC questionnaire notes)

This is a casual decorating game. Suggested answers for the official questionnaire:

- Category: Game, not primarily a social or dating app, no user-to-user communication, no user-generated public content beyond an optional name on a photo the player keeps or shares themselves
- No violence, blood, or warfare
- No sexual content, nudity, or dating
- No language / profanity
- No controlled substances, gambling, or criminal activity
- No horror or frightening content
- No in-app purchases, ads, or paid content
- No account, location, or sharing of other people’s personal info
- The optional name is only used as a caption on the player’s own device

Expected rating: **Everyone** (or the local equivalent, e.g. PEGI 3 / ESRB Everyone).

If you enroll in **Designed for Families**, use the same “Everyone” rating and this privacy policy. The app does not collect any data from children (or anyone else).

## Data safety form

Answer that **the app does not collect or share any user data**.

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | No |
| Is data encrypted in transit? | Not applicable (no data is sent) |
| Can users request that data be deleted? | Not applicable (we never receive it) |
| Independent security review? | No |
| Collected data types (location, personal info, financial, health, messages, photos, files, audio, calendar, contacts, app activity, web browsing, app info and performance, device or other IDs) | None |
| Photos / files | The app can create a photo or a `.gingerbread` save file on the device and lets the player save or share it with the system share sheet. That file is not uploaded to us and should not be declared as collected data. |
| Internet permission | The Android package includes the normal Internet permission used by the WebView container. The game runs offline from bundled files and does not use the network to collect or transmit player data. Declare “no data collected,” not “collected.” |

## App access / testers

New personal Play developer accounts must complete **identity verification** and run a **closed test with at least 12 testers for 14 days** (and meet Play’s other current prerequisites) before the app can be rolled out to production. The $25 Play Console registration fee is a one-time payment to Google.

You will also need to accept Play’s policies, set a store listing, attach the privacy policy URL, complete the Data safety form, and upload the `.aab` (not the APK) on the Production or testing track.

## Signing

The release AAB and APK are signed with an **upload key** stored only on the build machine:

- Keystore: `/home/box/.secrets/gingerbread-upload.jks`
- Passwords and alias: `/home/box/.secrets/gingerbread-keystore.txt` (never commit or share this file)
- Key alias: `upload`
- Certificate SHA-256: `76:33:0A:3C:D5:64:F5:5C:FE:CD:0C:39:C5:A3:43:34:04:D1:18:E1:0A:14:89:41:29:AA:DC:85:0D:F7:B5:D9`

When you first upload the AAB, enroll in **Play App Signing**. Google will hold the app signing key; this upload key is what you use for future updates. Keep a backup of the `.jks` and the password file in a safe place only you control. Losing the upload key is recoverable through Play, but it is a hassle.

Do not put the keystore or passwords in the GitHub repo, in email, or in this `release/` folder.
