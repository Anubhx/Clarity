"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  suggestions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ suggestions, onSelect }: SuggestedQuestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
        maxWidth: "85%", // Match AI bubble max-width
      }}
    >
      {suggestions.map((question, i) => (
        <motion.button
          key={question}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
          onClick={() => onSelect(question)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#F0EFEB",
            border: "1px solid #E0DFD9",
            color: "#4A7FF8",
            fontSize: 13,
            fontWeight: 500,
            padding: "8px 12px",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s ease",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#E8EFFD";
            e.currentTarget.style.borderColor = "#C5D9FB";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#F0EFEB";
            e.currentTarget.style.borderColor = "#E0DFD9";
          }}
        >
          <Sparkles size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
          {question}
        </motion.button>
      ))}
    </div>
  );
}
