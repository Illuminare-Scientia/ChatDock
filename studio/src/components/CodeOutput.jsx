import { useState, useCallback } from 'react';

const TABS = ['Vanilla JS', 'React', 'HTML', 'iBlueprint'];

function buildConfigObj(config, forIBlueprint = false) {
  const defaults = {
    title: 'Chat',
    inline: true,
    useStreaming: false,
    legalMessage: 'AI chatbots can make mistakes. Please verify important information.',
    enableFileUpload: false,
    enableExportTools: false,
    requirePrivacyAgreement: false,
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
    },
    dimensions: { width: '350px', height: '500px' },
    exportOptions: { includeTitle: true, includeTimestamp: true },
  };

  const lines = [];
  const className = forIBlueprint ? 'IBlueprintChat' : 'ChatDock';
  const scriptSrc = forIBlueprint
    ? 'https://your-iblueprint.com/iblueprintChat.js'
    : 'https://unpkg.com/chatdock/chatdock.js';

  const push = (key, val, indent = '    ') => {
    lines.push(`${indent}${key}: ${JSON.stringify(val)},`);
  };

  // Always include chatId and apiEndpoint
  push('chatId', config.chatId || 'your-chat-id');
  push('apiEndpoint', config.apiEndpoint || 'https://your-api.com/api/chat/your-chat-id');

  if (config.title !== defaults.title) push('title', config.title);
  if (!config.inline) push('inline', false);
  if (config.useStreaming) push('useStreaming', true);
  if (config.initialMessage) push('initialMessage', config.initialMessage);
  if (config.legalMessage !== defaults.legalMessage) push('legalMessage', config.legalMessage);

  if (config.starterPrompts?.length) {
    lines.push(`    starterPrompts: ${JSON.stringify(config.starterPrompts)},`);
  }

  if (config.enableFileUpload) push('enableFileUpload', true);

  if (config.enableExportTools) {
    push('enableExportTools', true);
    const expOpts = {};
    if (!config.exportOptions.includeTitle) expOpts.includeTitle = false;
    if (!config.exportOptions.includeTimestamp) expOpts.includeTimestamp = false;
    if (Object.keys(expOpts).length) {
      lines.push(`    exportOptions: ${JSON.stringify(expOpts)},`);
    }
  }

  if (config.requirePrivacyAgreement) {
    push('requirePrivacyAgreement', true);
    if (config.privacyPolicyUrl) push('privacyPolicyUrl', config.privacyPolicyUrl);
  }

  if (config.authToken) push('authToken', config.authToken);

  // Dimensions
  const dimDiff = config.dimensions.width !== defaults.dimensions.width ||
    config.dimensions.height !== defaults.dimensions.height;
  if (dimDiff) {
    lines.push(`    dimensions: { width: ${JSON.stringify(config.dimensions.width)}, height: ${JSON.stringify(config.dimensions.height)} },`);
  }

  // Theme — only emit keys that differ from defaults
  const themeDiffs = {};
  for (const [k, v] of Object.entries(config.theme)) {
    if (k === 'logoUrl' && !v) continue;
    if (defaults.theme[k] !== v) themeDiffs[k] = v;
  }
  if (config.theme.logoUrl) themeDiffs.logoUrl = config.theme.logoUrl;
  if (Object.keys(themeDiffs).length) {
    const themeLines = Object.entries(themeDiffs).map(([k, v]) => `      ${k}: ${JSON.stringify(v)},`).join('\n');
    lines.push(`    theme: {\n${themeLines}\n    },`);
  }

  return { lines, className, scriptSrc };
}

function generateVanillaJS(config) {
  const { lines, className, scriptSrc } = buildConfigObj(config);
  return `<!-- 1. Add a container element -->
<div id="chat-widget"></div>

<!-- 2. Load ChatDock -->
<script src="${scriptSrc}"></script>

<!-- 3. Initialize -->
<script>
  new ${className}({
${lines.join('\n')}
    container: document.getElementById('chat-widget'),
  });
</script>`;
}

function generateReact(config) {
  const { lines, className, scriptSrc } = buildConfigObj(config);
  return `import { useEffect, useRef } from 'react';

// Load chatdock.js once (e.g., in index.html or dynamically)
// <script src="${scriptSrc}"></script>

export default function ChatWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!window.${className}) {
      console.error('${className} not loaded. Add chatdock.js script tag.');
      return;
    }

    const widget = new window.${className}({
${lines.join('\n')}
      container: containerRef.current,
    });

    return () => widget.destroy();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '${config.dimensions.width}', height: '${config.dimensions.height}' }}
    />
  );
}`;
}

function generateHTML(config) {
  const { lines, className, scriptSrc } = buildConfigObj(config);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chat</title>
  <script src="${scriptSrc}"></script>
</head>
<body>

  <div id="chat-widget"></div>

  <script>
    window.addEventListener('DOMContentLoaded', function () {
      new ${className}({
${lines.join('\n')}
        container: document.getElementById('chat-widget'),
      });
    });
  </script>

</body>
</html>`;
}

function generateIBlueprint(config) {
  const { lines } = buildConfigObj(config, true);
  return `<!-- iBlueprint Embed Code -->
<!-- Replace the src with your actual iBlueprint instance URL -->
<script src="https://your-iblueprint.com/iblueprintChat.js"></script>

<!-- Or use ChatDock (fully compatible with iBlueprint API): -->
<!-- <script src="https://unpkg.com/chatdock/chatdock.js"></script> -->

<div id="chat-widget"></div>
<script>
  // Both IBlueprintChat and ChatDock accept identical options
  new IBlueprintChat({
${lines.join('\n')}
    container: document.getElementById('chat-widget'),
  });
</script>

<!-- ChatDock Note:
  chatdock.js exports window.IBlueprintChat as an alias.
  Swapping <script src> is the only change needed to migrate.
-->`;
}

const GENERATORS = {
  'Vanilla JS': generateVanillaJS,
  React: generateReact,
  HTML: generateHTML,
  iBlueprint: generateIBlueprint,
};

export default function CodeOutput({ config }) {
  const [activeTab, setActiveTab] = useState('Vanilla JS');
  const [copied, setCopied] = useState(false);

  const code = GENERATORS[activeTab](config);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="code-output">
      <div className="code-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`code-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'iBlueprint' ? (
              <><span className="ib-dot" />iBlueprint</>
            ) : tab}
          </button>
        ))}
        <div className="code-tabs-spacer" />
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? '✓ Copied!' : '⎘ Copy'}
        </button>
      </div>

      <div className="code-body">
        <pre className="code-pre">
          <code>{code}</code>
        </pre>
      </div>

      {activeTab === 'iBlueprint' && (
        <div className="code-note">
          <strong>iBlueprint compatible:</strong> ChatDock works with all iBlueprint API endpoints. 
          Replace the script src with <code>chatdock.js</code> and your existing code continues to work unchanged.
        </div>
      )}
    </div>
  );
}
