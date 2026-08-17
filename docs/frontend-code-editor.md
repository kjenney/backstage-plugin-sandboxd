# Code Editor

The Code Editor is a CodeMirror-powered code editor with a file tree sidebar, connected to sandboxd's file API for reading and writing files inside running sandboxes.

## Features

- **File tree sidebar** — Navigate the sandbox filesystem with expandable directories
- **Syntax highlighting** — Automatic language detection for JavaScript, TypeScript, Python, and HTML
- **Dark theme** — One Dark theme by default
- **Save functionality** — Write changes back to the sandbox via sandboxd's file API

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CodeEditor                     │
│  ┌──────────┐  ┌─────────────────────────────┐  │
│  │ FileTree │  │       CodeMirror             │  │
│  │          │  │  (syntax-highlighted editor)  │  │
│  │          │  │                               │  │
│  │          │  │  [Save button]                 │  │
│  └──────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Language Support

| File Extension | Language Support |
|---------------|-----------------|
| `.js`, `.jsx` | JavaScript |
| `.ts`, `.tsx` | TypeScript |
| `.py` | Python |
| `.html`, `.htm` | HTML |

## File Tree

The file tree sidebar shows the sandbox filesystem with:

- Expandable directories (click to toggle)
- File icons for different file types
- Current file indicator
- Click a file to open it in the editor

## API Integration

The editor communicates with sandboxd through three custom hooks:

| Hook | Purpose |
|------|---------|
| `useSandboxdFileTree(entityName)` | Fetches the file tree for the entity's sandbox |
| `useSandboxdReadFile()` | Reads file content from the sandbox |
| `useSandboxdWriteFile()` | Writes file content back to the sandbox |

## Usage

```tsx
import { CodeEditor } from '@internal/backstage-plugin-sandboxd-frontend';

// Standalone usage
<Entity.layout.Content title="Code Editor">
  <CodeEditor />
</Entity.layout.Content>
```

The component automatically detects the current entity via `useEntity()` and connects to the corresponding sandbox.
