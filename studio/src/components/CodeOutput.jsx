import { useState, useCallback, useEffect } from 'react';

const TABS = ['Vanilla JS', 'React', 'HTML', 'WordPress', 'iBlueprint'];

// ─── Step-by-step instructions per tab ──────────────────────────────────────
const TAB_STEPS = {
  'Vanilla JS': {
    intro: 'Embed the ChatDock widget in any standard webpage — no build tools required.',
    steps: [
      { heading: 'Add a container', body: 'Paste <div id="chat-widget"></div> at the spot in your HTML where you want the chat to appear.' },
      { heading: 'Load the script', body: 'Add the <script src="chatdock.js"></script> tag just before </body> (or in <head>). The generated code shows the exact CDN URL.' },
      { heading: 'Paste the init block', body: 'Copy the second <script> block and place it directly after the chatdock.js script tag.' },
      { heading: 'Set your credentials', body: 'Replace the chatId value with your chatbot ID and apiEndpoint with your API URL. Both are visible in the Config panel on the left.' },
      { heading: 'Open in a browser', body: 'Load the page — the widget renders inside your container element automatically.' },
    ],
    tip: 'Use the iBlueprint Connect panel on the left to auto-fill chatId and apiEndpoint directly from your deployment.',
  },
  React: {
    intro: 'Drop ChatDock into any React project using the generated hook-based component.',
    steps: [
      { heading: 'Load the script', body: 'Add <script src="chatdock.js"></script> to public/index.html so window.ChatDock is available globally. Alternatively, load it dynamically inside a useEffect.' },
      { heading: 'Save the component', body: 'Copy the generated code and save it as src/components/ChatWidget.jsx in your project.' },
      { heading: 'Import and render', body: 'Import ChatWidget and place <ChatWidget /> wherever you want the chat in your JSX tree.' },
      { heading: 'Set your credentials', body: 'Replace chatId and apiEndpoint inside ChatWidget.jsx with your real values.' },
      { heading: 'Run your app', body: 'The widget mounts automatically. It calls widget.destroy() on unmount to prevent memory leaks.' },
    ],
    tip: 'To swap chatbots dynamically, add chatId to the useEffect dependency array so the widget re-initialises when it changes.',
  },
  HTML: {
    intro: 'Use the generated snippet as a standalone HTML file or paste it into any existing page.',
    steps: [
      { heading: 'Copy the snippet', body: 'Click the Copy button above to copy the full HTML output.' },
      { heading: 'Paste or save', body: 'Paste it into an existing HTML page, or save it as a .html file to open directly in a browser.' },
      { heading: 'Set your credentials', body: 'Replace the chatId and apiEndpoint placeholder values with your real credentials.' },
      { heading: 'Open in a browser', body: 'The widget initialises after DOMContentLoaded fires — no compilation or build step needed.' },
    ],
    tip: 'Host the file on any static host (GitHub Pages, Netlify, S3, etc.) for a shareable, zero-server demo.',
  },
  WordPress: {
    intro: 'Integrate ChatDock into WordPress using the generated PHP and the [chatdock] shortcode.',
    steps: [
      { heading: 'Open functions.php', body: 'In your WP dashboard go to Appearance → Theme File Editor → functions.php. Recommended: create a plugin at wp-content/plugins/chatdock/chatdock.php instead so theme updates don\'t overwrite your code.' },
      { heading: 'Paste the generated PHP', body: 'Copy the code above and paste it at the bottom of functions.php (or inside your plugin file).' },
      { heading: 'Set your credentials', body: "Replace 'your-chat-id' and the apiEndpoint placeholder with your actual chatbot ID and endpoint URL." },
      { heading: 'Save the file', body: 'Click Update File. WordPress will now enqueue the ChatDock script on every page and register the shortcode.' },
      { heading: 'Add the shortcode', body: 'Edit any page or post and type [chatdock] where you want the widget to appear. Use [chatdock id="support"] to place multiple widgets on the same page.' },
      { heading: 'Preview the page', body: 'Visit the page — the chat widget appears inline at the shortcode location.' },
    ],
    tip: 'A site-specific plugin is safer than editing functions.php — theme updates won\'t remove your code.',
  },
  iBlueprint: {
    intro: 'Connect directly to your iBlueprint deployment or use ChatDock as a fully compatible drop-in replacement.',
    steps: [
      { heading: 'Connect your account', body: 'Open the iBlueprint Connect panel in the left sidebar, sign in, and select a chatbot to browse its deployments.' },
      { heading: 'Load a deployment', body: 'Click the ↓ button next to a deployment. The studio auto-fills chatId, apiEndpoint, theme, and all other settings.' },
      { heading: 'Tweak settings', body: 'Adjust colours, dimensions, starter prompts, or any other option in the Config panel. Changes appear live in the preview.' },
      { heading: 'Save back to iBlueprint', body: 'Click the ↑ Save button in the iBlueprint Connect panel to push your changes back to the deployment.' },
      { heading: 'Copy the embed code', body: 'Click Copy above to copy the iBlueprint embed snippet.' },
      { heading: 'Paste into your page', body: 'Paste into any HTML page, CMS page builder, or existing iBlueprint embed location.' },
      { heading: 'Swap script (optional)', body: 'To use ChatDock instead of the native iBlueprint client, change <script src> to unpkg.com/chatdock/chatdock.js. IBlueprintChat and ChatDock accept identical options — nothing else changes.' },
    ],
    tip: 'Settings saved via the studio are immediately reflected in every embed that loads this deployment config dynamically.',
  },
};

