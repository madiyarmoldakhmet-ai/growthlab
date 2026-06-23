import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard", description: "Overview metrics and campaign health." },
  { href: "/contacts", label: "Contacts", description: "Search, filter, and import contact CSV files." },
  { href: "/campaigns", label: "Campaigns", description: "Track campaign status, budgets, and leads." },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#f7f8fb",
        color: "#172033",
      }}
    >
      <section style={{ display: "grid", gap: "20px", maxWidth: "920px" }}>
        <div>
          <p style={{ color: "#2d6cdf", fontSize: "13px", fontWeight: 800, margin: "0 0 8px" }}>
            GrowthLab
          </p>
          <h1 style={{ fontSize: "38px", lineHeight: 1.1, margin: 0 }}>Workspace</h1>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              style={{
                background: "#ffffff",
                border: "1px solid #dfe5ee",
                borderRadius: "8px",
                display: "grid",
                gap: "8px",
                padding: "18px",
              }}
            >
              <strong>{link.label}</strong>
              <span style={{ color: "#637083", fontSize: "14px", lineHeight: 1.45 }}>
                {link.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
