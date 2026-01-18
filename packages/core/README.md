# @repo/core

Shared business logic and utilities for all platforms (Web, Electron, Mobile).

## Features

- **API Client**: Reusable API client for all platforms
- **Utilities**: Common utility functions (date formatting, debounce, throttle)
- **Type Definitions**: Shared TypeScript types

## Usage

```typescript
import { createApiClient, formatDate } from "@repo/core";

const api = createApiClient("https://api.example.com");
const formatted = formatDate(new Date());
```