// ─── Help modal ──────────────────────────────────────────────────────────────
function HelpModal({ tab, onClose }) {
  const info = TAB_STEPS[tab];

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!info) return null;

  return (
    <div className="help-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <span className="help-modal-title">How to implement: {tab}</span>
          <button className="help-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {info.intro && <p className="help-modal-intro">{info.intro}</p>}
        <ol className="help-modal-steps">
          {info.steps.map((step, i) => (
            <li key={i} className="help-modal-step">
              <span className="help-step-heading">{step.heading}</span>
              <span className="help-step-body">{step.body}</span>
            </li>
          ))}
        </ol>
        {info.tip && (
          <div className="help-modal-tip">
            <span aria-hidden="true">💡</span> {info.tip}
          </div>
        )}
      </div>
    </div>
  );
}

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

// ─── WordPress generator ─────────────────────────────────────────────────────

function phpVal(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return '[ ' + v.map(phpVal).join(', ') + ' ]';
  }
  if (typeof v === 'object') {
    const pairs = Object.entries(v).map(([k, val]) => `'${k}' => ${phpVal(val)}`);
    return '[\n            ' + pairs.join(',\n            ') + ',\n        ]';
  }
  return 'null';
}

function generateWordPress(config) {
  const { className, scriptSrc } = buildConfigObj(config);

  const defaults = {
    title: 'Chat', inline: true, useStreaming: false,
    legalMessage: 'AI chatbots can make mistakes. Please verify important information.',
    enableFileUpload: false, enableExportTools: false, requirePrivacyAgreement: false,
    theme: {
      primaryColor: '#1f6feb', textColor: '#ffffff', chatBackground: '#f9f9f9',
      buttonHoverColor: '#1a5bcc', userMessageBg: '#1f6feb', userMessageFontColor: '#ffffff',
      botMessageBg: '#e9e9e9', botMessageFontColor: '#333333',
      bannerColor: '#1f6feb', bannerFontColor: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif', logoUrl: '',
    },
    dimensions: { width: '350px', height: '500px' },
    exportOptions: { includeTitle: true, includeTimestamp: true },
  };

  const phpLines = [];
  const p = (k, v) => phpLines.push(`        '${k}' => ${phpVal(v)},`);

  p('chatId',      config.chatId      || 'your-chat-id');
  p('apiEndpoint', config.apiEndpoint || 'https://your-api.com/api/chat/your-chat-id');
  if (config.deploymentId)                       p('deploymentId', config.deploymentId);
  if (config.title !== defaults.title)           p('title', config.title);
  if (!config.inline)                            p('inline', false);
  if (config.useStreaming)                       p('useStreaming', true);
  if (config.initialMessage)                     p('initialMessage', config.initialMessage);
  if (config.legalMessage !== defaults.legalMessage) p('legalMessage', config.legalMessage);
  if (config.starterPrompts?.length)             p('starterPrompts', config.starterPrompts);
  if (config.enableFileUpload)                   p('enableFileUpload', true);
  if (config.enableExportTools)                  p('enableExportTools', true);
  if (config.requirePrivacyAgreement) {
    p('requirePrivacyAgreement', true);
    if (config.privacyPolicyUrl) p('privacyPolicyUrl', config.privacyPolicyUrl);
  }
  if (config.authToken) p('authToken', config.authToken);

  const dimDiff = config.dimensions.width !== defaults.dimensions.width ||
                  config.dimensions.height !== defaults.dimensions.height;
  if (dimDiff) p('dimensions', config.dimensions);

  const themeDiffs = {};
  for (const [k, v] of Object.entries(config.theme)) {
    if (k === 'logoUrl' && !v) continue;
    if (defaults.theme[k] !== v) themeDiffs[k] = v;
  }
  if (config.theme.logoUrl) themeDiffs.logoUrl = config.theme.logoUrl;
  if (Object.keys(themeDiffs).length) p('theme', themeDiffs);

  return `<?php
/**
 * ChatDock Widget — WordPress Integration
 *
 * Step 1: Add this code to your theme's functions.php
 *         (or in a site-specific plugin such as wp-content/plugins/chatdock/chatdock.php)
 * Step 2: Add [chatdock] shortcode to any page, post, or text widget.
 */

// ── 1. Enqueue ChatDock script ──────────────────────────────────────────────
function chatdock_enqueue_scripts() {
    wp_enqueue_script(
        'chatdock',
        '${scriptSrc}',
        [],
        '1.0.0',
        true // load in footer
    );
}
add_action( 'wp_enqueue_scripts', 'chatdock_enqueue_scripts' );

// ── 2. Register [chatdock] shortcode ────────────────────────────────────────
// Supports multiple instances per page.
// Optional attribute: [chatdock id="my-widget"]
function chatdock_shortcode( $atts ) {
    static $n = 0;
    $n++;
    $atts = shortcode_atts(
        [ 'id' => 'chatdock-' . $n ],
        $atts,
        'chatdock'
    );
    $safe_id = esc_attr( $atts['id'] );
    $js_id   = esc_js( $atts['id'] );

    $config = wp_json_encode( [
${phpLines.join('\n')}
    ] );

    return '<div id="' . $safe_id . '"></div>'
         . '<script>(function(){'
         . 'var el=document.getElementById("' . $js_id . '");'
         . 'if(!window.${className}||!el)return;'
         . 'new ${className}(Object.assign(' . $config . ',{container:el}));'
         . '})();<\\/script>';
}
add_shortcode( 'chatdock', 'chatdock_shortcode' );

/* ── Usage ──────────────────────────────────────────────────────────────────
   Basic:           [chatdock]
   Custom ID:       [chatdock id="support-chat"]
   Multiple widgets on the same page:
                    [chatdock id="sales"]
                    [chatdock id="support"]
   ─────────────────────────────────────────────────────────────────────────── */`;
}

