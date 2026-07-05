"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MVP_NAV } from "../lib/nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside
        style={{
          width: 200,
          background: "#f4f4f5",
          borderRight: "1px solid #ddd",
          padding: "16px 12px",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>GrowthLab</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
          {MVP_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: "block",
                    padding: "8px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    color: active ? "#fff" : "#222",
                    background: active ? "#111" : "transparent",
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}