# Terminal

The Terminal component provides an xterm.js terminal connected to a running sandbox via sandboxd's terminal API. It allows developers to interact with their sandbox environment directly from Backstage.

## Features

- **Live terminal** — xterm.js-based terminal with full keyboard support
- **Sandbox connection** — Automatically connects to the current entity's sandbox
- **Resize support** — Terminal resizes with the container
- **Reconnection** — Handles terminal disconnections gracefully

## Usage

```tsx
import { Terminal } from '@internal/backstage-plugin-sandboxd-frontend';

// Standalone usage
<Entity.layout.Content title="Terminal">
  <Terminal />
</Entity.layout.Content>
```

The component automatically detects the current entity via `useEntity()` and connects to the corresponding sandbox terminal.

## Requirements

- The sandbox must be in a `running` or `sleeping` state (the terminal will wake a sleeping sandbox)
- The entity must have the `sandboxd.backstage.io/sandboxd-enabled` annotation
