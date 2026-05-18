"use client";

import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar.store";

interface HeaderProps {
  title: string;
  badge?: ReactNode;
  children?: ReactNode;
}

export default function Header({ title, badge, children }: HeaderProps) {
  const { toggle } = useSidebarStore();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="btn btn-icon btn-ghost mobile-menu-btn"
          onClick={toggle}
          aria-label="Open menu"
          id="sidebar-hamburger"
        >
          <Menu size={18} />
        </button>
        <span className="page-name">{title}</span>
        {badge}
      </div>
      <div className="topbar-right">{children}</div>
    </header>
  );
}
