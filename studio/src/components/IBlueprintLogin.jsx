import { useState, useEffect, useCallback, useRef } from 'react';

const IB_BASE_URL_KEY = 'chatdock-ib-base-url';
const IB_TOKEN_KEY    = 'chatdock-ib-token';

// ─── Supabase auto-detect ────────────────────────────────────────────────────
// iBlueprint uses Supabase which stores the session in localStorage under the
// key "sb-{project_ref}-auth-token". Scan all keys to find it (works when
// Studio and iBlueprint share an origin, e.g. embedded in the platform).

function findSupabaseToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // Supabase v2 stores {access_token, ...} or {currentSession: {access_token}}
      const tok = parsed?.access_token || parsed?.currentSession?.access_token;
      if (tok && typeof tok === 'string') return tok;
    }
  } catch { /* ignore parse errors */ }
  return null;
}

// ─── tRPC helpers ────────────────────────────────────────────────────────────
// iBlueprint API uses tRPC:
//   queries   → GET  /api/trpc/{procedure}?batch=1&input={"0":{"json":{...}}}
//   mutations → POST /api/trpc/{procedure}   body: {"json":{...}}

async function ibQuery(apiUrl, procedure, input, token) {
  const encoded = encodeURIComponent(JSON.stringify({ '0': { json: input } }));
  const res = await fetch(`${apiUrl}/${procedure}?batch=1&input=${encoded}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw Object.assign(new Error('Session expired'), { code: 401 });
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Unexpected response from ${procedure}`);
  const item = data[0];
  if (item?.error) {
    throw new Error(item.error.data?.message || item.error.message || `${procedure} failed`);
  }
  return item?.result?.data?.json;
}

