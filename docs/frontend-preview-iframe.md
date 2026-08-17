# Preview Iframe

The sandboxd Backstage plugin embeds a live preview of sandboxed apps directly in the Backstage entity page as an iframe. This eliminates the need to open a new tab to view the preview, and provides a seamless development experience.

## Overview

The `PreviewIframe` component provides:

1. **Inline preview iframe** — Embeds the sandboxd preview URL directly in the entity page
2. **Wake-state indicator** — Shows a "warming up" loading state when a sleeping sandbox is being woken
3. **Copy-to-clipboard** — Copy the preview URL to the clipboard with one click
4. **Open in new tab** — Button to open the preview in a new browser tab
5. **Fullscreen mode** — Toggle the preview to fullscreen
6. **Sleep/Wake controls** — Direct controls to sleep or wake the sandbox from the preview

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                 Backstage Entity Page                  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │           PreviewIframe Component                │  │
│  │                                                  │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  Toolbar: Preview  [Sleep] [Wake] [FS]    │  │  │
│  │  ├───────────────────────────────────────────┤  │  │
│  │  │  WakeIndicator (if sleeping → waking)     │  │  │
│  │  ├───────────────────────────────────────────┤  │  │
│  │  │  URL: https://...  [Copy] [Open]          │  │  │
│  │  ├───────────────────────────────────────────┤  │  │
│  │  │                                           │  │  │
│  │  │  ┌─────────────────────────────────────┐  │  │  │
│  │  │  │                                     │  │  │  │
│  │  │  │     Iframe (preview URL)            │  │  │  │
│  │  │  │                                     │  │  │  │
│  │  │  │                                     │  │  │  │
│  │  │  └─────────────────────────────────────┘  │  │  │
│  │  │                                           │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## Component Usage

Import the `PreviewIframe` component and render it on the entity page:

```tsx
import { PreviewIframe } from '@internal/backstage-plugin-sandboxd-frontend';

<Entity.layout.Route path="/sandboxd" title="Sandboxd">
  <PreviewIframe />
</Entity.layout.Route>
```

The component requires the entity to have a sandboxd app associated with it. If no app is found, it shows a "start the sandbox first" message.

## Features

### Inline Preview Iframe

The preview URL is embedded directly in the entity page as an iframe. This allows developers to view their app without leaving Backstage. The iframe is sandboxed with the following permissions:

- `allow-scripts` — Required for the app to run
- `allow-same-origin` — Required for cookies and local storage
- `allow-popups` — Required for any popups the app may open
- `allow-forms` — Required for form submissions

### Wake-State Indicator

When a sandbox is sleeping, the preview URL is not yet active. The `PreviewIframe` component detects this state and shows a "warming up" indicator with a pulsing animation:

```
┌──────────────────────────────────────┐
│        🔶 Waking up sandbox…         │
│  This may take 15–30 seconds         │
└──────────────────────────────────────┘
```

The indicator has a pulse animation on the side to visually communicate that the sandbox is waking up.

### Copy-to-Clipboard

The preview URL is displayed in a monospace text field with a "Copy" button. Clicking the button copies the URL to the clipboard and shows a "Copied!" confirmation:

```
Preview URL
https://app-123.preview.localhost  [Copy] [Open]
```

When the sandbox is sleeping and waking up, the URL field shows "… (waking up) …" until the sandbox is ready.

### Open in New Tab

The "Open" button opens the preview URL in a new browser tab. This is useful when the developer wants to use the app alongside Backstage.

### Fullscreen Mode

The "Fullscreen" button expands the preview iframe to fill the entire screen. This is useful for demos or when the developer wants a distraction-free view of the preview.

```
┌─────────────────────────────────────────────┐
│ Preview                    [Exit Fullscreen]│
├─────────────────────────────────────────────┤
│                                             │
│              Iframe (fullscreen)            │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Sleep/Wake Controls

When the sandbox is running, the "Sleep" button appears in the toolbar, allowing the developer to put the sandbox to sleep. When the sandbox is sleeping, the "Wake" button appears, allowing the developer to wake it up.

## Configuration

The preview iframe height defaults to 400px. To customize the height, wrap the component in a container with the desired height:

```tsx
<Box style={{ height: 600 }}>
  <PreviewIframe />
</Box>
```

## Error Handling

The `PreviewIframe` component handles errors gracefully:

- **No preview available** — Shows a message encouraging the user to start the sandbox
- **Iframe load error** — Shows an error message suggesting the sandbox may need to be woken up
- **Authentication error** — Shows an error message with the authentication failure details

## TLS Configuration

When sandboxd is deployed in production with TLS enabled, the preview URLs will use HTTPS. The `PreviewIframe` component handles both HTTP and HTTPS preview URLs transparently.

## Security Considerations

- **CSP headers** — If the sandboxd preview server uses Content-Security-Policy headers, the `PreviewIframe` may be blocked. Ensure the CSP allows the iframe to be embedded by the Backstage domain.
- **X-Frame-Options** — The sandboxd preview server should not set `X-Frame-Options: DENY` or `SAMEORIGIN` as this will prevent the iframe from loading.
- **Auth-gated URLs** — The preview iframe uses the auth-gated preview URL returned by the backend, which includes a Backstage session token. This ensures that only authenticated Backstage users can access the preview.
