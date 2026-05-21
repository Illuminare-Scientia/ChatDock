import { useEffect, useRef, useMemo, useState, useCallback } from 'react';

function buildSrcdoc(chatdockSrc, config) {
  // Build config for the preview (always inline in preview)
  const previewConfig = {
    chatId: config.chatId || 'preview',
    apiEndpoint: config.apiEndpoint || null,
    title: config.title,
    inline: true,
    useStreaming: false, // disable streaming in preview
    legalMessage: config.legalMessage,
    initialMessage: config.initialMessage || null,
    requirePrivacyAgreement: config.requirePrivacyAgreement,
    privacyPolicyUrl: config.privacyPolicyUrl || null,
    enableFileUpload: config.enableFileUpload,
    enableExportTools: config.enableExportTools,
    exportOptions: config.exportOptions,
    starterPrompts: config.starterPrompts?.length ? config.starterPrompts : null,
    dimensions: { width: '100%', height: '100%' },
    theme: { ...config.theme },
  };

  const configStr = JSON.stringify(previewConfig, null, 2);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f0f0f0;
    }
    #chat-root {
      width: 100%;
      height: 100%;
    }
  </style>
  <script>
${chatdockSrc}
  </script>
</head>
<body>
  <div id="chat-root"></div>
  <script>
    try {
      var config = ${configStr};
      config.container = document.getElementById('chat-root');
      // Override apiEndpoint for preview — send to nowhere, just show UI
      config.apiEndpoint = config.apiEndpoint || 'https://example.invalid/api/chat/preview';
      new ChatDock(config);
    } catch (e) {
      document.body.innerHTML = '<div style="padding:20px;color:#c00;font-family:sans-serif;font-size:14px;"><strong>Preview Error:</strong><br>' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
}

export default function ChatPreview({ config }) {
  const [chatdockSrc, setChatdockSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Load chatdock.js source once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}chatdock.js`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load chatdock.js (${r.status})`);
        return r.text();
      })
      .then((src) => {
        setChatdockSrc(src);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const srcdoc = useMemo(() => {
    if (!chatdockSrc) return '';
    return buildSrcdoc(chatdockSrc, config);
  }, [chatdockSrc, config]);

  // Refresh the iframe when config changes by toggling key
  const [iframeKey, setIframeKey] = useState(0);
  const lastSrcdocRef = useRef('');

  useEffect(() => {
    if (srcdoc && srcdoc !== lastSrcdocRef.current) {
      lastSrcdocRef.current = srcdoc;
      // Small debounce so rapid slider/color changes don't spam
      const t = setTimeout(() => setIframeKey((k) => k + 1), 300);
      return () => clearTimeout(t);
    }
  }, [srcdoc]);

  if (loading) {
    return (
      <div className="preview-placeholder">
        <div className="preview-spinner" />
        <p>Loading preview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-placeholder error">
        <p>⚠ Could not load chatdock.js</p>
        <p className="preview-error-detail">{error}</p>
        <p className="preview-error-detail">Make sure <code>studio/public/chatdock.js</code> exists.</p>
      </div>
    );
  }

  return (
    <div className="preview-wrapper">
      <div className="preview-bar">
        <span className="preview-badge">Live Preview</span>
        <button
          className="preview-refresh-btn"
          onClick={() => setIframeKey((k) => k + 1)}
          title="Refresh preview"
        >
          ↺ Refresh
        </button>
      </div>
      <div className="preview-frame-wrap">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          srcDoc={srcdoc}
          title="ChatDock Preview"
          sandbox="allow-scripts"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
