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

# Build specific app
pnpm build:mobile
pnpm build:web
pnpm build:desktop
```

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