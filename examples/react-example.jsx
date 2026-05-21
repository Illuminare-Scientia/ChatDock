/**
 * ChatDock React Component Example
 *
 * Usage:
 *   1. Add chatdock.js to your HTML:
 *        <script src="https://unpkg.com/chatdock/chatdock.js"></script>
 *      Or load it dynamically (see below).
 *
 *   2. Import and render this component anywhere in your React app.
 */

import { useEffect, useRef, useState } from 'react';

const CHATDOCK_CDN = 'https://unpkg.com/chatdock/chatdock.js';

function useChatDockScript() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.ChatDock);

  useEffect(() => {
    if (window.ChatDock) { setReady(true); return; }

    const existing = document.querySelector(`script[src="${CHATDOCK_CDN}"]`);
    const script = existing || document.createElement('script');
    if (!existing) {
      script.src = CHATDOCK_CDN;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => setReady(true));
    script.addEventListener('error', () => console.error('Failed to load chatdock.js'));
  }, []);

  return ready;
}

/**
 * Inline chat widget component.
 *
 * Props:
 *   chatId        (string, required) — your chatbot ID
 *   apiEndpoint   (string, required) — full API endpoint URL
 *   title         (string)
 *   initialMessage (string)
 *   theme         (object)
 *   dimensions    (object) — { width, height }
 *   ... (any ChatDock option)
 */
export default function ChatDockWidget({
  chatId,
  apiEndpoint,
  title = 'Chat',
  initialMessage = null,
  starterPrompts = null,
  legalMessage = 'AI can make mistakes. Please verify important information.',
  enableFileUpload = false,
  enableExportTools = false,
  useStreaming = false,
  theme = {},
  dimensions = { width: '100%', height: '500px' },
  metadata = null,
  authToken = null,
  deploymentId = null,
  style = {},
}) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const scriptReady = useChatDockScript();

  useEffect(() => {
    if (!scriptReady || !containerRef.current) return;
    if (!window.ChatDock) { console.error('ChatDock not available'); return; }

    // Destroy previous instance if re-mounting
    widgetRef.current?.destroy();

    widgetRef.current = new window.ChatDock({
      chatId,
      apiEndpoint,
      title,
      initialMessage,
      starterPrompts,
      legalMessage,
      enableFileUpload,
      enableExportTools,
      useStreaming,
      theme,
      dimensions: { width: '100%', height: '100%' },
      metadata,
      authToken,
      deploymentId,
      inline: true,
      container: containerRef.current,
    });

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [scriptReady, chatId, apiEndpoint]);

  if (!scriptReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...dimensions, ...style }}>
        <span style={{ color: '#888', fontSize: 14 }}>Loading chat…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: dimensions.width, height: dimensions.height, ...style }}
    />
  );
}

// ─── Usage example ────────────────────────────────────────────────────────────
//
// import ChatDockWidget from './react-example.jsx';
//
// function MyPage() {
//   return (
//     <ChatDockWidget
//       chatId="my-chatbot-id"
//       apiEndpoint="https://your-api.com/api/chat/my-chatbot-id"
//       title="Support Chat"
//       initialMessage="Hi! How can I help you?"
//       starterPrompts={['Tell me more', 'Get started']}
//       dimensions={{ width: '400px', height: '600px' }}
//       theme={{ primaryColor: '#1f6feb' }}
//     />
//   );
// }
//
// ─── iBlueprint note ──────────────────────────────────────────────────────────
//
// ChatDock is fully compatible with iBlueprint API endpoints.
// Set apiEndpoint to your iBlueprint instance URL, e.g.:
//   apiEndpoint="https://app.iblueprint.ai/api/chat/your-chat-id"
//
// window.IBlueprintChat is also available as an alias.
