# Milkbox Mobile

React Native mobile application for Milkbox (iOS and Android).

## Development

### iOS

```bash
pnpm dev:ios
```

### Android

```bash
pnpm dev:android
```

### Start development server

```bash
pnpm dev
```

## EAS Build

EAS Build runs in Expo's cloud and is invoked with `pnpm dlx eas-cli`, so no global EAS CLI
installation is needed.

```bash
# From the repository root
pnpm dlx eas-cli login
pnpm --dir apps/mobile dlx eas-cli init
```

The first `init` links this app to an Expo project and may add an EAS project ID to
`app.json`. The native identifiers are:

- Android application ID: `com.transcode001.milkbox`
- iOS bundle identifier: `com.transcode001.milkbox`

Run builds from the repository root:

```bash
# Android device/internal distribution (APK)
pnpm build:mobile:android:apk

# Google Play (AAB)
pnpm build:mobile:android:store

# iOS Simulator
pnpm build:mobile:ios:simulator

# iOS physical devices/internal distribution
pnpm build:mobile:ios:device

# App Store Connect/TestFlight
pnpm build:mobile:ios:store

# Android and iOS store builds in one command
pnpm build:mobile:store
```

These commands map to profiles in `eas.json`:

| Profile | Platform | Output/use |
| --- | --- | --- |
| `android-apk` | Android | Installable APK for devices and internal testing |
| `android-store` | Android | AAB for Google Play |
| `ios-simulator` | iOS | Simulator-only archive |
| `ios-device` | iOS | Internally distributed build for registered devices |
| `ios-store` | iOS | App Store/TestFlight archive |
| `store` | Android + iOS | Both store artifacts |

EAS can generate and store the Android keystore and iOS distribution credentials during
the first build. An Apple Developer Program membership is required for physical-device and
App Store builds, and physical devices may need to be registered. A Google Play Console
account is required when publishing the AAB.

The completed build's page and download URL are printed by EAS CLI and remain available in
the Expo dashboard. Inspect or update managed credentials with:

```bash
pnpm dlx eas-cli credentials
```

## Requirements

- Node.js >= 18
- pnpm >= 9
- Expo account
- Apple Developer Program membership for iOS device/App Store builds
- Google Play Console account for publishing Android store builds
