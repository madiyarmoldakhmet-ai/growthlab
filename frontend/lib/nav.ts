// MVP navigation — shared by the sidebar (AppShell) and the home page.
export interface NavItem {
  href: string;
  label: string;
}

export const MVP_NAV: NavItem[] = [
  { href: "/campaigns", label: "Кампании" },
  { href: "/contacts", label: "Контакты" },
  { href: "/offer", label: "Оффер" },
  { href: "/messages", label: "Сообщения" },
  { href: "/queue", label: "Очередь" },
  { href: "/dialogs", label: "Диалоги" },
  { href: "/leads", label: "Лиды" },
  { href: "/sales", label: "Продажи" },
  { href: "/auto-research", label: "Auto Research" },
];
