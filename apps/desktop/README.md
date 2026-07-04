# Milkbox Desktop

Electron-based desktop application for Milkbox.

## Development

From the repository root:

```bash
pnpm dev:desktop
```

Or from `apps/desktop`:

```bash
pnpm dev
```

This starts the Next.js renderer on port 3001 and the Electron main process in watch mode.

## Building

From the repository root:

```bash
pnpm --filter desktop build
```

For distributable packages, run from `apps/desktop`:

```bash
pnpm build:release
```

The release command builds the renderer and main process, then runs `electron-builder`.

---
<!-- last reviewed: 2026-07-05 -->
