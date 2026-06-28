import Link from "next/link";
import { MVP_NAV } from "../lib/nav";

const featured = [
  { href: "/demo", label: "▶ Демо для клиента", description: "Презентация за 3–5 минут (сценарий, постановочные данные)." },
  { href: "/dashboard", label: "Dashboard", description: "Обзорные метрики (scaffold)." },
];

function Card({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <Link
      href={href}
      style={{
        background: "#ffffff",
        border: "1px solid #dfe5ee",
        borderRadius: "8px",
        display: "grid",
        gap: "8px",
        padding: "18px",
      }}
    >
      <strong>{label}</strong>
      {description ? (
        <span style={{ color: "#637083", fontSize: "14px", lineHeight: 1.45 }}>{description}</span>
      ) : null}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px", background: "#f7f8fb", color: "#172033" }}>
      <section style={{ display: "grid", gap: "24px", maxWidth: "960px" }}>
        <div>
          <p style={{ color: "#2d6cdf", fontSize: "13px", fontWeight: 800, margin: "0 0 8px" }}>GrowLab</p>
          <h1 style={{ fontSize: "38px", lineHeight: 1.1, margin: 0 }}>Workspace</h1>
        </div>

        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {featured.map((link) => (
            <Card key={link.href} {...link} />
          ))}
        </div>

        <div>
          <p style={{ color: "#637083", fontSize: "13px", fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase" }}>
            MVP-экраны (мок-данные)
          </p>
          <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {MVP_NAV.map((link) => (
              <Card key={link.href} href={link.href} label={link.label} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
