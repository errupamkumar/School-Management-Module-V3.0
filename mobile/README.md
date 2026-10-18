# Vidyalaya mobile apps (Android and iOS)

Vidyalaya ships two ways to put the school in a parent's pocket:

| Option | What users do | Store listing | Push notifications | Effort |
|---|---|---|---|---|
| **Installable app (PWA)**, built in | Open the school's Vidyalaya link and tap **Install app** (Android) or **Share → Add to Home Screen** (iPhone) | No | Yes (Android; iPhone with iOS 16.4+ once added to Home Screen) | None. It works today. |
| **Store app (this folder)** | Download from Google Play / App Store | Yes, under your brand | Yes (web push inside the app; add FCM/APNs for native push) | Build once per release |

The store app is a native shell (Capacitor) that loads your hosted Vidyalaya site. Every feature, role and permission is identical, and new releases of the web app reach the store app instantly without resubmission.

## Build

Prerequisites: Node 20+, **Android Studio** (for Android) and/or **Xcode on a Mac** (for iOS). These cannot be produced without those toolchains.

```bash
cd mobile
npm install
# 1. Point the shell at your deployment
#    edit capacitor.config.json → "server.url": "https://erp.yourschool.in"
#    edit "appId" (e.g. in.yourschool.erp) and "appName"
npm run add:android      # creates mobile/android
npm run add:ios          # creates mobile/ios (macOS only)
npm run sync
npm run open:android     # Android Studio → Build → Generate Signed Bundle (.aab) → upload to Play Console
npm run open:ios         # Xcode → Product → Archive → upload to App Store Connect
```

## Icons and splash

Use `public/icons/maskable-512.png` (Android adaptive icon) and `public/icons/icon-512.png` (iOS) from the main project. Android Studio's *Image Asset* tool and Xcode's *AppIcon* set generate every required size from these.

## Store checklist

- Privacy policy URL (DPDP-compliant) and a data-safety form that lists: name, phone, student records, location (only when Driver mode or live bus tracking is used).
- Demo login for the reviewer (a parent account in a demo school).
- Location permission text for drivers: "Shares the school bus location with parents during a trip."
- Category: Education.