async function ibMutation(apiUrl, procedure, input, token) {
  const res = await fetch(`${apiUrl}/${procedure}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ json: input }),
  });
  if (res.status === 401) throw Object.assign(new Error('Session expired'), { code: 401 });
  const data = await res.json();
  // httpLink returns a single object; batch fallback returns an array
  const item = Array.isArray(data) ? data[0] : data;
  if (item?.error) {
    throw new Error(item.error.data?.message || item.error.message || `${procedure} failed`);
  }
  return item?.result?.data?.json;
}

// ─── Config mapping ──────────────────────────────────────────────────────────
// iBlueprint deployment config schema:
//   { displayMode, chatTitle, useStreaming, metadata, legalMessage,
//     initialMessage, starterPrompts:[{label,message}], dimensions, theme, endpoints }

function ibDepToConfig(dep, baseUrl) {
  const cfg = dep.config || {};
  const theme = cfg.theme || {};
  const endpoints = cfg.endpoints || {};
  // starterPrompts in iBlueprint are {label, message} objects; ChatDock uses plain strings
  const rawPrompts = Array.isArray(cfg.starterPrompts) ? cfg.starterPrompts : [];
  const starterPrompts = rawPrompts.map((p) =>
    typeof p === 'string' ? p : (p.message || p.label || ''),
  );
  const chatId = dep.chatbot_id || dep.chatbotId || '';
  const apiEndpoint =
    endpoints.chatEndpoint ||
    (endpoints.apiBaseUrl ? `${endpoints.apiBaseUrl}/api/chat/${chatId}` : '') ||
    `${baseUrl}/api/chat/${chatId}`;

  return {
    chatId,
    apiEndpoint,
    deploymentId: dep.id || '',
    title:        cfg.chatTitle || dep.name || 'Chat',
    inline:       cfg.displayMode !== 'floating',
    useStreaming:          cfg.useStreaming          ?? false,
    enableFileUpload:      cfg.enableFileUpload      ?? false,
    enableExportTools:     cfg.enableExportTools     ?? false,
    requirePrivacyAgreement: cfg.requirePrivacyAgreement ?? false,
    privacyPolicyUrl: cfg.privacyPolicyUrl || '',
    authToken:    '',
    initialMessage:   cfg.initialMessage  || '',
    legalMessage:     cfg.legalMessage    || '',
    starterPrompts,
    _starterPromptsRaw: starterPrompts.join('\n'),
    dimensions: {
      width:  cfg.dimensions?.width  || '100%',
      height: cfg.dimensions?.height || '100%',
    },
    exportOptions: { includeTitle: true, includeTimestamp: true },
    theme: {
      primaryColor:         theme.primaryColor         || '#1f6feb',
      textColor:            theme.textColor            || '#ffffff',
      chatBackground:       theme.chatBackground       || '#f9f9f9',
      buttonHoverColor:     theme.buttonHoverColor     || '#1a5bcc',
      userMessageBg:        theme.userMessageBg        || '#1f6feb',
      userMessageFontColor: theme.userMessageFontColor || '#ffffff',
      botMessageBg:         theme.botMessageBg         || '#e9e9e9',
      botMessageFontColor:  theme.botMessageFontColor  || '#333333',
      bannerColor:          theme.bannerColor          || '#1f6feb',
      bannerFontColor:      theme.bannerFontColor      || '#ffffff',
      fontFamily:           theme.fontFamily           || 'system-ui, -apple-system, sans-serif',
      logoUrl:              theme.logoUrl              || '',
    },
  };
}

function configToIbDep(config, existingDep) {
  const prevConfig = existingDep?.config || {};
  return {
    displayMode: config.inline ? 'inline' : 'floating',
    chatTitle:   config.title  || 'Chat',
    useStreaming: config.useStreaming ?? false,
    metadata:    prevConfig.metadata || {},
    legalMessage:  config.legalMessage  || undefined,
    initialMessage: config.initialMessage || undefined,
    starterPrompts: config.starterPrompts?.map((s) => ({ label: s, message: s })) || [],
    dimensions: config.dimensions,
    theme: { ...config.theme },
    endpoints: {
      ...(prevConfig.endpoints || {}),
      chatEndpoint: config.apiEndpoint || undefined,
    },
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IBlueprintLogin({ config, onDeploymentSelect }) {
  const [baseUrl, setBaseUrl] = useState(
    () => localStorage.getItem(IB_BASE_URL_KEY) || 'https://app.iblueprint.com',
  );
  // Derived API URL: {baseUrl}/api/trpc
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/trpc`;

  const [token,           setToken]           = useState(null);
  const [autoDetected,    setAutoDetected]     = useState(false);
  const [chatbots,        setChatbots]         = useState([]);
  const [selectedChatbot, setSelectedChatbot]  = useState(null);
  const [deployments,     setDeployments]      = useState([]);
  const [loadedDep,       setLoadedDep]        = useState(null); // deployment currently loaded into studio
  const [chatbotSearch,   setChatbotSearch]    = useState('');
  const [depSearch,       setDepSearch]        = useState('');
  const [loadingChatbots, setLoadingChatbots]  = useState(false);
  const [loadingDeps,     setLoadingDeps]      = useState(false);
  const [saving,          setSaving]           = useState(false);
  const [saveSuccess,     setSaveSuccess]      = useState(false);
  const [error,           setError]            = useState(null);
  const [saveError,       setSaveError]        = useState(null);
  const saveSuccessTimer = useRef(null);

  // ── Auto-detect existing iBlueprint / Supabase session ───────────────────
  useEffect(() => {
    // 1. Check our own persisted token first
    const persisted = localStorage.getItem(IB_TOKEN_KEY);
    if (persisted) { setToken(persisted); return; }

    // 2. Scan for a live Supabase session (works when same origin as iBlueprint)
    const supabaseTok = findSupabaseToken();
    if (supabaseTok) {
      setToken(supabaseTok);
      setAutoDetected(true);
    }
  }, []);

  // ── Fetch chatbot list when authenticated ─────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoadingChatbots(true);
    setError(null);

    ibQuery(apiUrl, 'chatbot.list', { limit: 50, offset: 0 }, token)
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : (data?.chatbots ?? data?.items ?? data?.data ?? []);
        setChatbots(list);
      })
      .catch((e) => {
        if (e.code === 401) {
          handleExpiredToken();
        } else {
          setError(e.message || 'Failed to load chatbots');
        }
      })
      .finally(() => setLoadingChatbots(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch deployments for selected chatbot ────────────────────────────────
  useEffect(() => {
    if (!token || !selectedChatbot) return;
    setLoadingDeps(true);
    setError(null);

    ibQuery(apiUrl, 'chatbot.deployments.list', { chatbotId: selectedChatbot.id }, token)
      .then((data) => {
        setDeployments(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (e.code === 401) handleExpiredToken();
        else setError(e.message || 'Failed to load deployments');
      })
      .finally(() => setLoadingDeps(false));
  }, [selectedChatbot]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpiredToken = useCallback(() => {
    localStorage.removeItem(IB_TOKEN_KEY);
    setToken(null);
    setAutoDetected(false);
    setChatbots([]);
    setSelectedChatbot(null);
    setDeployments([]);
    setLoadedDep(null);
    setError('Session expired. Please sign in again.');
  }, []);

  // ── Sign in: navigate to iBlueprint auth (works same-origin or after redirect) ──
  const handleLogin = useCallback(() => {
    const base = baseUrl.trim().replace(/\/$/, '');
    if (!base) return;
    localStorage.setItem(IB_BASE_URL_KEY, base);
    // Redirect to iBlueprint — after signing in, user returns and
    // the Supabase session auto-detect fires on next Studio load.
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${base}/auth?redirectTo=${returnUrl}`;
  }, [baseUrl]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(IB_TOKEN_KEY);
    setToken(null);
    setAutoDetected(false);
    setChatbots([]);
    setSelectedChatbot(null);
    setDeployments([]);
    setLoadedDep(null);
    setError(null);
  }, []);

  // ── Select chatbot → load its deployments ─────────────────────────────────
  const handleSelectChatbot = useCallback((chatbot) => {
    setSelectedChatbot(chatbot);
    setDeployments([]);
    setDepSearch('');
    setError(null);
  }, []);

  // ── Load a deployment into the studio ─────────────────────────────────────
  const handleLoadDeployment = useCallback((dep) => {
    const base = localStorage.getItem(IB_BASE_URL_KEY) || baseUrl;
    setLoadedDep(dep);
    onDeploymentSelect(ibDepToConfig(dep, base));
  }, [baseUrl, onDeploymentSelect]);

  // ── Save current studio config back to iBlueprint deployment ─────────────
  const handleSave = useCallback(() => {
    if (!loadedDep || !config) return;
    clearTimeout(saveSuccessTimer.current);
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const updatedConfig = configToIbDep(config, loadedDep);

    ibMutation(apiUrl, 'chatbot.deployments.update', {
      id:          loadedDep.id,
      name:        loadedDep.name,          // preserve name unless edited
      description: loadedDep.description,
      config:      updatedConfig,
      aiConnectionId: loadedDep.ai_connection_id || null,
    }, token)
      .then(() => {
        setSaveSuccess(true);
        // Refresh the loaded deployment object with updated config
        setLoadedDep((prev) => prev ? { ...prev, config: updatedConfig } : prev);
        saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch((e) => {
        if (e.code === 401) handleExpiredToken();
        else setSaveError(e.message || 'Save failed');
      })
      .finally(() => setSaving(false));
  }, [loadedDep, config, token, apiUrl, handleExpiredToken]);

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredChatbots = chatbots.filter((c) => {
    if (!chatbotSearch) return true;
    return (c.name || '').toLowerCase().includes(chatbotSearch.toLowerCase());
  });

  const filteredDeps = deployments.filter((d) => {
    if (!depSearch) return true;
    const q = depSearch.toLowerCase();
    return (d.name || '').toLowerCase().includes(q);
  });

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="ib-login-section">
        <div className="ib-login-header">
          <span className="ib-dot" />
          <span className="ib-login-title">iBlueprint Connect</span>
        </div>
        <div className="ib-login-body">
          <div className="field">
            <label className="field-label">iBlueprint URL</label>
            <input
              className="input"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://app.iblueprint.com"
            />
          </div>
          {error && <div className="ib-error">{error}</div>}
          <button
            className="ib-login-btn"
            onClick={handleLogin}
            disabled={!baseUrl.trim()}
          >
            Sign in with iBlueprint
          </button>
          <p className="ib-login-hint">
            Already signed into iBlueprint? The Studio will auto-connect when
            running on the same domain.
          </p>
        </div>
      </div>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  return (
    <div className="ib-login-section connected">
      {/* Header row */}
      <div className="ib-login-header">
        <span className="ib-dot connected" />
        <span className="ib-login-title">iBlueprint</span>
        <span className="ib-connected-badge">
          {autoDetected ? 'Auto-connected' : 'Connected'}
        </span>
        <button className="ib-logout-btn" onClick={handleLogout} title="Disconnect">
          Disconnect
        </button>
      </div>

      <div className="ib-login-body">

        {/* ── Save loaded deployment ──────────────────────────────────────── */}
        {loadedDep && (
          <div className="ib-save-bar">
            <div className="ib-save-info">
              <span className="ib-save-label">Loaded:</span>
              <span className="ib-save-name">{loadedDep.name}</span>
            </div>
            <button
              className={`ib-save-btn${saveSuccess ? ' saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
              title="Save current studio settings back to this deployment"
            >
              {saving   ? <><span className="ib-spinner" /> Saving…</> :
               saveSuccess ? '✓ Saved' : '↑ Save'}
            </button>
          </div>
        )}
        {saveError && <div className="ib-error">{saveError}</div>}

        {error && <div className="ib-error">{error}</div>}

        {/* ── Chatbot list ────────────────────────────────────────────────── */}
        {!selectedChatbot ? (
          <>
            <div className="ib-search-row">
              <input
                className="input ib-search"
                type="search"
                placeholder="Search chatbots…"
                value={chatbotSearch}
                onChange={(e) => setChatbotSearch(e.target.value)}
              />
              {loadingChatbots && <span className="ib-spinner-inline" />}
            </div>

            {!loadingChatbots && filteredChatbots.length === 0 && (
              <div className="ib-empty">
                {chatbotSearch ? 'No matching chatbots' : 'No chatbots found'}
              </div>
            )}

            {filteredChatbots.length > 0 && (
              <div className="ib-deployment-list">
                {filteredChatbots.map((bot) => (
                  <button
                    key={bot.id}
                    className="ib-deployment-item"
                    onClick={() => handleSelectChatbot(bot)}
                    title="Browse deployments for this chatbot"
                  >
                    <div className="ib-dep-left">
                      <div className="ib-dep-text">
                        <span className="ib-dep-name">{bot.name || bot.id}</span>
                        <span className="ib-dep-id">{bot.id}</span>
                      </div>
                    </div>
                    <span className="ib-dep-load">›</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Deployment list for selected chatbot ──────────────────────── */
          <>
            <button className="ib-back-btn" onClick={() => { setSelectedChatbot(null); setDeployments([]); }}>
              ← {selectedChatbot.name || selectedChatbot.id}
            </button>

            <div className="ib-search-row">
              <input
                className="input ib-search"
                type="search"
                placeholder="Search deployments…"
                value={depSearch}
                onChange={(e) => setDepSearch(e.target.value)}
              />
              {loadingDeps && <span className="ib-spinner-inline" />}
            </div>

            {!loadingDeps && filteredDeps.length === 0 && (
              <div className="ib-empty">
                {depSearch ? 'No matching deployments' : 'No deployments saved for this chatbot'}
              </div>
            )}

            {filteredDeps.length > 0 && (
              <div className="ib-deployment-list">
                {filteredDeps.map((dep) => {
                  const color = dep.config?.theme?.primaryColor;
                  const isLoaded = loadedDep?.id === dep.id;
                  return (
                    <button
                      key={dep.id}
                      className={`ib-deployment-item${isLoaded ? ' selected' : ''}`}
                      onClick={() => handleLoadDeployment(dep)}
                      title={`Load "${dep.name}" into the studio`}
                    >
                      <div className="ib-dep-left">
                        {color && (
                          <span
                            className="ib-dep-swatch"
                            style={{ background: color }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="ib-dep-text">
                          <span className="ib-dep-name">{dep.name}</span>
                          <span className="ib-dep-id">
                            {dep.is_active ? '● active' : '○ inactive'}
                          </span>
                        </div>
                      </div>
                      <span className="ib-dep-load">{isLoaded ? '✓' : '↓'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
