// chatdock.js — Lightweight embeddable chat widget by ChatDock.
// Fully compatible with iBlueprint API endpoints.
// window.IBlueprintChat is aliased to ChatDock for drop-in replacement.
(function () {
  class ChatDock {
    constructor({
      chatId,
      apiEndpoint = null,
      metadata = null,
      sessionId = null,
      authToken = null,
      inline = true,
      container = document.body,
      baseUrl = null,
      title = 'Chat',
      useStreaming = false,
      legalMessage = 'AI chatbots can make mistakes. Please verify important information.',
      initialMessage = null,
      privacyPolicyUrl = null,
      requirePrivacyAgreement = false,
      enableFileUpload = false,
      enableExportTools = false,
      exportOptions = {
        includeTitle: true,
        includeTimestamp: true,
      },
      deploymentId = null,
      starterPrompts = null,
      acceptedFileTypes = '.pdf,.txt,.doc,.docx,.csv,.json',
      maxFileSize = 10485760,
      multimodalRendererUrl = null,
      dimensions = {
        width: '350px',
        height: '500px',
      },
      theme = {
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
    }) {
      if (!chatId) throw new Error('chatId is required');

      this.chatId = chatId;
      this.deploymentId = deploymentId;
      this.starterPrompts = this._normalizeStarterPrompts(starterPrompts);
      this.metadata = metadata;
      this.sessionId = sessionId;
      this.authToken = authToken;
      this.inline = inline;
      this.container = container;
      this.title = title;
      this.useStreaming = useStreaming;
      this.legalMessage = legalMessage;
      this.initialMessage = initialMessage;
      this.privacyPolicyUrl = privacyPolicyUrl;
      this.requirePrivacyAgreement = requirePrivacyAgreement;
      this.enableFileUpload = enableFileUpload;
      this.enableExportTools = enableExportTools;
      this.exportOptions = Object.assign({ includeTitle: true, includeTimestamp: true }, exportOptions);
      this.acceptedFileTypes = acceptedFileTypes;
      this.maxFileSize = maxFileSize;
      this.multimodalRendererUrl = multimodalRendererUrl;
      this.dimensions = dimensions;
      this.uploadedFiles = [];

      console.log('[ChatDock] Initializing chat widget');
      console.log('[ChatDock] Chat ID:', chatId);
      console.log('[ChatDock] Deployment ID:', deploymentId || 'not set');
      console.log('[ChatDock] Session ID:', sessionId || 'not provided (will auto-generate)');
      console.log('[ChatDock] Display mode:', inline ? 'inline' : 'floating');
      console.log('[ChatDock] Streaming:', useStreaming);
      console.log('[ChatDock] File Upload:', enableFileUpload ? 'enabled' : 'disabled');
      console.log('[ChatDock] Privacy Agreement:', requirePrivacyAgreement ? 'required' : 'not required');
      console.log('[ChatDock] Timestamp:', new Date().toISOString());

      if (apiEndpoint) {
        this.apiEndpoint = apiEndpoint.replace(/\/$/, '');
      } else if (baseUrl) {
        this.apiEndpoint = `${baseUrl.replace(/\/$/, '')}/api/chat/${chatId}`;
      } else {
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin !== 'null')
          ? window.location.origin
          : 'http://localhost:3001';
        this.apiEndpoint = `${origin}/api/chat/${chatId}`;
      }

      if (sessionId) {
        this.conversationId = sessionId;
        this._setCookie('conversation_id', sessionId);
        console.log('[ChatDock] Using explicit session ID as conversation ID:', sessionId);
      } else {
        this.conversationId = this._getCookie('conversation_id');
        console.log('[ChatDock] Resuming conversation from cookie:', this.conversationId || 'none');
      }

      this.privacyAgreed = this._getCookie(`chatdock_privacy_agreed_${chatId}`) === 'true';
      this.open = inline;
      this.messages = [];
      this.theme = theme;
      this.multimodalRenderer = null;
      this.multimodalRendererReady = null;
      this._starterPromptsUsed = false;

      this._ensureMarkdownLibs();
      this._loadMultimodalRenderer();
      this._createStyles();
      this._buildUI();

      if (this.requirePrivacyAgreement && !this.privacyAgreed) {
        this._showPrivacyPopup();
      }

      this._displayInitialContent();

      if (!inline) {
        this._createToggleButton();
      }
    }

    // ─── Cookie helpers ──────────────────────────────────────────────────────
    _getCookie(name) {
      try {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
      } catch { return null; }
    }

    _setCookie(name, value, days = 7) {
      try {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}`;
      } catch { /* sandboxed env */ }
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    clearConversation() {
      try {
        const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
        const domain = window.location.hostname;
        document.cookie = `conversation_id=; path=/; domain=${domain}; expires=${expires}`;
        document.cookie = `conversation_id=; path=/; expires=${expires}`;
      } catch { /* ignore */ }
      this.conversationId = null;
      this.messages = [];
      if (this.messageList) this.messageList.innerHTML = '';
      this._displayInitialContent();
    }

    destroy() {
      console.log('[ChatDock] Destroying chat widget instance');
      try {
        const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
        const domain = window.location.hostname;
        document.cookie = `conversation_id=; path=/; domain=${domain}; expires=${expires}`;
        document.cookie = `conversation_id=; path=/; expires=${expires}`;
      } catch { /* ignore */ }
      [this.styleSheet, this.privacyOverlay, this.chatPanel, this.toggleBtn].forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      this.messages = [];
      this.conversationId = null;
      this.sessionId = null;
      this.uploadedFiles = [];
      console.log('[ChatDock] Widget destroyed and cleaned up');
    }

    // ─── Styles ──────────────────────────────────────────────────────────────
    _createStyles() {
      this.styleSheet = document.createElement('style');
      this.styleSheet.type = 'text/css';

      const t = this.theme;
      const css = `
        .chatdock-toggle {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          width: 56px !important;
          height: 56px !important;
          border-radius: 28px !important;
          background: ${t.primaryColor} !important;
          color: ${t.textColor} !important;
          border: none !important;
          cursor: pointer !important;
          z-index: 10000 !important;
          box-shadow: 0 2px 10px rgba(0,0,0,.2) !important;
          font-size: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: transform .3s ease, background .3s ease !important;
        }
        .chatdock-toggle:hover {
          background: ${t.buttonHoverColor} !important;
          transform: scale(1.05) !important;
        }
        .chatdock-panel {
          display: flex !important;
          flex-direction: column !important;
          background: #fff !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 12px rgba(0,0,0,.15) !important;
          transition: all .3s ease !important;
          font-family: ${t.fontFamily || 'system-ui,-apple-system,sans-serif'} !important;
          box-sizing: border-box !important;
        }
        .chatdock-panel.chatdock-hidden { display: none !important; }
        .chatdock-panel * { box-sizing: border-box !important; }
        .chatdock-panel.inline {
          position: relative !important;
          width: ${this.dimensions.width || '100%'} !important;
          height: ${this.dimensions.height || '100%'} !important;
          border: 1px solid #ddd !important;
        }
        .chatdock-panel.floating {
          position: fixed !important;
          bottom: 90px !important;
          right: 20px !important;
          width: ${this.dimensions.width || '350px'} !important;
          height: ${this.dimensions.height || '450px'} !important;
          z-index: 9999 !important;
        }
        .chatdock-header {
          padding: 12px 16px !important;
          background: ${t.bannerColor || t.primaryColor} !important;
          color: ${t.bannerFontColor || t.textColor} !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          font-weight: bold !important;
        }
        .chatdock-header .chatdock-logo {
          height: 32px !important;
          width: auto !important;
          margin-right: 10px !important;
          object-fit: contain !important;
        }
        .chatdock-header .chatdock-title-wrapper {
          display: flex !important;
          align-items: center !important;
          flex: 1 !important;
        }
        .chatdock-header button {
          background: transparent !important;
          border: none !important;
          color: ${t.bannerFontColor || t.textColor} !important;
          cursor: pointer !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
        }
        .chatdock-header button:hover { background: rgba(255,255,255,.2) !important; }
        .chatdock-messages {
          flex: 1 !important;
          padding: 16px !important;
          overflow-y: auto !important;
          background: ${t.chatBackground} !important;
        }
        .chatdock-message {
          margin: 8px 0 !important;
          max-width: 80% !important;
          padding: 8px 12px !important;
          border-radius: 12px !important;
          word-break: break-word !important;
          line-height: 1.4 !important;
        }
        .chatdock-message.user {
          background: ${t.userMessageBg || t.primaryColor} !important;
          color: ${t.userMessageFontColor || t.textColor} !important;
          margin-left: auto !important;
          border-bottom-right-radius: 4px !important;
        }
        .chatdock-message.assistant {
          background: ${t.botMessageBg || '#e9e9e9'} !important;
          color: ${t.botMessageFontColor || '#333'} !important;
          margin-right: auto !important;
          border-bottom-left-radius: 4px !important;
        }
        .chatdock-message.assistant p { margin: .4rem 0 !important; }
        .chatdock-message.assistant ul,
        .chatdock-message.assistant ol { margin: .5rem 1rem !important; }
        .chatdock-message.assistant li { margin: .2rem 0 !important; }
        .chatdock-message.assistant code {
          background: #f3f3f3 !important;
          padding: .1rem .3rem !important;
          border-radius: 4px !important;
        }
        .chatdock-message.assistant pre {
          background: #111827 !important;
          color: #e5e7eb !important;
          padding: .75rem !important;
          border-radius: 6px !important;
          overflow: auto !important;
        }
        .chatdock-message.assistant pre code {
          background: transparent !important;
          padding: 0 !important;
        }
        .chatdock-footer {
          padding: 12px !important;
          display: flex !important;
          gap: 8px !important;
          background: #fff !important;
          border-top: 1px solid #eee !important;
        }
        .chatdock-input {
          flex: 1 !important;
          padding: 10px !important;
          border-radius: 20px !important;
          border: 1px solid #ddd !important;
          outline: none !important;
          background: #fff !important;
          color: #333 !important;
          font-family: inherit !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          margin: 0 !important;
          min-width: 0 !important;
        }
        .chatdock-input:focus { border-color: ${t.primaryColor} !important; }
        .chatdock-send-btn {
          padding: 8px 16px !important;
          background: ${t.primaryColor} !important;
          color: ${t.textColor} !important;
          border: none !important;
          border-radius: 20px !important;
          cursor: pointer !important;
          font-weight: 500 !important;
          font-family: inherit !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          margin: 0 !important;
        }
        .chatdock-send-btn:hover { background: ${t.buttonHoverColor} !important; }
        .chatdock-send-btn:disabled { opacity: .6 !important; cursor: not-allowed !important; }
        .chatdock-legal {
          padding: 8px 12px !important;
          background: #f9f9f9 !important;
          border-top: 1px solid #eee !important;
          font-size: 11px !important;
          color: #666 !important;
          text-align: center !important;
          line-height: 1.4 !important;
        }
        .chatdock-loading {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 8px 12px !important;
          background: #e9e9e9 !important;
          border-radius: 12px !important;
          margin: 8px 0 !important;
          max-width: 80% !important;
          color: #666 !important;
          font-size: 14px !important;
        }
        .chatdock-loading-dots { display: inline-flex !important; gap: 3px !important; }
        .chatdock-loading-dot {
          width: 6px !important;
          height: 6px !important;
          background: #999 !important;
          border-radius: 50% !important;
          animation: chatdock-bounce 1.4s infinite ease-in-out both !important;
        }
        .chatdock-loading-dot:nth-child(1) { animation-delay: -.32s !important; }
        .chatdock-loading-dot:nth-child(2) { animation-delay: -.16s !important; }
        @keyframes chatdock-bounce {
          0%, 80%, 100% { transform: scale(.8); opacity: .5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Privacy Popup */
        .chatdock-privacy-overlay {
          display: none !important;
          position: fixed !important;
          inset: 0 !important;
          background: rgba(0,0,0,.5) !important;
          z-index: 999999 !important;
          justify-content: center !important;
          align-items: center !important;
        }
        .chatdock-privacy-overlay.show { display: flex !important; }
        .chatdock-privacy-popup {
          background: #fff !important;
          max-width: 500px !important;
          width: 90% !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,.3) !important;
          overflow: hidden !important;
          animation: chatdock-popup-in .3s ease-out !important;
        }
        @keyframes chatdock-popup-in {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .chatdock-privacy-header {
          background: ${t.bannerColor || t.primaryColor} !important;
          color: ${t.bannerFontColor || t.textColor} !important;
          padding: 16px 20px !important;
          font-size: 18px !important;
          font-weight: 600 !important;
        }
        .chatdock-privacy-body {
          padding: 20px !important;
          max-height: 400px !important;
          overflow-y: auto !important;
          color: #333 !important;
          line-height: 1.6 !important;
        }
        .chatdock-privacy-body p { margin: 0 0 12px !important; }
        .chatdock-privacy-body a { color: ${t.primaryColor} !important; text-decoration: underline !important; }
        .chatdock-privacy-actions {
          padding: 16px 20px !important;
          background: #f5f5f5 !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 10px !important;
        }
        .chatdock-privacy-btn {
          padding: 10px 20px !important;
          border: none !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: background .2s !important;
        }
        .chatdock-privacy-btn.accept { background: ${t.primaryColor} !important; color: #fff !important; }
        .chatdock-privacy-btn.accept:hover { background: ${t.buttonHoverColor} !important; }
        .chatdock-privacy-btn.decline { background: #6c757d !important; color: #fff !important; }
        .chatdock-privacy-btn.decline:hover { background: #5a6268 !important; }

        /* File Upload */
        .chatdock-file-input { display: none !important; }
        .chatdock-upload-btn {
          padding: 8px 12px !important;
          background: transparent !important;
          color: ${t.primaryColor} !important;
          border: 1px solid ${t.primaryColor} !important;
          border-radius: 20px !important;
          cursor: pointer !important;
          font-size: 14px !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: all .2s !important;
        }
        .chatdock-upload-btn:hover,
        .chatdock-upload-btn.has-files {
          background: ${t.primaryColor} !important;
          color: #fff !important;
        }
        .chatdock-file-preview {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 6px !important;
          padding: 8px 12px !important;
          background: #f9f9f9 !important;
          border-top: 1px solid #eee !important;
          max-height: 80px !important;
          overflow-y: auto !important;
        }
        .chatdock-file-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 8px !important;
          background: #fff !important;
          border: 1px solid #ddd !important;
          border-radius: 12px !important;
          font-size: 12px !important;
          color: #333 !important;
        }
        .chatdock-file-remove { cursor: pointer !important; color: #999 !important; font-weight: bold !important; }
        .chatdock-file-remove:hover { color: #e74c3c !important; }

        /* Thinking pills */
        .chatdock-thinking-pill {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          margin: 4px 0 !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: #fff !important;
          border-radius: 16px !important;
          cursor: pointer !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          transition: all .2s ease !important;
          user-select: none !important;
        }
        .chatdock-thinking-pill:hover { transform: translateY(-1px) !important; box-shadow: 0 2px 8px rgba(102,126,234,.3) !important; }
        .chatdock-thinking-pill.expanded::after { content: ' ▾' !important; font-size: 12px !important; }
        .chatdock-thinking-pill.collapsed::after { content: ' ▸' !important; font-size: 12px !important; }
        .chatdock-thinking-content {
          margin: 8px 0 !important;
          padding: 12px !important;
          background: #f8f4ff !important;
          border-left: 3px solid #667eea !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          color: #555 !important;
          font-style: italic !important;
          white-space: pre-wrap !important;
          overflow: hidden !important;
          transition: max-height .3s ease, opacity .3s ease !important;
        }
        .chatdock-thinking-content.collapsed { max-height: 0 !important; opacity: 0 !important; padding: 0 12px !important; margin: 0 !important; }
        .chatdock-thinking-content.expanded { max-height: 500px !important; opacity: 1 !important; }

        /* Export buttons */
        .chatdock-export-btn {
          background: transparent !important;
          border: none !important;
          color: ${t.bannerFontColor || t.textColor} !important;
          cursor: pointer !important;
          padding: 4px 6px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          line-height: 1 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          opacity: .85 !important;
          transition: opacity .15s, background .15s !important;
        }
        .chatdock-export-btn:hover { opacity: 1 !important; background: rgba(255,255,255,.15) !important; }
        .chatdock-export-btn svg { width: 15px !important; height: 15px !important; flex-shrink: 0 !important; }

        /* Starter prompts */
        .chatdock-starter-prompts {
          padding: 8px 16px 12px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          background: ${t.chatBackground || '#f9f9f9'} !important;
          border-bottom: 1px solid #eee !important;
        }
        .chatdock-starter-prompts.chatdock-hidden { display: none !important; }
        .chatdock-prompt-pill {
          padding: 6px 14px !important;
          border-radius: 20px !important;
          border: 1.5px solid ${t.primaryColor} !important;
          background: transparent !important;
          color: ${t.primaryColor} !important;
          cursor: pointer !important;
          font-size: 13px !important;
          font-family: inherit !important;
          font-weight: 500 !important;
          line-height: 1.4 !important;
          transition: all .2s !important;
          white-space: nowrap !important;
        }
        .chatdock-prompt-pill:hover {
          background: ${t.primaryColor} !important;
          color: ${t.textColor || '#fff'} !important;
        }
      `;

      this.styleSheet.textContent = css;
      document.head.appendChild(this.styleSheet);
    }

    // ─── Markdown / rendering ────────────────────────────────────────────────
    _ensureMarkdownLibs() {
      const add = (src) => {
        const s = document.createElement('script');
        s.async = true;
        s.src = src;
        document.head.appendChild(s);
      };
      if (typeof window.DOMPurify === 'undefined')
        add('https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js');
      if (typeof window.marked === 'undefined')
        add('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js');
    }

    _escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    _processThinkingTags(text) {
      let counter = 0;
      return text.replace(/<think>([\s\S]*?)<\/think>/gi, (_, content) => {
        counter++;
        const id = `chatdock-think-${Date.now()}-${counter}`;
        return `<div class="chatdock-thinking-wrapper">
          <div class="chatdock-thinking-pill collapsed" onclick="window.chatdockToggleThinking('${id}')">Thinking</div>
          <div class="chatdock-thinking-content collapsed" id="${id}">${this._escapeHtml(content.trim())}</div>
        </div>`;
      });
    }

    _renderMarkdown(md) {
      try {
        const processed = this._processThinkingTags(md);
        if (typeof window.marked !== 'undefined') {
          const html = window.marked.parse(processed, { breaks: true });
          if (typeof window.DOMPurify !== 'undefined') {
            return window.DOMPurify.sanitize(html, {
              USE_PROFILES: { html: true },
              ADD_ATTR: ['onclick'],
            });
          }
          return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
        }
      } catch (err) {
        console.warn('[ChatDock] Markdown render failed, falling back.', err);
      }
      return this._escapeHtml(md).replace(/\n/g, '<br/>');
    }

    async _loadMultimodalRenderer() {
      if (this.multimodalRenderer) return this.multimodalRenderer;
      if (!this.multimodalRendererReady) {
        const url = this.multimodalRendererUrl || '/chatdock.multimodal.js';
        this.multimodalRendererReady = import(url)
          .then((mod) => { this.multimodalRenderer = mod; return mod; })
          .catch(() => null);
      }
      return this.multimodalRendererReady;
    }

    _renderContentBlocks(blocks) {
      if (!this.multimodalRenderer || !blocks?.length) return null;
      return this.multimodalRenderer.renderContentBlocksHtml(blocks, {
        renderMarkdown: (t) => this._renderMarkdown(t),
      });
    }

    _attachFormHandlers(container) {
      if (!this.multimodalRenderer) return;
      return this.multimodalRenderer.attachFormHandlers(container, {
        onSubmitSummary: (formId, summary) => {
          if (summary) this.sendMessage(`[Form Response: ${formId}]\n${summary}`);
        },
      });
    }

    // ─── Toggle button (floating mode) ───────────────────────────────────────
    _createToggleButton() {
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.className = 'chatdock-toggle';
      this.toggleBtn.innerHTML = this._iconChat();
      this.toggleBtn.setAttribute('aria-label', 'Open chat');
      this.toggleBtn.addEventListener('click', () => this.toggle());
      document.body.appendChild(this.toggleBtn);
      if (this.chatPanel) this.chatPanel.classList.toggle('chatdock-hidden', !this.open);
    }

    toggle() {
      this.open = !this.open;
      if (this.chatPanel) {
        this.chatPanel.classList.toggle('chatdock-hidden', !this.open);
        if (this.open) {
          this.chatPanel.style.opacity = '0';
          this.chatPanel.style.transform = 'translateY(20px)';
          setTimeout(() => {
            this.chatPanel.style.opacity = '1';
            this.chatPanel.style.transform = 'translateY(0)';
          }, 10);
        }
        if (this.toggleBtn) {
          this.toggleBtn.innerHTML = this.open ? this._iconClose() : this._iconChat();
          this.toggleBtn.setAttribute('aria-label', this.open ? 'Close chat' : 'Open chat');
        }
      }
    }

    // ─── Build UI ─────────────────────────────────────────────────────────────
    _buildUI() {
      this.chatPanel = document.createElement('div');
      this.chatPanel.className = `chatdock-panel ${this.inline ? 'inline' : 'floating'}`;
      if (!this.inline && !this.open) this.chatPanel.classList.add('chatdock-hidden');

      // Header
      const header = document.createElement('div');
      header.className = 'chatdock-header';

      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'chatdock-title-wrapper';
      if (this.theme.logoUrl) {
        const logo = document.createElement('img');
        logo.className = 'chatdock-logo';
        logo.src = this.theme.logoUrl;
        logo.alt = 'Logo';
        logo.onerror = () => { logo.style.display = 'none'; };
        titleWrapper.appendChild(logo);
      }
      const titleSpan = document.createElement('span');
      titleSpan.textContent = this.title;
      titleWrapper.appendChild(titleSpan);
      header.appendChild(titleWrapper);

      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear Chat';
      clearBtn.addEventListener('click', () => this.clearConversation());
      header.appendChild(clearBtn);

      if (this.enableExportTools) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'chatdock-export-btn';
        copyBtn.title = 'Copy conversation';
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyBtn.addEventListener('click', () => this._copyConversation(copyBtn));
        header.appendChild(copyBtn);

        const printBtn = document.createElement('button');
        printBtn.className = 'chatdock-export-btn';
        printBtn.title = 'Print / Save as PDF';
        printBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>';
        printBtn.addEventListener('click', () => this._printConversation());
        header.appendChild(printBtn);
      }

      if (!this.inline) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.toggle());
        header.appendChild(closeBtn);
      }

      this.chatPanel.appendChild(header);

      // Message list
      this.messageList = document.createElement('div');
      this.messageList.className = 'chatdock-messages';
      this.chatPanel.appendChild(this.messageList);

      // Starter prompt buttons container
      this.promptButtonsContainer = document.createElement('div');
      this.promptButtonsContainer.className = 'chatdock-starter-prompts chatdock-hidden';
      this.chatPanel.appendChild(this.promptButtonsContainer);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'chatdock-footer';

      if (this.enableFileUpload) {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.className = 'chatdock-file-input';
        this.fileInput.multiple = true;
        this.fileInput.accept = this.acceptedFileTypes;
        this.fileInput.addEventListener('change', (e) => this._handleFileUpload(e));
        footer.appendChild(this.fileInput);

        this.uploadBtn = document.createElement('button');
        this.uploadBtn.className = 'chatdock-upload-btn';
        this.uploadBtn.innerHTML = '📎';
        this.uploadBtn.title = 'Attach files';
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        footer.appendChild(this.uploadBtn);
      }

      this.inputField = document.createElement('input');
      this.inputField.type = 'text';
      this.inputField.className = 'chatdock-input';
      this.inputField.placeholder = 'Type a message...';
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this._submitInput();
      });

      this.sendBtn = document.createElement('button');
      this.sendBtn.className = 'chatdock-send-btn';
      this.sendBtn.textContent = 'Send';
      this.sendBtn.addEventListener('click', () => this._submitInput());

      footer.appendChild(this.inputField);
      footer.appendChild(this.sendBtn);
      this.chatPanel.appendChild(footer);

      if (this.enableFileUpload) {
        this.filePreview = document.createElement('div');
        this.filePreview.className = 'chatdock-file-preview';
        this.filePreview.style.display = 'none';
        this.chatPanel.appendChild(this.filePreview);
      }

      if (this.legalMessage) {
        const legal = document.createElement('div');
        legal.className = 'chatdock-legal';
        legal.textContent = this.legalMessage;
        this.chatPanel.appendChild(legal);
      }

      this.container.appendChild(this.chatPanel);

      if (this.requirePrivacyAgreement) {
        this._buildPrivacyPopup();
        if (!this.privacyAgreed) {
          this.inputField.disabled = true;
          this.sendBtn.disabled = true;
          this.inputField.placeholder = 'Please accept the privacy policy to continue...';
        }
      }
    }

    _submitInput() {
      const text = this.inputField.value.trim();
      if (!text) return;
      this._hidePromptButtons();
      this.inputField.value = '';
      this.addMessage('user', text);
      this.sendMessage(text);
    }

    // ─── Privacy popup ────────────────────────────────────────────────────────
    _buildPrivacyPopup() {
      this.privacyOverlay = document.createElement('div');
      this.privacyOverlay.className = 'chatdock-privacy-overlay';

      const popup = document.createElement('div');
      popup.className = 'chatdock-privacy-popup';

      const hdr = document.createElement('div');
      hdr.className = 'chatdock-privacy-header';
      hdr.textContent = 'Privacy Notice';

      const body = document.createElement('div');
      body.className = 'chatdock-privacy-body';
      body.innerHTML = `
        <p><strong>Important: Protect Your Data</strong></p>
        <p>AI chatbots can make mistakes and should not be relied upon for critical decisions. Please verify all important information.</p>
        <p><strong>Do not enter sensitive information</strong> such as:</p>
        <ul>
          <li>Personal identification numbers (SSN, passport, etc.)</li>
          <li>Financial account information</li>
          <li>Passwords or security credentials</li>
          <li>Confidential business information</li>
          <li>Medical or health records</li>
        </ul>
        ${this.privacyPolicyUrl ? `<p>For more information, please read our <a href="${this._escapeHtml(this.privacyPolicyUrl)}" target="_blank" rel="noopener">Privacy Policy</a>.</p>` : ''}
        <p>By clicking "I Understand", you acknowledge that you have read and understood this notice.</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'chatdock-privacy-actions';

      const declineBtn = document.createElement('button');
      declineBtn.className = 'chatdock-privacy-btn decline';
      declineBtn.textContent = 'Decline';
      declineBtn.addEventListener('click', () => this._declinePrivacy());

      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'chatdock-privacy-btn accept';
      acceptBtn.textContent = 'I Understand';
      acceptBtn.addEventListener('click', () => this._acceptPrivacy());

      actions.appendChild(declineBtn);
      actions.appendChild(acceptBtn);
      popup.appendChild(hdr);
      popup.appendChild(body);
      popup.appendChild(actions);
      this.privacyOverlay.appendChild(popup);
      document.body.appendChild(this.privacyOverlay);
    }

    _showPrivacyPopup() {
      if (this.privacyOverlay) this.privacyOverlay.classList.add('show');
    }

    _acceptPrivacy() {
      this.privacyAgreed = true;
      this._setCookie(`chatdock_privacy_agreed_${this.chatId}`, 'true', 365);
      if (this.privacyOverlay) this.privacyOverlay.classList.remove('show');
      this.inputField.disabled = false;
      this.sendBtn.disabled = false;
      this.inputField.placeholder = 'Type a message...';
      this.inputField.focus();
    }

    _declinePrivacy() {
      if (this.privacyOverlay) this.privacyOverlay.classList.remove('show');
      if (!this.inline) this.toggle();
    }

    // ─── File upload ──────────────────────────────────────────────────────────
    _handleFileUpload(event) {
      const allowedExts = this.acceptedFileTypes.split(',').map((t) => t.trim().toLowerCase());
      for (const file of Array.from(event.target.files)) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExts.includes(ext)) {
          alert(`File type "${ext}" is not allowed. Accepted: ${this.acceptedFileTypes}`);
          continue;
        }
        if (file.size > this.maxFileSize) {
          alert(`File "${file.name}" exceeds max size of ${(this.maxFileSize / 1048576).toFixed(1)}MB`);
          continue;
        }
        this.uploadedFiles.push(file);
      }
      this._updateFilePreview();
      event.target.value = '';
    }

    _updateFilePreview() {
      if (!this.filePreview) return;
      if (this.uploadedFiles.length === 0) {
        this.filePreview.style.display = 'none';
        if (this.uploadBtn) { this.uploadBtn.classList.remove('has-files'); this.uploadBtn.innerHTML = '📎'; }
        return;
      }
      this.filePreview.style.display = 'flex';
      this.filePreview.innerHTML = '';
      if (this.uploadBtn) { this.uploadBtn.classList.add('has-files'); this.uploadBtn.innerHTML = `📎 (${this.uploadedFiles.length})`; }
      this.uploadedFiles.forEach((file, i) => {
        const badge = document.createElement('div');
        badge.className = 'chatdock-file-badge';
        const name = document.createElement('span');
        name.textContent = file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name;
        const rm = document.createElement('span');
        rm.className = 'chatdock-file-remove';
        rm.textContent = '×';
        rm.addEventListener('click', () => { this.uploadedFiles.splice(i, 1); this._updateFilePreview(); });
        badge.appendChild(name);
        badge.appendChild(rm);
        this.filePreview.appendChild(badge);
      });
    }

    async _encodeFiles() {
      return Promise.all(
        this.uploadedFiles.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                content: reader.result.split(',')[1],
              });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );
    }

    // ─── Messages ─────────────────────────────────────────────────────────────
    _scrollToTop(el) {
      const cRect = this.messageList.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      this.messageList.scrollTop += eRect.top - cRect.top - 8;
    }

    _showLoading() {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'chatdock-loading';
      this.loadingIndicator.innerHTML = `<span>Thinking</span><span class="chatdock-loading-dots"><span class="chatdock-loading-dot"></span><span class="chatdock-loading-dot"></span><span class="chatdock-loading-dot"></span></span>`;
      this.messageList.appendChild(this.loadingIndicator);
      this._scrollToTop(this.loadingIndicator);
      if (this.inputField) this.inputField.disabled = true;
      if (this.sendBtn) this.sendBtn.disabled = true;
    }

    _hideLoading() {
      if (this.loadingIndicator?.parentNode) {
        this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
        this.loadingIndicator = null;
      }
      if (this.inputField) this.inputField.disabled = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
    }

    addMessage(role, content, contentBlocks) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chatdock-message ${role}`;

      if (role === 'assistant') {
        const blocksHtml = contentBlocks ? this._renderContentBlocks(contentBlocks) : null;
        if (blocksHtml) {
          msgDiv.innerHTML = blocksHtml;
          this._attachFormHandlers(msgDiv);
        } else if (contentBlocks?.length) {
          msgDiv.innerHTML = this._renderMarkdown(content);
          this._loadMultimodalRenderer().then(() => {
            const h = this._renderContentBlocks(contentBlocks);
            if (!h) return;
            msgDiv.innerHTML = h;
            this._attachFormHandlers(msgDiv);
            this._scrollToTop(msgDiv);
          });
        } else {
          msgDiv.innerHTML = this._renderMarkdown(content);
        }
        setTimeout(() => {
          msgDiv.querySelectorAll('.chatdock-thinking-pill').forEach((pill) => {
            const id = pill.getAttribute('onclick')?.match(/chatdockToggleThinking\('([^']+)'\)/)?.[1];
            if (id) pill.onclick = () => window.chatdockToggleThinking(id);
          });
        }, 0);
      } else {
        msgDiv.textContent = content;
      }

      this.messageList.appendChild(msgDiv);
      if (role === 'user') {
        this.messageList.scrollTop = this.messageList.scrollHeight;
      } else {
        this._scrollToTop(msgDiv);
      }
      this.messages.push({ role, content });
    }

    // ─── Send message ─────────────────────────────────────────────────────────
    async sendMessage(text) {
      this._showLoading();
      console.log('[Chat Request] Message:', text.substring(0, 50));
      console.log('[Chat Request] Timestamp:', new Date().toISOString());

      try {
        const body = { message: text, chatId: this.chatId };

        if (this.enableFileUpload && this.uploadedFiles.length > 0) {
          body.files = await this._encodeFiles();
        }

        if (this.metadata) {
          if (this.metadata.connectionId) body.connectionId = this.metadata.connectionId;
          if (this.metadata.organizationId) body.organizationId = this.metadata.organizationId;
          if (this.metadata.model) body.model = this.metadata.model;
          if (this.metadata.temperature !== undefined) body.temperature = this.metadata.temperature;
          if (this.metadata.maxTokens !== undefined) body.maxTokens = this.metadata.maxTokens;
          body.metadata = this.metadata;
        }
        if (this.sessionId) body.sessionId = this.sessionId;
        if (this.conversationId) body.conversationId = this.conversationId;
        if (this.deploymentId) body.deploymentId = this.deploymentId;

        if (this.useStreaming) {
          await this._sendStreaming(text, body);
        } else {
          await this._sendStandard(text, body);
        }
      } catch (error) {
        console.error('[Chat Request] Failed:', error);
        this.addMessage('assistant', this._friendlyError(error));
      } finally {
        this._hideLoading();
        if (this.enableFileUpload && this.uploadedFiles.length > 0) {
          this.uploadedFiles = [];
          this._updateFilePreview();
        }
      }
    }

    async _sendStandard(text, body) {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          mode: 'cors',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === 'AbortError') throw new Error('Request timed out after 30 seconds');
        throw err;
      } finally {
        clearTimeout(tid);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error (${response.status}): ${errText.substring(0, 100)}`);
      }

      const json = await response.json();
      const reply =
        json.message || json.response || json.choices?.[0]?.message?.content ||
        json.content || 'Received response but could not parse message content.';

      if (json.conversationId) {
        this.conversationId = json.conversationId;
        this._setCookie('conversation_id', json.conversationId);
      } else {
        const cid = this._getCookie('conversation_id');
        if (cid) this.conversationId = cid;
      }

      this.addMessage('assistant', reply, json.contentBlocks);
    }

    async _sendStreaming(text, body) {
      let fullText = '';
      let streamContentBlocks = null;
      let currentEvent = null;
      let streamDiv = null;

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      };
      if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 60000);
      let response;
      try {
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          mode: 'cors',
          headers,
          credentials: 'include',
          body: JSON.stringify({ ...body, stream: true }),
          signal: ctrl.signal,
        });
      } catch (err) {
        clearTimeout(tid);
        if (err.name === 'AbortError') throw new Error('Streaming request timed out');
        throw err;
      }
      clearTimeout(tid);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error (${response.status})`);
      }

      if (!response.body) return await this._sendStandard(text, body);

      streamDiv = document.createElement('div');
      streamDiv.className = 'chatdock-message assistant';
      this.messageList.appendChild(streamDiv);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let renderTimer = null;
      let finalRenderDone = false;
      let loadingHidden = false;
      let scrolledToStart = false;

      const hideLoadingOnce = () => {
        if (!loadingHidden) { loadingHidden = true; this._hideLoading(); }
      };

      const doFinalRender = () => {
        if (finalRenderDone) return;
        finalRenderDone = true;
        hideLoadingOnce();
        if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
        const blocksHtml = streamContentBlocks ? this._renderContentBlocks(streamContentBlocks) : null;
        streamDiv.innerHTML = blocksHtml || this._renderMarkdown(fullText);
        if (blocksHtml) this._attachFormHandlers(streamDiv);
        this._scrollToTop(streamDiv);
      };

      const scheduleRender = () => {
        hideLoadingOnce();
        if (!renderTimer) {
          renderTimer = setTimeout(() => {
            streamDiv.innerHTML = this._renderMarkdown(fullText);
            if (!scrolledToStart) { scrolledToStart = true; this._scrollToTop(streamDiv); }
            renderTimer = null;
          }, 50);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) { doFinalRender(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith(':')) continue;
          if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); continue; }
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { doFinalRender(); continue; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (currentEvent === 'done' || parsed.text !== undefined) {
                if (parsed.contentBlocks) streamContentBlocks = parsed.contentBlocks;
                if (parsed.text) fullText = parsed.text;
                doFinalRender();
                currentEvent = null;
                continue;
              }
              if (parsed.conversationId) {
                this.conversationId = parsed.conversationId;
                this._setCookie('conversation_id', parsed.conversationId);
              }
              if (parsed.contentBlocks) streamContentBlocks = parsed.contentBlocks;
              if (parsed.delta) { fullText += parsed.delta; scheduleRender(); }
              else if (parsed.content) { fullText = parsed.content; scheduleRender(); }
              currentEvent = null;
            } catch {
              currentEvent = null;
            }
          }
        }
      }

      this.messages.push({ role: 'assistant', content: fullText });
    }

    _friendlyError(error) {
      const msg = error?.message || String(error);
      if (/connection not found|connection.*inactive|no.*connection|inactive.*connection/i.test(msg))
        return "This chatbot isn't fully set up yet. Please contact the administrator.";
      if (/unauthorized|403|forbidden|not allowed/i.test(msg))
        return "You don't have permission to use this chatbot.";
      if (/not found|404|invalid.*uuid|uuid.*invalid/i.test(msg))
        return "Chatbot not found. Please check the link and try again.";
      if (/429|rate limit|too many request/i.test(msg))
        return "Too many requests. Please wait a moment and try again.";
      if (/timed? ?out|timeout/i.test(msg))
        return "The request took too long to respond. Please try again.";
      if (/network|failed to fetch|load failed|net::/i.test(msg))
        return "Unable to connect. Please check your internet connection and try again.";
      if (/server error|500|502|503|504/i.test(msg))
        return "Something went wrong on the server. Please try again in a moment.";
      return "Something went wrong. Please try again.";
    }

    // ─── Starter prompts ──────────────────────────────────────────────────────
    _normalizeStarterPrompts(prompts) {
      if (!prompts || !Array.isArray(prompts)) return [];
      return prompts
        .map((p) => {
          if (typeof p === 'string' && p.trim()) return { label: p.trim(), message: p.trim() };
          if (p?.message?.trim()) return { label: (p.label || p.message).trim(), message: p.message.trim() };
          return null;
        })
        .filter(Boolean);
    }

    _renderPromptButtons() {
      if (!this.promptButtonsContainer) return;
      this.promptButtonsContainer.innerHTML = '';
      this.starterPrompts.forEach(({ label, message }) => {
        const btn = document.createElement('button');
        btn.className = 'chatdock-prompt-pill';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          this._hidePromptButtons();
          this.addMessage('user', message);
          this.sendMessage(message);
        });
        this.promptButtonsContainer.appendChild(btn);
      });
      this.promptButtonsContainer.classList.remove('chatdock-hidden');
    }

    _hidePromptButtons() {
      if (this.promptButtonsContainer) this.promptButtonsContainer.classList.add('chatdock-hidden');
      this._starterPromptsUsed = true;
    }

    _displayInitialContent() {
      if (this.initialMessage) this.addMessage('assistant', this.initialMessage);
      if (this.starterPrompts?.length && !this._starterPromptsUsed) this._renderPromptButtons();
    }

    // ─── Export ───────────────────────────────────────────────────────────────
    _decodeHtmlEntities(html) {
      const ta = document.createElement('textarea');
      ta.innerHTML = html;
      return ta.value;
    }

    _copyConversation(btn) {
      if (!this.messages?.length) return;
      const lines = [];
      if (this.exportOptions.includeTitle) { lines.push(this.title, '='.repeat(this.title.length), ''); }
      if (this.exportOptions.includeTimestamp) { lines.push(`Exported: ${new Date().toLocaleString()}`, ''); }
      this.messages.forEach((msg) => {
        lines.push(msg.role === 'user' ? 'You:' : 'Assistant:');
        lines.push(this._decodeHtmlEntities(msg.content.replace(/<[^>]+>/g, '')).trim(), '');
      });
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✓'; setTimeout(() => { btn.innerHTML = orig; }, 1500); }
        }).catch(() => this._fallbackCopy(text, btn));
      } else {
        this._fallbackCopy(text, btn);
      }
    }

    _fallbackCopy(text, btn) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { alert('Copy failed. Please select the chat text manually.'); }
      document.body.removeChild(ta);
    }

    _printConversation() {
      if (!this.messages?.length) return;
      const messagesHtml = this.messages.map((msg) => {
        const isUser = msg.role === 'user';
        const label = isUser ? 'You' : 'Assistant';
        const bg = isUser ? '#e8f0fe' : '#f1f1f1';
        const align = isUser ? 'margin-left:auto;text-align:right;' : 'margin-right:auto;text-align:left;';
        const contentHtml = isUser
          ? `<p style="margin:0;">${this._escapeHtml(msg.content)}</p>`
          : (typeof window.marked !== 'undefined'
              ? window.marked.parse(msg.content.replace(/<think>[\s\S]*?<\/think>/gi, ''), { breaks: true })
              : `<p style="margin:0;">${this._escapeHtml(msg.content)}</p>`);
        return `<div style="margin-bottom:12px;max-width:80%;${align}">
          <div style="font-size:11px;color:#888;margin-bottom:3px;">${label}</div>
          <div style="background:${bg};padding:10px 14px;border-radius:8px;font-size:14px;line-height:1.5;">${contentHtml}</div>
        </div>`;
      }).join('');

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this._escapeHtml(this.title)}</title>
        <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:0 auto;color:#222;}p{margin:0 0 8px;}ul,ol{margin:4px 0 4px 20px;}pre{background:#f4f4f4;padding:8px;border-radius:4px;overflow-x:auto;}code{background:#f4f4f4;padding:1px 4px;border-radius:3px;font-size:.9em;}</style>
        </head><body>${this.exportOptions.includeTitle ? `<h2 style="margin:0 0 4px;font-size:18px;">${this._escapeHtml(this.title)}</h2>` : ''}${this.exportOptions.includeTimestamp ? `<p style="font-size:12px;color:#888;margin:0 0 16px;">Exported: ${new Date().toLocaleString()}</p>` : ''}<div>${messagesHtml}</div></body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }

    // ─── SVG icons ────────────────────────────────────────────────────────────
    _iconChat() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }

    _iconClose() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    }
  }

  // ─── Global thinking toggle ─────────────────────────────────────────────────
  window.chatdockToggleThinking = function (id) {
    const content = document.getElementById(id);
    const pill = content?.previousElementSibling;
    if (content && pill) {
      const collapsed = content.classList.contains('collapsed');
      content.classList.toggle('collapsed', !collapsed);
      content.classList.toggle('expanded', collapsed);
      pill.classList.toggle('collapsed', !collapsed);
      pill.classList.toggle('expanded', collapsed);
    }
  };

  // Expose globally
  window.ChatDock = ChatDock;

  // iBlueprint backward-compatibility shim
  window.IBlueprintChat = ChatDock;
})();
