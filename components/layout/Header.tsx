"use client";

import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  badge?: ReactNode;
  children?: ReactNode;
}

export default function Header({ title, badge, children }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="page-name">{title}</span>
        {badge}
      </div>
      <div className="topbar-right">{children}</div>
    </header>
  );
}
