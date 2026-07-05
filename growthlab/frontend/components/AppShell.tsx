"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MVP_NAV } from "../lib/nav";
import styles from "./ui.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarBrand}>
          GROWLAB
        </Link>
        {MVP_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className={styles.sidebarFoot}>
          MVP-экраны · мок-данные.
          <br />
          Демо для клиента — на /demo.
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
