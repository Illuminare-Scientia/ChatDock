import { useState } from 'react';

const FONT_OPTIONS = [
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, "Courier New", monospace' },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button className="section-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="section-arrow">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <span className="field-hint">{hint}</span>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = '' }) {
  return (
    <input
      className="input"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder = '', rows = 3 }) {
  return (
    <textarea
      className="input textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      className={`toggle ${value ? 'on' : 'off'}`}
      onClick={() => onChange(!value)}
      type="button"
      role="switch"
      aria-checked={value}
    >
      <span className="toggle-knob" />
    </button>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="color-field">
      <label className="color-label">{label}</label>
      <div className="color-input-wrap">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-swatch"
          title={value}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input color-text"
          placeholder="#000000"
          maxLength={9}
        />
      </div>
    </div>
  );
}

export default function ConfigPanel({ config, onChange }) {
  const set = (path, value) => {
    const keys = path.split('.');
    const next = { ...config };
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) {
      cur[keys[i]] = { ...cur[keys[i]] };
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    onChange(next);
  };

  return (
    <div className="config-panel">
      <div className="config-panel-header">
        <img className="studio-logo" src={`${import.meta.env.BASE_URL}chatdock-studio-logo.svg`} alt="ChatDock Studio" />
      </div>

      {/* ── Basic ── */}
      <Section title="Connection">
        <Field label="Chat ID" hint="required">
          <TextInput value={config.chatId} onChange={(v) => set('chatId', v)} placeholder="your-chat-id" />
        </Field>
        <Field label="API Endpoint">
          <TextInput value={config.apiEndpoint} onChange={(v) => set('apiEndpoint', v)} placeholder="https://api.example.com/api/chat/id" />
        </Field>
        <Field label="Auth Token" hint="optional Bearer token">
          <TextInput value={config.authToken || ''} onChange={(v) => set('authToken', v)} placeholder="eyJhbGciOi..." />
        </Field>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance">
        <Field label="Widget Title">
          <TextInput value={config.title} onChange={(v) => set('title', v)} placeholder="Chat" />
        </Field>
        <Field label="Display Mode">
          <div className="radio-group">
            {['inline', 'floating'].map((m) => (
              <button
                key={m}
                className={`radio-btn ${(config.inline ? 'inline' : 'floating') === m ? 'active' : ''}`}
                onClick={() => set('inline', m === 'inline')}
              >
                {m === 'inline' ? '⊞ Inline' : '💬 Floating'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Logo URL" hint="optional">
          <TextInput value={config.theme.logoUrl || ''} onChange={(v) => set('theme.logoUrl', v)} placeholder="https://..." />
        </Field>
        <Field label="Font Family">
          <select
            className="input"
            value={config.theme.fontFamily}
            onChange={(e) => set('theme.fontFamily', e.target.value)}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* ── Dimensions ── */}
      <Section title="Dimensions">
        <Field label="Width">
          <TextInput value={config.dimensions.width} onChange={(v) => set('dimensions.width', v)} placeholder="350px" />
        </Field>
        <Field label="Height">
          <TextInput value={config.dimensions.height} onChange={(v) => set('dimensions.height', v)} placeholder="500px" />
        </Field>
      </Section>

      {/* ── Theme colors ── */}
      <Section title="Theme Colors" defaultOpen={false}>
        <div className="color-grid">
          <ColorField label="Primary" value={config.theme.primaryColor} onChange={(v) => set('theme.primaryColor', v)} />
          <ColorField label="Primary Hover" value={config.theme.buttonHoverColor} onChange={(v) => set('theme.buttonHoverColor', v)} />
          <ColorField label="Banner BG" value={config.theme.bannerColor} onChange={(v) => set('theme.bannerColor', v)} />
          <ColorField label="Banner Text" value={config.theme.bannerFontColor} onChange={(v) => set('theme.bannerFontColor', v)} />
          <ColorField label="Chat BG" value={config.theme.chatBackground} onChange={(v) => set('theme.chatBackground', v)} />
          <ColorField label="User Bubble BG" value={config.theme.userMessageBg} onChange={(v) => set('theme.userMessageBg', v)} />
          <ColorField label="User Bubble Text" value={config.theme.userMessageFontColor} onChange={(v) => set('theme.userMessageFontColor', v)} />
          <ColorField label="Bot Bubble BG" value={config.theme.botMessageBg} onChange={(v) => set('theme.botMessageBg', v)} />
          <ColorField label="Bot Bubble Text" value={config.theme.botMessageFontColor} onChange={(v) => set('theme.botMessageFontColor', v)} />
        </div>
      </Section>

      {/* ── Features ── */}
      <Section title="Features">
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Streaming</div>
            <div className="toggle-desc">Use SSE for real-time responses</div>
          </div>
          <Toggle value={config.useStreaming} onChange={(v) => set('useStreaming', v)} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">File Upload</div>
            <div className="toggle-desc">Allow users to attach files</div>
          </div>
          <Toggle value={config.enableFileUpload} onChange={(v) => set('enableFileUpload', v)} />
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Export Tools</div>
            <div className="toggle-desc">Show copy / print buttons</div>
          </div>
          <Toggle value={config.enableExportTools} onChange={(v) => set('enableExportTools', v)} />
        </div>
        {config.enableExportTools && (
          <div className="sub-toggles">
            <div className="toggle-row small">
              <span>Include title</span>
              <Toggle value={config.exportOptions.includeTitle} onChange={(v) => set('exportOptions.includeTitle', v)} />
            </div>
            <div className="toggle-row small">
              <span>Include timestamp</span>
              <Toggle value={config.exportOptions.includeTimestamp} onChange={(v) => set('exportOptions.includeTimestamp', v)} />
            </div>
          </div>
        )}
      </Section>

      {/* ── Messages ── */}
      <Section title="Messages">
        <Field label="Initial Message" hint="Supports Markdown">
          <TextArea
            value={config.initialMessage || ''}
            onChange={(v) => set('initialMessage', v)}
            placeholder="Hello! How can I help you today?"
          />
        </Field>
        <Field label="Legal Disclaimer">
          <TextArea
            value={config.legalMessage || ''}
            onChange={(v) => set('legalMessage', v)}
            placeholder="AI can make mistakes. Please verify important information."
            rows={2}
          />
        </Field>
        <Field label="Starter Prompts" hint="One per line (or leave blank)">
          <TextArea
            value={config._starterPromptsRaw || ''}
            onChange={(v) => {
              const prompts = v
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...config, _starterPromptsRaw: v, starterPrompts: prompts });
            }}
            placeholder={`What can you help me with?\nTell me more\nGet started`}
          />
        </Field>
      </Section>

      {/* ── Privacy ── */}
      <Section title="Privacy" defaultOpen={false}>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Require Privacy Agreement</div>
            <div className="toggle-desc">Show consent popup before first message</div>
          </div>
          <Toggle value={config.requirePrivacyAgreement} onChange={(v) => set('requirePrivacyAgreement', v)} />
        </div>
        {config.requirePrivacyAgreement && (
          <Field label="Privacy Policy URL">
            <TextInput
              value={config.privacyPolicyUrl || ''}
              onChange={(v) => set('privacyPolicyUrl', v)}
              placeholder="https://example.com/privacy"
            />
          </Field>
        )}
      </Section>
    </div>
  );
}
