import { useEffect, useState } from 'react';
import ConfigPanel from './components/ConfigPanel.jsx';
import ChatPreview from './components/ChatPreview.jsx';
import CodeOutput from './components/CodeOutput.jsx';

const SIDEBAR_STORAGE_KEY = 'chatdock-studio-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 300;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 520;
const MAIN_MIN_WIDTH = 480;

const SPLIT_STORAGE_KEY = 'chatdock-studio-split-height';
const SPLIT_DEFAULT_HEIGHT = 340;
const SPLIT_MIN_HEIGHT = 120;
const SPLIT_MAX_HEIGHT = 640;

function clampSplitHeight(height) {
  if (typeof window === 'undefined') return SPLIT_DEFAULT_HEIGHT;
  const max = Math.max(SPLIT_MIN_HEIGHT, Math.min(SPLIT_MAX_HEIGHT, window.innerHeight - 160));
  return Math.min(Math.max(height, SPLIT_MIN_HEIGHT), max);
}

function getInitialSplitHeight() {
  if (typeof window === 'undefined') return SPLIT_DEFAULT_HEIGHT;
  const stored = Number(window.localStorage.getItem(SPLIT_STORAGE_KEY));
  if (!Number.isFinite(stored)) return SPLIT_DEFAULT_HEIGHT;
  return clampSplitHeight(stored);
}

function saveSplitHeight(height) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPLIT_STORAGE_KEY, String(Math.round(height)));
}

function getMaxSidebarWidth() {
  if (typeof window === 'undefined') return SIDEBAR_MAX_WIDTH;
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - MAIN_MIN_WIDTH),
  );
}

function clampSidebarWidth(width) {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), getMaxSidebarWidth());
}

function getInitialSidebarWidth() {
  if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;

  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
  if (!Number.isFinite(storedWidth)) return SIDEBAR_DEFAULT_WIDTH;

  return clampSidebarWidth(storedWidth);
}

function saveSidebarWidth(width) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(Math.round(width)));
}

const DEFAULT_CONFIG = {
  chatId: 'demo-chat-id',
  apiEndpoint: 'https://your-api.com/api/chat/demo-chat-id',
  title: 'ChatDock Widget',
  authToken: '',
  inline: true,
  useStreaming: false,
  enableFileUpload: false,
  enableExportTools: false,
  requirePrivacyAgreement: false,
  privacyPolicyUrl: '',
  initialMessage: 'Hello! How can I help you today? 👋',
  legalMessage: 'AI chatbots can make mistakes. Please verify important information.',
  starterPrompts: ['What can you help me with?', 'Tell me more', 'Get started'],
  _starterPromptsRaw: 'What can you help me with?\nTell me more\nGet started',
  dimensions: { width: '100%', height: '100%' },
  exportOptions: { includeTitle: true, includeTimestamp: true },
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
};

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [splitHeight, setSplitHeight] = useState(getInitialSplitHeight);
  const [isSplitResizing, setIsSplitResizing] = useState(false);

  useEffect(() => {
    const handleWindowResize = () => {
      setSidebarWidth((width) => {
        const nextWidth = clampSidebarWidth(width);
        if (nextWidth !== width) saveSidebarWidth(nextWidth);
        return nextWidth;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const resizeSidebar = (width) => {
    const nextWidth = clampSidebarWidth(width);
    setSidebarWidth(nextWidth);
    saveSidebarWidth(nextWidth);
  };

  const handleResizeStart = (event) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;
    let nextWidth = sidebarWidth;

    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      nextWidth = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveSidebarWidth(nextWidth);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSplitResizeStart = (event) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = splitHeight;
    let nextHeight = splitHeight;

    setIsSplitResizing(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      nextHeight = clampSplitHeight(startHeight - (moveEvent.clientY - startY));
      setSplitHeight(nextHeight);
    };

    const handlePointerUp = () => {
      setIsSplitResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveSplitHeight(nextHeight);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSplitResizeKeyDown = (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = clampSplitHeight(splitHeight + 16);
      setSplitHeight(next); saveSplitHeight(next);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = clampSplitHeight(splitHeight - 16);
      setSplitHeight(next); saveSplitHeight(next);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const next = SPLIT_MIN_HEIGHT;
      setSplitHeight(next); saveSplitHeight(next);
    }
    if (event.key === 'End') {
      event.preventDefault();
      const next = clampSplitHeight(SPLIT_MAX_HEIGHT);
      setSplitHeight(next); saveSplitHeight(next);
    }
  };

  const handleResizeKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      resizeSidebar(sidebarWidth - 16);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      resizeSidebar(sidebarWidth + 16);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      resizeSidebar(SIDEBAR_MIN_WIDTH);
    }

    if (event.key === 'End') {
      event.preventDefault();
      resizeSidebar(getMaxSidebarWidth());
    }
  };

  return (
    <div
      className={`app-layout ${isResizing ? 'resizing' : ''} ${isSplitResizing ? 'split-resizing' : ''}`}
      style={{ '--sidebar-width': `${sidebarWidth}px`, '--split-height': `${splitHeight}px` }}
    >
      {/* Left: Config Panel */}
      <aside className="sidebar">
        <ConfigPanel config={config} onChange={setConfig} />
      </aside>
      <div
        className={`sidebar-resizer ${isResizing ? 'active' : ''}`}
        role="separator"
        aria-label="Resize configuration panel"
        aria-orientation="vertical"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={getMaxSidebarWidth()}
        aria-valuenow={Math.round(sidebarWidth)}
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
      />

      {/* Right: Preview + Code */}
      <main className="main-area">
        <div className="preview-pane">
          <ChatPreview config={config} />
        </div>
        <div
          className={`split-resizer ${isSplitResizing ? 'active' : ''}`}
          role="separator"
          aria-label="Resize code panel"
          aria-orientation="horizontal"
          aria-valuemin={SPLIT_MIN_HEIGHT}
          aria-valuemax={SPLIT_MAX_HEIGHT}
          aria-valuenow={Math.round(splitHeight)}
          tabIndex={0}
          onPointerDown={handleSplitResizeStart}
          onKeyDown={handleSplitResizeKeyDown}
        />
        <div className="code-pane">
          <CodeOutput config={config} />
        </div>
      </main>
    </div>
  );
}