const GENERATORS = {
  'Vanilla JS': generateVanillaJS,
  React: generateReact,
  HTML: generateHTML,
  WordPress: generateWordPress,
  iBlueprint: generateIBlueprint,
};

export default function CodeOutput({ config }) {
  const [activeTab, setActiveTab] = useState('Vanilla JS');
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const code = GENERATORS[activeTab](config);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  // Close help when tab changes
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setShowHelp(false);
  }, []);

  return (
    <div className="code-output">
      {showHelp && <HelpModal tab={activeTab} onClose={() => setShowHelp(false)} />}
      <div className="code-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`code-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab === 'iBlueprint' ? (
              <><span className="ib-dot" />iBlueprint</>
            ) : tab}
          </button>
        ))}
        <div className="code-tabs-spacer" />
        <button
          className={`help-btn${showHelp ? ' active' : ''}`}
          onClick={() => setShowHelp((v) => !v)}
          title={`How to implement: ${activeTab}`}
          aria-label="Implementation guide"
        >
          ? How to use
        </button>
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

      {activeTab === 'WordPress' && (
        <div className="code-note">
          <strong>WordPress:</strong> Paste into <code>functions.php</code> or a site-specific plugin, then add{' '}
          <code>[chatdock]</code> to any page, post, or widget. Use{' '}
          <code>wp_enqueue_script</code> to avoid duplicate script loads.
        </div>
      )}
    </div>
  );
}
