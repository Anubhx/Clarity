"use client";

import { Check, X } from "lucide-react";
import type { DocumentRecord } from "@/types/document.types";

/* ── Types ──────────────────────────────────────────────── */

export interface MissingSection {
  name: string;
  severity: "high" | "medium";
}

export interface HealthData {
  completeness_score: number;
  key_themes: string[];
  missing_sections: MissingSection[];
  key_decisions: string[];
  open_questions: string[];
}

/* ── Constants ──────────────────────────────────────────── */

const PRD_SECTIONS = [
  "Problem statement",
  "User personas",
  "Success metrics",
  "Technical constraints",
  "Out of scope",
  "Launch timeline",
  "Accessibility requirements",
  "Edge cases",
];

/* ── Score label ────────────────────────────────────────── */

function getScoreLabel(score: number): {
  text: string;
  color: string;
  bg: string;
  border: string;
  ringColor: string;
} {
  if (score >= 85)
    return { text: "Excellent", color: "#1A7A45", bg: "#EAF7F0", border: "#B0E3C8", ringColor: "#3BB56B" };
  if (score >= 70)
    return { text: "Good", color: "#2B5CC8", bg: "#E8EFFD", border: "#C5D9FB", ringColor: "#4A7FF8" };
  if (score >= 50)
    return { text: "Needs work", color: "#CC9A2E", bg: "#FFF8E6", border: "#FADDAA", ringColor: "#FFC757" };
  return { text: "Incomplete", color: "#CC4F25", bg: "#FFF0EB", border: "#FFBDAA", ringColor: "#FF7648" };
}

/* ── SVG Progress Ring (88×88, stroke 8, circumference ~226) */

function ProgressRing({ score }: { score: number }) {
  const size = 88;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2; // 40
  const circumference = 2 * Math.PI * radius; // ≈ 251.3 — spec says 226, use exact calc
  // spec: dashoffset = 226 - (score / 100 * 226)
  const SPEC_CIRC = 226;
  const dashOffset = SPEC_CIRC - (score / 100) * SPEC_CIRC;
  const label = getScoreLabel(score);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E0DFD9"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={label.ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${SPEC_CIRC} ${circumference}`}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      {/* Centered score */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 500, color: "#202020" }}>{score}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            marginTop: 3,
            color: label.color,
          }}
        >
          {label.text}
        </span>
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

export function DocHealthCardSkeleton() {
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      {/* Left col skeleton */}
      <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div className="skeleton" style={{ width: 88, height: 88, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton" style={{ height: 18, width: "70%", borderRadius: 5 }} />
            <div className="skeleton" style={{ height: 13, width: "45%", borderRadius: 5 }} />
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ height: 13, width: "40%", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[80, 110, 70].map((w, j) => (
                <div key={j} className="skeleton" style={{ height: 26, width: w, borderRadius: 6 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Right col skeleton */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ height: 13, width: "35%", borderRadius: 4, marginBottom: 14 }} />
            {[100, 85, 90, 75, 95, 80, 88, 78].map((w, j) => (
              <div
                key={j}
                className="skeleton"
                style={{ height: 13, width: `${w}%`, borderRadius: 4, marginBottom: 8 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

interface DocHealthCardProps {
  document: DocumentRecord;
  healthData: HealthData;
}

export default function DocHealthCard({ document, healthData }: DocHealthCardProps) {
  const { completeness_score, key_themes, missing_sections, key_decisions, open_questions } =
    healthData;

  // Build checklist — cross-reference against missing_sections
  const missingSectionNames = missing_sections.map((s) => s.name.toLowerCase().trim());
  const sectionChecks = PRD_SECTIONS.map((section) => {
    const matchedMissing = missing_sections.find(
      (s) =>
        s.name.toLowerCase().includes(section.toLowerCase()) ||
        section.toLowerCase().includes(s.name.toLowerCase())
    );
    return { name: section, present: !matchedMissing, severity: matchedMissing?.severity };
  });

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#9A9A9A",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    marginBottom: 12,
  };

  return (
    <div className="summaries-cols">
      {/* ── LEFT COLUMN ─────────────────────────────────── */}
      <div className="summaries-left">

        {/* Score card */}
        <div className="card" style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
          <ProgressRing score={completeness_score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "#202020",
                letterSpacing: "-0.01em",
                marginBottom: 6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {document.name}
            </div>
            <div style={{ fontSize: 13, color: "#5C5C5C", lineHeight: 1.5 }}>
              {missing_sections.length === 0
                ? "All sections present"
                : `${missing_sections.filter((s) => s.severity === "high").length} high · ${missing_sections.filter((s) => s.severity === "medium").length} medium gaps`}
            </div>
          </div>
        </div>

        {/* Key themes */}
        {key_themes.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={sectionTitleStyle}>Key Themes</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {key_themes.map((theme, i) => (
                <span key={i} className="sum-theme-pill">{theme}</span>
              ))}
            </div>
          </div>
        )}

        {/* Open questions */}
        {open_questions.length > 0 && (
          <div className="card">
            <div style={sectionTitleStyle}>Open Questions</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {open_questions.map((q, i) => (
                <div key={i} className="sum-question">{q}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT COLUMN ────────────────────────────────── */}
      <div className="summaries-right">

        {/* Section checklist */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={sectionTitleStyle}>Section Checklist</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sectionChecks.map(({ name, present, severity }) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--color-surface)",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: present ? "#EAF7F0" : "#FFF0EB",
                    border: `1px solid ${present ? "#B0E3C8" : "#FFBDAA"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {present ? (
                    <Check size={12} strokeWidth={2.5} color="#3BB56B" />
                  ) : (
                    <X size={12} strokeWidth={2.5} color="#FF7648" />
                  )}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: present ? "#202020" : "#5C5C5C" }}>
                  {name}
                </span>
                {!present && severity && (
                  <span
                    className={`tag ${severity === "high" ? "tag-coral" : "tag-amber"}`}
                    style={{ fontSize: 10, padding: "2px 6px" }}
                  >
                    {severity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Key decisions */}
        {key_decisions.length > 0 && (
          <div className="card">
            <div style={sectionTitleStyle}>Key Decisions</div>
            <div className="g2" style={{ gap: 10 }}>
              {key_decisions.map((decision, i) => (
                <div key={i} className="sum-decision-card">
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#9A9A9A",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Decision {i + 1}
                  </span>
                  {decision}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
