import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Clarity — Design Research Assistant",
  description:
    "Ask anything. Know everything. Cite the source. A RAG-powered assistant for product designers and PMs.",
  keywords: ["design research", "RAG", "AI assistant", "PRD analysis", "document intelligence"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
        <body className="font-[var(--font-sans)]">{children}</body>
      </html>
    </ClerkProvider>
  );
}
