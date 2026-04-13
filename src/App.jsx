import { useState, useCallback, useMemo } from "react";

const ENVS = {
  production: {
    label: "Production",
    authUrl: "https://auth.lsk-prod.app/realms/k-series/protocol/openid-connect/auth",
    tokenUrl: "https://auth.lsk-prod.app/realms/k-series/protocol/openid-connect/token",
  },
  trial: {
    label: "Trial",
    authUrl: "https://auth.lsk-demo.app/realms/k-series/protocol/openid-connect/auth",
    tokenUrl: "https://auth.lsk-demo.app/realms/k-series/protocol/openid-connect/token",
  },
};

const AVAILABLE_SCOPES = [
  { value: "financial-api", label: "Financial Data", desc: "Revenue, payments, taxes" },
  { value: "items", label: "Items", desc: "Menu items & categories" },
  { value: "orders-api", label: "Orders", desc: "Order management — must be provisioned on your API client" },
  { value: "offline_access", label: "Offline Access", desc: "Extended refresh token lifetime" },
];

function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [text]);
  return (
    <button onClick={handleCopy} style={{
      ...styles.copyBtn,
      ...(small ? styles.copyBtnSmall : {}),
      ...(copied ? styles.copyBtnCopied : {}),
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function OutputBlock({ label, value, mono }) {
  if (!value) return null;
  return (
    <div style={styles.outputBlock}>
      <div style={styles.outputHeader}>
        <span style={styles.outputLabel}>{label}</span>
        <CopyButton text={value} small />
      </div>
      <pre style={{ ...styles.outputPre, ...(mono ? { fontSize: "12px" } : {}) }}>{value}</pre>
    </div>
  );
}

export default function KSeriesOAuthBuilder() {
  const [env, setEnv] = useState("production");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scopes, setScopes] = useState(["financial-api", "items"]);
  const [redirectUri, setRedirectUri] = useState("");
  const [activeTab, setActiveTab] = useState("auth");

  // Token exchange state
  const [redirectResponse, setRedirectResponse] = useState("");
  const [manualCode, setManualCode] = useState("");

  const toggleScope = useCallback((scope) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }, []);

  const base64Credentials = useMemo(() => {
    if (!clientId || !clientSecret) return "";
    try {
      return btoa(`${clientId}:${clientSecret}`);
    } catch {
      return "⚠ Encoding error — check for special characters";
    }
  }, [clientId, clientSecret]);

  const authorizationUrl = useMemo(() => {
    if (!clientId || scopes.length === 0) return "";
    const params = new URLSearchParams();
    params.set("response_type", "code");
    params.set("client_id", clientId);
    params.set("scope", scopes.join(" "));
    if (redirectUri) params.set("redirect_uri", redirectUri);
    return `${ENVS[env].authUrl}?${params.toString()}`;
  }, [env, clientId, scopes, redirectUri]);

  const extractedCode = useMemo(() => {
    if (manualCode.trim()) return manualCode.trim();
    if (!redirectResponse.trim()) return "";
    try {
      const url = new URL(redirectResponse.trim());
      return url.searchParams.get("code") || "";
    } catch {
      const match = redirectResponse.match(/[?&]code=([^&\s]+)/);
      return match ? match[1] : "";
    }
  }, [redirectResponse, manualCode]);

  const tokenCurl = useMemo(() => {
    if (!extractedCode || !base64Credentials) return "";
    const ru = redirectUri || "<your_redirect_uri>";
    return `curl --location '${ENVS[env].tokenUrl}' \\
  --header 'Content-Type: application/x-www-form-urlencoded' \\
  --header 'Authorization: Basic ${base64Credentials}' \\
  --data-urlencode 'code=${extractedCode}' \\
  --data-urlencode 'grant_type=authorization_code' \\
  --data-urlencode 'redirect_uri=${ru}'`;
  }, [extractedCode, base64Credentials, redirectUri, env]);

  const refreshCurl = useMemo(() => {
    if (!base64Credentials) return "";
    return `curl --location '${ENVS[env].tokenUrl}' \\
  --header 'Content-Type: application/x-www-form-urlencoded' \\
  --header 'Authorization: Basic ${base64Credentials}' \\
  --data-urlencode 'grant_type=refresh_token' \\
  --data-urlencode 'refresh_token=<your_latest_refresh_token>'`;
  }, [base64Credentials, env]);

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.badge}>K-SERIES</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ ...styles.reqDot, marginLeft: 0 }}>required</span>
              <div style={styles.envToggle}>
              {Object.entries(ENVS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setEnv(key)}
                  style={{
                    ...styles.envBtn,
                    ...(env === key ? styles.envBtnActive : {}),
                  }}
                >
                  <span style={{
                    ...styles.envDot,
                    background: key === "production" ? "#22c55e" : "#f59e0b",
                  }} />
                  {val.label}
                </button>
              ))}
            </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 style={styles.title}>OAuth 2.0 Builder</h1>
            <span style={styles.v2Badge}>V2 Only</span>
          </div>
          <p style={styles.subtitle}>Authorization Code Grant Flow — URI & cURL Generator</p>
        </div>

        {/* Disclaimer */}
        <div style={styles.disclaimer}>
          <div style={styles.disclaimerIcon}>ℹ</div>
          <div>
            <strong>This tool builds URLs and cURL commands only.</strong> It does not create, modify, or provision API clients. Your API client must already be provisioned with the correct scopes and redirect URI before using this tool. To request changes to your API client configuration, contact your Lightspeed technical partner specialist.
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {[
            { key: "auth", label: "① Authorization", icon: "🔑" },
            { key: "token", label: "② Token Exchange", icon: "🔄" },
            { key: "refresh", label: "③ Refresh", icon: "♻️" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Credentials — always visible */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>API Credentials</div>
          <div style={styles.fieldGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Client ID <span style={styles.reqDot}>required</span></label>
              <input
                style={styles.input}
                placeholder="devp-v2-prod-..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Client Secret <span style={styles.reqDot}>required</span></label>
              <input
                style={styles.input}
                type="password"
                placeholder="sec..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
          {base64Credentials && !base64Credentials.startsWith("⚠") && (
            <OutputBlock
              label="Authorization: Basic (Base64 Encoded)"
              value={`Basic ${base64Credentials}`}
              mono
            />
          )}
        </div>

        {/* Tab: Authorization */}
        {activeTab === "auth" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Access Scopes</div>
              <div style={styles.scopeGrid}>
                {AVAILABLE_SCOPES.map((s) => {
                  const active = scopes.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      onClick={() => toggleScope(s.value)}
                      style={{
                        ...styles.scopeChip,
                        ...(active ? styles.scopeChipActive : {}),
                      }}
                    >
                      <span style={{
                        ...styles.scopeCheck,
                        ...(active ? styles.scopeCheckActive : {}),
                      }}>
                        {active ? "✓" : ""}
                      </span>
                      <div>
                        <div style={styles.scopeName}>{s.label}</div>
                        <div style={styles.scopeDesc}>{s.desc}</div>
                      </div>
                      <code style={styles.scopeCode}>{s.value}</code>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionLabel}>Redirect URI <span style={styles.reqDot}>required</span></div>
              <input
                style={styles.input}
                placeholder="https://localhost/ or https://app.example.com/oauth/callback"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                spellCheck={false}
              />
              <div style={styles.hint}>
                Must match <strong>exactly</strong> what's registered with your API client — including trailing slashes.
              </div>
            </div>

            {authorizationUrl && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Generated Authorization URL</div>
                <OutputBlock label="Full URL" value={authorizationUrl} mono />
                <a
                  href={authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.launchBtn}
                >
                  Open Authorization URL ↗
                </a>
              </div>
            )}
          </>
        )}

        {/* Tab: Token Exchange */}
        {activeTab === "token" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Redirect Response</div>
              <p style={styles.hint}>
                Paste the full URL you were redirected to after authorization, or enter the code directly.
              </p>
              <label style={styles.label}>Full Redirect URL</label>
              <textarea
                style={{ ...styles.input, ...styles.textarea }}
                placeholder="https://localhost/?session_state=...&code=..."
                value={redirectResponse}
                onChange={(e) => setRedirectResponse(e.target.value)}
                spellCheck={false}
              />
              <div style={{ marginTop: "12px" }}>
                <label style={styles.label}>Or paste the code directly</label>
                <input
                  style={styles.input}
                  placeholder="e33cdb9e-0f3c-4ff4-8445-..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  spellCheck={false}
                />
              </div>
              {extractedCode && (
                <OutputBlock label="Extracted Authorization Code" value={extractedCode} mono />
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionLabel}>Redirect URI (for token request)</div>
              <input
                style={styles.input}
                placeholder="https://localhost/"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                spellCheck={false}
              />
            </div>

            {tokenCurl && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Token Exchange cURL</div>
                <OutputBlock label="cURL Command" value={tokenCurl} mono />
              </div>
            )}

            {!base64Credentials && (
              <div style={styles.warningBox}>
                Enter your Client ID and Client Secret above to generate the Authorization header and cURL command.
              </div>
            )}
          </>
        )}

        {/* Tab: Refresh */}
        {activeTab === "refresh" && (
          <>
            <div style={styles.section}>
              <p style={styles.hint}>
                Each refresh returns a <strong>new</strong> refresh token. Always store and use the latest one.
                Never hardcode expiry — read <code>expires_in</code> and <code>refresh_expires_in</code> dynamically.
              </p>
              {refreshCurl ? (
                <OutputBlock label="Refresh Token cURL" value={refreshCurl} mono />
              ) : (
                <div style={styles.warningBox}>
                  Enter your Client ID and Client Secret above to generate the refresh cURL.
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span>Lightspeed K-Series — OAuth 2.0 Builder</span>
          <span style={styles.footerRight}>Unofficial Tool · Refer to <a href="https://api-portal.lsk.lightspeed.app/quick-start/authentication/authorization-overview" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>official docs</a></span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    fontFamily: "'IBM Plex Sans', 'SF Pro Display', -apple-system, sans-serif",
    color: "#e4e4e7",
    padding: "24px 16px",
  },
  container: {
    maxWidth: "780px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "32px",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  badge: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#a78bfa",
    background: "rgba(167,139,250,0.1)",
    border: "1px solid rgba(167,139,250,0.2)",
    borderRadius: "6px",
    padding: "4px 10px",
  },
  envToggle: {
    display: "flex",
    gap: "4px",
    background: "rgba(255,255,255,0.04)",
    borderRadius: "8px",
    padding: "3px",
  },
  envBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#71717a",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    padding: "6px 14px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  envBtnActive: {
    color: "#e4e4e7",
    background: "rgba(255,255,255,0.08)",
  },
  envDot: {
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#fafafa",
    margin: 0,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  v2Badge: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#fbbf24",
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.25)",
    borderRadius: "5px",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },
  subtitle: {
    fontSize: "14px",
    color: "#71717a",
    margin: "6px 0 0",
  },
  disclaimer: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    fontSize: "12px",
    lineHeight: 1.6,
    color: "#a1a1aa",
    background: "rgba(99,102,241,0.06)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: "10px",
    padding: "14px 16px",
    marginBottom: "24px",
  },
  disclaimerIcon: {
    fontSize: "16px",
    flexShrink: 0,
    marginTop: "1px",
    color: "#818cf8",
  },
  reqDot: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#f87171",
    marginLeft: "4px",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    marginBottom: "28px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    padding: "4px",
    flexWrap: "wrap",
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#71717a",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    padding: "10px 12px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
    minWidth: "120px",
  },
  tabActive: {
    color: "#fafafa",
    background: "rgba(167,139,250,0.12)",
    boxShadow: "0 0 0 1px rgba(167,139,250,0.25)",
  },
  tabIcon: {
    fontSize: "14px",
  },
  section: {
    marginBottom: "24px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "20px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#a1a1aa",
    marginBottom: "14px",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#a1a1aa",
  },
  input: {
    width: "100%",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#e4e4e7",
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  },
  textarea: {
    minHeight: "80px",
    resize: "vertical",
    lineHeight: 1.5,
  },
  hint: {
    fontSize: "12px",
    color: "#71717a",
    marginTop: "8px",
    lineHeight: 1.5,
  },
  scopeGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  scopeChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    textAlign: "left",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
    color: "#a1a1aa",
  },
  scopeChipActive: {
    background: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.3)",
    color: "#e4e4e7",
  },
  scopeCheck: {
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
    color: "transparent",
  },
  scopeCheckActive: {
    background: "#7c3aed",
    borderColor: "#7c3aed",
    color: "#fff",
  },
  scopeName: {
    fontSize: "13px",
    fontWeight: 600,
  },
  scopeDesc: {
    fontSize: "11px",
    color: "#71717a",
    marginTop: "1px",
  },
  scopeCode: {
    marginLeft: "auto",
    fontSize: "11px",
    color: "#71717a",
    fontFamily: "'IBM Plex Mono', monospace",
    background: "rgba(255,255,255,0.04)",
    padding: "2px 8px",
    borderRadius: "4px",
    flexShrink: 0,
  },
  outputBlock: {
    marginTop: "14px",
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  outputHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  outputLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#71717a",
    letterSpacing: "0.03em",
  },
  outputPre: {
    margin: 0,
    padding: "12px",
    fontSize: "13px",
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
    color: "#c4b5fd",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    lineHeight: 1.6,
    overflowX: "auto",
  },
  copyBtn: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#a78bfa",
    background: "rgba(167,139,250,0.1)",
    border: "1px solid rgba(167,139,250,0.2)",
    borderRadius: "5px",
    padding: "4px 10px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  copyBtnSmall: {
    fontSize: "10px",
    padding: "3px 8px",
  },
  copyBtnCopied: {
    color: "#22c55e",
    background: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.2)",
  },
  launchBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "12px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fafafa",
    background: "#7c3aed",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.15s",
  },
  warningBox: {
    fontSize: "13px",
    color: "#fbbf24",
    background: "rgba(251,191,36,0.06)",
    border: "1px solid rgba(251,191,36,0.15)",
    borderRadius: "8px",
    padding: "12px 16px",
    lineHeight: 1.5,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: "11px",
    color: "#52525b",
    flexWrap: "wrap",
    gap: "8px",
  },
  footerRight: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  footerLink: {
    color: "#a78bfa",
    textDecoration: "none",
  },
};
