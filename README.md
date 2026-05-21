# ChatDock

A lightweight, embeddable chat widget and **visual builder studio** that is fully compatible with [iBlueprint](https://iblueprint.ai) API endpoints.

---

## Features

- **Single-file widget** (`chatdock.js`) — drop into any webpage with one `<script>` tag
- **iBlueprint compatible** — works directly with iBlueprint `/api/chat/:chatId` endpoints; `window.IBlueprintChat` is aliased for drop-in replacement
- **Visual Studio** — React-based builder with live preview, settings panel, and multi-language code generation
- Streaming (SSE) and standard request modes
- File upload support
- Markdown rendering (via CDN — no bundler needed)
- Privacy agreement popup
- Starter prompt pills
- Copy/Print conversation export
- Thinking `<think>` tag collapsible blocks
- Floating or inline display modes

---

## Quick Start — Embed the Widget

### CDN / Vanilla HTML

```html
<div id="my-chat"></div>
<script src="https://unpkg.com/chatdock/chatdock.js"></script>
<script>
  new ChatDock({
    chatId: 'your-chat-id',
    apiEndpoint: 'https://your-api.com/api/chat/your-chat-id',
    container: document.getElementById('my-chat'),
    title: 'Support Chat',
    theme: {
      primaryColor: '#1f6feb',
    },
  });
</script>
```

### Self-hosted

Download `chatdock.js` and serve it from your own server:

```html
<script src="/path/to/chatdock.js"></script>
```

---

## iBlueprint Compatibility

ChatDock is a drop-in replacement for `IBlueprintChat`. You can either:

**Option A — use ChatDock with iBlueprint API:**

```html
<script src="chatdock.js"></script>
<script>
  new ChatDock({
    chatId: 'your-chat-id',
    apiEndpoint: 'https://your-iblueprint-instance.com/api/chat/your-chat-id',
  });
</script>
```

**Option B — keep existing `IBlueprintChat` calls (shim included):**

```html
<!-- chatdock.js exports window.IBlueprintChat as an alias -->
<script src="chatdock.js"></script>
<script>
  new IBlueprintChat({ chatId: '...', apiEndpoint: '...' });
</script>
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chatId` | `string` | **required** | Unique identifier for the chatbot |
| `apiEndpoint` | `string` | auto-detected | Full URL to your chat API endpoint |
| `title` | `string` | `'Chat'` | Header title |
| `inline` | `boolean` | `true` | `true` = embedded, `false` = floating bubble |
| `container` | `Element` | `document.body` | DOM element to render into |
| `useStreaming` | `boolean` | `false` | Enable SSE streaming responses |
| `initialMessage` | `string` | `null` | Welcome message (supports Markdown) |
| `legalMessage` | `string` | AI disclaimer | Footer disclaimer text |
| `starterPrompts` | `string[]` | `null` | Quick-reply prompt buttons |
| `enableFileUpload` | `boolean` | `false` | Allow file attachments |
| `enableExportTools` | `boolean` | `false` | Show copy/print buttons |
| `requirePrivacyAgreement` | `boolean` | `false` | Show privacy popup before first message |
| `privacyPolicyUrl` | `string` | `null` | Link shown in privacy popup |
| `authToken` | `string` | `null` | Bearer token for authenticated endpoints |
| `sessionId` | `string` | `null` | Override the conversation session ID |
| `deploymentId` | `string` | `null` | Deployment tracking ID |
| `metadata` | `object` | `null` | Custom metadata sent with each request |
| `multimodalRendererUrl` | `string` | `null` | Path to optional multimodal renderer module |
| `dimensions.width` | `string` | `'350px'` | Widget width (CSS value) |
| `dimensions.height` | `string` | `'500px'` | Widget height (CSS value) |
| `theme` | `object` | see below | Full theme configuration |

### Theme Options

```js
theme: {
  primaryColor: '#1f6feb',
  textColor: '#ffffff',
  chatBackground: '#f9f9f9',
  buttonHoverColor: '#1a5bcc',
  userMessageBg: '#1f6feb',
  userMessageFontColor: '#ffffff',
  botMessageBg: '#e9e9e9',
  botMessageFontColor: '#333333',
  bannerColor: '#1f6feb',
  bannerFontColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  logoUrl: '',
}
```

---

## Public Methods

```js
const chat = new ChatDock({ chatId: '...', ... });

chat.clearConversation();   // Clear chat history and reset
chat.toggle();              // Open/close (floating mode only)
chat.destroy();             // Remove widget from DOM and clean up
chat.addMessage(role, content); // Programmatically add a message
chat.sendMessage(text);     // Send a message programmatically
```

---

## ChatDock Studio (Visual Builder)

The studio is a React app that lets you visually configure the widget, preview it live, and generate copy-paste implementation code.

### Installation

```bash
cd studio
pnpm install   # or: npm install
pnpm dev       # starts on http://localhost:5173
```

### Studio Layout

```
┌──────────────────┬──────────────────────┐
│  CONFIG PANEL    │   LIVE PREVIEW       │
│                  │   (chat widget)      │
│  ● Basic         ├──────────────────────┤
│  ● Theme         │   CODE OUTPUT        │
│  ● Features      │   [JS][React][HTML]  │
│  ● Messages      │   [iBlueprint]       │
│  ● Privacy       │   <copy-paste code>  │
└──────────────────┴──────────────────────┘
```

### Build for production

```bash
cd studio
pnpm build   # outputs to studio/dist/
```

---

## Examples

See the [`examples/`](./examples) directory:

- [`examples/vanilla.html`](examples/vanilla.html) — Plain HTML, floating widget
- [`examples/react-example.jsx`](examples/react-example.jsx) — React component wrapper

---

## React Usage

```jsx
import { useEffect, useRef } from 'react';

export default function ChatWidget({ chatId, apiEndpoint }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!window.ChatDock) return;
    const widget = new window.ChatDock({
      chatId,
      apiEndpoint,
      container: containerRef.current,
      inline: true,
      dimensions: { width: '100%', height: '500px' },
    });
    return () => widget.destroy();
  }, [chatId, apiEndpoint]);

  return <div ref={containerRef} style={{ width: '100%', height: '500px' }} />;
}
```

Load `chatdock.js` via a `<script>` tag in your HTML, or dynamically in a `useEffect`.

---

## License

MIT
