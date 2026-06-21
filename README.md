# Milkbox

An application that enables grouping and managing tasks efficiently.

## Features

- Category-based task management
- Multi-platform support (Web, Desktop, Mobile)
- Scheduler pairing (planned)

| Home | Add Task |
| --- | --- |
| ![Home](/assets/home.png) | ![Add Task](/assets/addtask.png) |

## Project Structure

### Apps

- `mobile`: Mobile application (React Native + Expo)
- `desktop`: Desktop application (Electron)
- `web`: Web application (Next.js)
- `docs`: Documentation site (Next.js)

### Packages

- `@milkbox/shared`: Shared business logic and type definitions
- `@repo/ui`: Shared UI component library
- `@repo/eslint-config`: ESLint configurations
- `@repo/typescript-config`: TypeScript configurations

## Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0
- Expo account
- Apple Developer Program membership for iOS device and App Store/TestFlight builds
- Google Play Console account for publishing Android App Bundles

EAS Build runs in Expo's cloud, so local Xcode and Android Studio installations are not
required for the builds documented below. Local simulator or device development may still
require the corresponding platform tools.

### Installation

```bash
pnpm install
```

## Development

### Mobile App

```bash
# iOS
pnpm dev:mobile:ios

# Android
pnpm dev:mobile:android
```

### Web App(Under adjustment)

```bash
pnpm dev:web
```

### Desktop App(Under adjustment)

```bash
pnpm dev:desktop
```

## Build

```bash
# Build all apps(Under adjustment)
pnpm build
```

### Mobile EAS Build

The mobile app uses EAS Build through `pnpm dlx eas-cli`; a globally installed EAS CLI is
not required.

Log in to Expo from the repository root:

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli whoami
```

Link the mobile app to an Expo project the first time:

```bash
(cd apps/mobile && pnpm dlx eas-cli init)
```

This may add an EAS project ID to the Expo configuration. Review that generated change
before committing it.

Build commands:

```bash
# Installable APK for Android devices and internal testing
pnpm build:mobile:android:apk

# Android App Bundle for Google Play
pnpm build:mobile:android:store

# iOS Simulator archive
pnpm build:mobile:ios:simulator

# Installable iOS build for registered devices and internal distribution
pnpm build:mobile:ios:device

# iOS archive for App Store Connect and TestFlight
pnpm build:mobile:ios:store

# Build Android and iOS store artifacts together
pnpm build:mobile:store
```

Artifact differences:

- **APK**: directly installable on Android devices; intended for internal testing.
- **AAB**: publishing artifact uploaded to Google Play; not directly installed by users.
- **iOS Simulator**: runs only in the iOS Simulator and cannot be installed on a physical device.
- **iOS device/internal**: signed for internal distribution to registered physical devices.
- **App Store/TestFlight**: signed store archive intended for App Store Connect submission.

EAS can create and manage Android keystores and iOS signing credentials interactively
during the first build. iOS device builds may require device registration. Store builds
require the appropriate Apple or Google developer account, but uploading to the stores is
a separate step from creating the build.

When a cloud build finishes, the CLI prints its build page and artifact URL. Builds and
downloads are also available from the Expo dashboard. Credential status can be inspected
with:

```bash
(cd apps/mobile && pnpm dlx eas-cli credentials)
```

See [`apps/mobile/README.md`](apps/mobile/README.md) for the profile mapping and
mobile-specific details.

## Tech Stack

- **Language**: TypeScript
- **Mobile**: React Native, Expo
- **Web/Desktop**: Next.js, Electron
- **Database**: SQLite (Mobile), TBD for others
- **Monorepo Tools**: Turborepo, pnpm workspaces

## Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## License

Proprietary - All Rights Reserved

This software is private and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.
