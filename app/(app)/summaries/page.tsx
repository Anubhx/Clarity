"use client";
import Header from "@/components/layout/Header";

export default function SummariesPage() {
  return (
    <>
      <Header title="Document Health" />
      <div className="content">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
            </svg>
          </div>
          <h2>No summaries yet</h2>
          <p>Upload documents to generate health reports with themes, gaps, and completeness scores.</p>
        </div>
      </div>
    </>
  );
}
