# Milkbox - Multi-Platform Development

Monorepo containing Web, Desktop (Electron), and Mobile (iOS/Android) applications.

## Project Structure

```text
milkbox/
├── apps/
│   ├── docs/          # Documentation site (Next.js)
│   ├── web/           # Web application (Next.js)
│   ├── desktop/       # Desktop app (Electron + Next.js)
│   └── mobile/        # Mobile app (React Native)
├── packages/
│   ├── core/          # Shared business logic
│   ├── ui/            # Shared UI components
│   ├── eslint-config/ # ESLint configuration
│   └── typescript-config/ # TypeScript configuration
└── pnpm-workspace.yaml # Workspace configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0

### Installation

```bash
pnpm install
```

## Development

### All Apps

```bash
pnpm dev
```

#### Web App

```bash
pnpm dev:web
```

#### Desktop (Electron)

```bash
pnpm dev:desktop
```

#### Mobile (iOS)

```bash
pnpm dev:mobile:ios
```

#### Mobile (Android)

```bash
pnpm dev:mobile:android
```

#### Documentation

```bash
pnpm dev:docs
```

## Building

### Build all apps

```bash
pnpm build
```

Each app will produce platform-specific outputs:

- **Web**: `.next/` directory for server deployment
- **Desktop**: Distributable installers for macOS/Windows/Linux
- **Mobile**: APK (Android) or IPA (iOS) files

## Project Architecture

### @repo/core

Shared business logic layer used across all platforms:

- API client utilities
- Common utility functions
- Type definitions

**Usage:**

```typescript
import { createApiClient, formatDate } from "@repo/core";
```

### @repo/ui

Shared UI component library for Web and Desktop:

- Button, Card, Code components
- Can be extended for platform-specific components

**Usage:**

```typescript
import { Button } from "@repo/ui/button";
```

### Apps

#### Web (`apps/web`)

- Next.js 16 application
- Server-side rendering
- Production-ready

#### Desktop (`apps/desktop`)

- Electron-based desktop application
- Next.js for UI rendering
- Cross-platform support (macOS, Windows, Linux)

#### Mobile (`apps/mobile`)

- React Native with Expo
- iOS and Android support
- Uses React Navigation for routing

#### Docs (`apps/docs`)

- Documentation website (Next.js)
- API references and guides

## Scripts

### Common Commands

| Command | Description |
| --- | --- |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all code |
| `pnpm check-types` | Type check all code |
| `pnpm format` | Format code with Prettier |

### Mobile-Specific

| Command | Description |
| --- | --- |
| `pnpm dev:mobile:ios` | Start iOS development |
| `pnpm dev:mobile:android` | Start Android development |
| `pnpm build:mobile:ios` | Build for iOS (requires EAS) |
| `pnpm build:mobile:android` | Build for Android (requires EAS) |

## Platform-Specific Setup

### Mobile (React Native)

See [apps/mobile/README.md](apps/mobile/README.md)

## Contributing

1. Create a feature branch
2. Make changes
3. Run `pnpm lint` and `pnpm check-types`
4. Submit a pull request

## License

MIT
