"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Shield,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  Info,
  Zap,
  ArrowRightLeft,
} from "lucide-react";
import Header from "@/components/layout/Header";
import {
  useSettingsStore,
  type AIProvider,
} from "@/store/settings.store";

const TABS = ["AI & API", "Account", "Integrations", "Appearance"] as const;
type Tab = (typeof TABS)[number];

const BYOK_PROVIDERS = [
  {
    id: "deepseek" as const,
    label: "DeepSeek",
    placeholder: "sk-...",
    url: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-chat", "deepseek-coder"],
  },
  {
    id: "gemini" as const,
    label: "Google Gemini",
    placeholder: "AIza...",
    url: "https://aistudio.google.com/apikey",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  },
  {
    id: "openai" as const,
    label: "OpenAI",
    placeholder: "sk-...",
    url: "https://platform.openai.com/api-keys",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  },
  {
    id: "anthropic" as const,
    label: "Anthropic Claude",
    placeholder: "sk-ant-...",
    url: "https://console.anthropic.com/settings/keys",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
  },
];

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${on ? "on" : "off"}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      type="button"
    />
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("AI & API");
  const { user } = useUser();

  return (
    <>
      <Header title="Settings" />
      <div className="content" style={{ maxWidth: 820 }}>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Sidebar Tabs */}
          <div style={{ width: 180, flexShrink: 0 }}>
            {TABS.map((tab) => (
              <div
                key={tab}
                className={`settings-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {activeTab === "AI & API" && <AITab />}
            {activeTab === "Account" && <AccountTab user={user} />}
            {activeTab === "Integrations" && <IntegrationsTab />}
            {activeTab === "Appearance" && <AppearanceTab />}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── AI & API Tab ─────────────────────────────────────── */
function AITab() {
  const {
    activeProvider,
    byokKeys,
    maxChunks,
    autoDetectContradictions,
    showSuggestedQuestions,
    setProvider,
    setByokKey,
    removeByokKey,
    setMaxChunks,
    setAutoDetectContradictions,
    setShowSuggestedQuestions,
  } = useSettingsStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});

  const handleSaveKey = (providerId: string) => {
    const key = keyInputs[providerId];
    if (key && key.trim()) {
      setByokKey(providerId, key.trim());
      setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      setProvider(providerId as AIProvider);
    }
  };

  return (
    <>
      {/* Built-in AI Status */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Zap size={16} strokeWidth={2} style={{ color: "var(--color-blue)" }} />
          <span style={{ fontSize: 15, fontWeight: 500 }}>AI Provider</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Choose between the built-in AI (no setup needed) or bring your own API key.
        </div>

        {/* Option 1: Built-in */}
        <div
          className="settings-row"
          style={{
            background:
              activeProvider === "built-in"
                ? "var(--color-blue-light)"
                : "transparent",
            margin: "0 -24px",
            padding: "16px 24px",
            borderRadius: "var(--r-md)",
            cursor: "pointer",
          }}
          onClick={() => setProvider("built-in")}
        >
          <div>
            <div className="settings-label">
              <input
                type="radio"
                name="provider"
                checked={activeProvider === "built-in"}
                onChange={() => setProvider("built-in")}
                style={{ marginRight: 8 }}
              />
              Use built-in AI{" "}
              <span className="tag tag-green" style={{ marginLeft: 8 }}>
                <CheckCircle size={10} strokeWidth={2} /> Recommended
              </span>
            </div>
            <div className="settings-desc" style={{ marginLeft: 22 }}>
              Powered by DeepSeek + Google Gemini with automatic fallback. No setup needed.
            </div>
          </div>
          {activeProvider === "built-in" && (
            <span className="tag tag-green">
              <CheckCircle size={10} strokeWidth={2} /> Active
            </span>
          )}
        </div>

        {/* Provider cascade info */}
        {activeProvider === "built-in" && (
          <div
            style={{
              margin: "12px -24px 0",
              padding: "12px 24px 12px 46px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--color-ink-secondary)",
            }}
          >
            <ArrowRightLeft size={12} />
            <span>
              Provider order: <strong>DeepSeek</strong> → <strong>Gemini</strong>
              &nbsp;&nbsp;(auto-fallback if one provider is unavailable)
            </span>
          </div>
        )}

        {/* Option 2: BYOK */}
        <div style={{ margin: "0 -24px", padding: "16px 24px" }}>
          <div className="settings-label" style={{ marginBottom: 12 }}>
            <input
              type="radio"
              name="provider"
              checked={activeProvider !== "built-in"}
              onChange={() => {}}
              style={{ marginRight: 8 }}
            />
            Bring your own key{" "}
            <span
              className="tag tag-muted"
              style={{ marginLeft: 8, fontWeight: 400 }}
            >
              Optional
            </span>
          </div>
          <div
            className="settings-desc"
            style={{ marginLeft: 22, marginBottom: 16 }}
          >
            Use your own API key for any supported provider. Your key overrides built-in AI for this session only.
          </div>

          {/* Provider Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginLeft: 22,
            }}
          >
            {BYOK_PROVIDERS.map((provider) => {
              const hasKey = !!byokKeys[provider.id];
              const isActive = activeProvider === provider.id;
              return (
                <div
                  key={provider.id}
                  className="card"
                  style={{
                    padding: 14,
                    cursor: hasKey ? "pointer" : "default",
                    borderColor: isActive
                      ? "var(--color-blue)"
                      : "var(--color-border)",
                    background: isActive
                      ? "var(--color-blue-light)"
                      : "var(--color-white)",
                  }}
                  onClick={() => hasKey && setProvider(provider.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {provider.label}
                    </span>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: "var(--color-ink-tertiary)",
                        display: "flex",
                      }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {hasKey ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "var(--color-ink-secondary)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {showKeys[provider.id]
                          ? byokKeys[provider.id]
                          : "••••••••" + byokKeys[provider.id].slice(-4)}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "0 4px", height: 24 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowKeys((prev) => ({
                            ...prev,
                            [provider.id]: !prev[provider.id],
                          }));
                        }}
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff size={12} />
                        ) : (
                          <Eye size={12} />
                        )}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{
                          padding: "0 4px",
                          height: 24,
                          color: "var(--color-coral)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeByokKey(provider.id);
                          if (isActive) setProvider("built-in");
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        className="input"
                        style={{ height: 28, fontSize: 12 }}
                        placeholder={provider.placeholder}
                        value={keyInputs[provider.id] || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveKey(provider.id);
                        }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveKey(provider.id);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Privacy Notice */}
          <div
            style={{
              marginTop: 16,
              marginLeft: 22,
              padding: "12px 14px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--r-md)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Shield
              size={14}
              strokeWidth={2}
              style={{
                color: "var(--color-green)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.6 }}>
              <strong>Your keys are private.</strong> API keys are stored only in
              your browser session and are never sent to our servers, logged, or
              shared. You can remove them at any time.
            </div>
          </div>
        </div>
      </div>

      {/* Retrieval Settings */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          Retrieval
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Control how Clarity searches your documents.
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Max retrieved chunks</div>
            <div className="settings-desc">
              Higher = more context, slower answers
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min="3"
              max="12"
              value={maxChunks}
              onChange={(e) => setMaxChunks(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 16 }}>
              {maxChunks}
            </span>
          </div>
        </div>
      </div>

      {/* Behaviour */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          Behaviour
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Control how Clarity responds and surfaces information.
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Auto-detect contradictions</div>
            <div className="settings-desc">
              Flag conflicts in AI responses automatically
            </div>
          </div>
          <Toggle
            on={autoDetectContradictions}
            onChange={setAutoDetectContradictions}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Show suggested questions</div>
            <div className="settings-desc">
              Surface follow-up prompts after each answer
            </div>
          </div>
          <Toggle
            on={showSuggestedQuestions}
            onChange={setShowSuggestedQuestions}
          />
        </div>
      </div>
    </>
  );
}

/* ── Account Tab ──────────────────────────────────────── */
function AccountTab({
  user,
}: {
  user: ReturnType<typeof useUser>["user"];
}) {
  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          Profile
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Manage your account details.
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Name</div>
            <div className="settings-desc">Your display name</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {user?.fullName || user?.firstName || "—"}
          </span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Email</div>
            <div className="settings-desc">Your primary email</div>
          </div>
          <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
            {user?.primaryEmailAddress?.emailAddress || "—"}
          </span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">User ID</div>
            <div className="settings-desc">Unique account identifier</div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "var(--color-ink-tertiary)",
            }}
          >
            {user?.id || "—"}
          </span>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          Data & Privacy
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Manage your data and privacy settings.
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Delete all documents</div>
            <div className="settings-desc">
              Remove all uploaded documents and chunks
            </div>
          </div>
          <button className="btn btn-danger btn-sm">Delete all</button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Export data</div>
            <div className="settings-desc">
              Download your conversation history and documents
            </div>
          </div>
          <button className="btn btn-secondary btn-sm">Export</button>
        </div>
      </div>
    </>
  );
}

/* ── Integrations Tab ─────────────────────────────────── */
function IntegrationsTab() {
  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          Connected Services
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--color-ink-tertiary)",
            marginBottom: 20,
          }}
        >
          Connect external services to import documents automatically.
        </div>
        <div className="settings-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-md)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📁
            </div>
            <div>
              <div className="settings-label">Google Drive</div>
              <div className="settings-desc">
                Import documents from your Drive folders
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm">Connect</button>
        </div>
        <div className="settings-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-md)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📝
            </div>
            <div>
              <div className="settings-label">Notion</div>
              <div className="settings-desc">
                Sync pages and databases from Notion
              </div>
            </div>
          </div>
          <span className="tag tag-muted">Coming soon</span>
        </div>
        <div className="settings-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-md)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              🎨
            </div>
            <div>
              <div className="settings-label">Figma</div>
              <div className="settings-desc">
                Import design specs and annotations
              </div>
            </div>
          </div>
          <span className="tag tag-muted">Coming soon</span>
        </div>
      </div>

      <div
        style={{
          padding: "12px 14px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--r-md)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Info
          size={14}
          strokeWidth={2}
          style={{
            color: "var(--color-blue)",
            marginTop: 2,
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.6 }}>
          Integrations connect securely using OAuth. Clarity only reads document
          content for indexing — we never modify or delete your files.
        </div>
      </div>
    </>
  );
}

/* ── Appearance Tab ───────────────────────────────────── */
function AppearanceTab() {
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
        Theme
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--color-ink-tertiary)",
          marginBottom: 20,
        }}
      >
        Choose how Clarity looks.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {(["light", "dark", "system"] as const).map((t) => (
          <div
            key={t}
            onClick={() => setTheme(t)}
            style={{
              padding: 16,
              borderRadius: "var(--r-md)",
              border: `1.5px solid ${theme === t ? "var(--color-blue)" : "var(--color-border)"}`,
              background:
                theme === t ? "var(--color-blue-light)" : "var(--color-white)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 28,
                borderRadius: 6,
                margin: "0 auto 10px",
                background:
                  t === "light"
                    ? "#FFFFFF"
                    : t === "dark"
                      ? "#1A1A1A"
                      : "linear-gradient(135deg, #FFFFFF 50%, #1A1A1A 50%)",
                border: "1px solid var(--color-border)",
              }}
            />
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {t}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
