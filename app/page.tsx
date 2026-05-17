import Link from "next/link";
import { Sparkles, Bookmark, AlertTriangle, CircleDashed, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-white)" }}>
      {/* Nav */}
      <nav className="landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="logo-mark"><Sparkles size={18} color="#fff" strokeWidth={2} /></div>
          <span className="logo-text">Clarity</span>
        </div>
        <div className="landing-nav-links">
          <span className="landing-nav-link">Features</span>
          <span className="landing-nav-link">How it works</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
          <Link href="/sign-up" className="btn btn-primary"><Sparkles size={14} strokeWidth={2} /> Get started</Link>
        </div>
      </nav>
      {/* Hero */}
      <div className="landing-hero">
        <div className="hero-eyebrow"><Sparkles size={13} strokeWidth={2} /> AI-powered design research</div>
        <h1 className="hero-h1">Your documents,<br /><em>finally</em> answering back.</h1>
        <p className="hero-sub">Query PRDs, research notes, briefs and competitive analyses with grounded, cited answers — in seconds.</p>
        <div className="hero-cta">
          <Link href="/sign-up" className="hero-btn-primary"><Sparkles size={16} strokeWidth={2} color="#fff" /> Start for free</Link>
          <Link href="/sign-in" className="hero-btn-secondary">See a live demo <ArrowRight size={14} strokeWidth={2} /></Link>
        </div>
        {/* Preview window */}
        <div className="hero-preview">
          <div className="hero-preview-bar">
            <div className="win-dot" style={{ background: "#FF5F57" }} />
            <div className="win-dot" style={{ background: "#FFBD2E" }} />
            <div className="win-dot" style={{ background: "#28CA41" }} />
            <span style={{ fontSize: 12, color: "var(--color-ink-tertiary)", marginLeft: 8 }}>clarity.app/chat</span>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="msg-row user" style={{ maxWidth: 600 }}>
              <div className="msg-avatar user">U</div>
              <div className="msg-bubble user" style={{ fontSize: 13 }}>What are the key gaps in the onboarding PRD?</div>
            </div>
            <div className="msg-row" style={{ maxWidth: 600 }}>
              <div className="msg-avatar ai">C</div>
              <div className="msg-bubble" style={{ fontSize: 13, padding: "12px 14px" }}>
                The PRD is missing success metrics and lacks accessibility requirements. Section 2.1 describes goals but doesn&rsquo;t tie them to measurable KPIs.
                <div className="citation-row">
                  <span className="tag tag-amber"><Bookmark size={10} strokeWidth={2} /> PRD §2.1</span>
                  <span className="tag tag-blue"><Bookmark size={10} strokeWidth={2} /> Research Q2 p.4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Features strip */}
        <div className="features-strip" style={{ maxWidth: 900, width: "100%", marginTop: 0 }}>
          <div className="feat-cell">
            <div className="feat-icon"><Bookmark size={16} strokeWidth={1.75} /></div>
            <div className="feat-title">Cited answers</div>
            <div className="feat-desc">Every claim links back to its source</div>
          </div>
          <div className="feat-cell">
            <div className="feat-icon"><AlertTriangle size={16} strokeWidth={1.75} /></div>
            <div className="feat-title">Contradictions</div>
            <div className="feat-desc">Find conflicts across documents</div>
          </div>
          <div className="feat-cell">
            <div className="feat-icon"><CircleDashed size={16} strokeWidth={1.75} /></div>
            <div className="feat-title">Gap finder</div>
            <div className="feat-desc">Spot missing sections instantly</div>
          </div>
          <div className="feat-cell">
            <div className="feat-icon"><Sparkles size={16} strokeWidth={1.75} /></div>
            <div className="feat-title">AI powered</div>
            <div className="feat-desc">DeepSeek reasoning at your fingertips</div>
          </div>
        </div>
      </div>
    </div>
  );
}
