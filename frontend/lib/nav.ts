// Clean MVP navigation — minimal sidebar.
export interface NavItem {
  href: string;
  label: string;
}

export const MVP_NAV: NavItem[] = [
  { href: "/", label: "Дашборд" },
  { href: "/campaigns", label: "Кампании" },
  { href: "/targeting", label: "Цели (База)" },
  { href: "/queue", label: "Очередь" },
  { href: "/accounts", label: "Аккаунты IG" },
  { href: "/ig-connect", label: "Привязка IG" },
  { href: "/demo", label: "DEMO Питч" },
];
