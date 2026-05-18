"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  MessageCircle,
  FileText,
  LayoutList,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentsStore } from "@/store/documents.store";
import { useSidebarStore } from "@/store/sidebar.store";

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/documents", label: "Documents", icon: FileText, showBadge: true },
  { href: "/summaries", label: "Summaries", icon: LayoutList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const documents = useDocumentsStore((s) => s.documents);
  const readyDocs = documents.filter((d) => d.status === "ready").length;
  const { isOpen, close } = useSidebarStore();

  return (
    <>
      {/* Mobile overlay backdrop — renders UNDER the sidebar (z-999 < z-1000) */}
      <div
        className={`sidebar-backdrop ${isOpen ? "open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <Link href="/chat" className="logo-wrap" onClick={close}>
          <div className="logo-mark">
            <Sparkles size={18} color="#fff" strokeWidth={2} />
          </div>
          <span className="logo-text">
            Clar<span>ity</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-item", isActive && "active")}
                onClick={close}
              >
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
                {item.showBadge && readyDocs > 0 && (
                  <span className="badge">{readyDocs}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Documents in context — shown on chat page */}
        {pathname.startsWith("/chat") && documents.length > 0 && (
          <>
            <div className="nav-section-label">Documents in context</div>
            <div className="sidebar-docs">
              {documents.slice(0, 8).map((doc) => (
                <div key={doc.id} className="doc-chip">
                  <div
                    className={cn(
                      "dot",
                      doc.status === "ready" ? "" : "indexing"
                    )}
                  />
                  <span className="doc-chip-name">{doc.name}</span>
                  <span className="doc-chip-type">
                    {doc.type?.toUpperCase().slice(0, 3) || "DOC"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* User */}
        <div className="sidebar-bottom">
          <div className="user-row">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-[30px] h-[30px]",
                },
              }}
            />
            {user && (
              <div>
                <div className="user-name">
                  {user.fullName || user.firstName || "User"}
                </div>
                <div className="user-email">
                  {user.primaryEmailAddress?.emailAddress || ""}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
