"use client";

import { type CSSProperties, type ChangeEvent, useMemo, useState } from "react";

type Contact = {
  name: string;
  email: string;
  company: string;
  status: "New" | "Qualified" | "Nurture" | "Customer";
  source: "Website" | "Referral" | "LinkedIn" | "Event";
  owner: string;
  lastContacted: string;
};

const initialContacts: Contact[] = [
  {
    name: "Amina Sadykova",
    email: "amina@aurora.kz",
    company: "Aurora Retail",
    status: "Qualified",
    source: "Website",
    owner: "Nurik",
    lastContacted: "2026-06-19",
  },
  {
    name: "Timur Karimov",
    email: "timur@nomad.ai",
    company: "Nomad AI",
    status: "New",
    source: "LinkedIn",
    owner: "Dana",
    lastContacted: "2026-06-21",
  },
  {
    name: "Elena Petrova",
    email: "elena@northwind.io",
    company: "Northwind Labs",
    status: "Customer",
    source: "Referral",
    owner: "Nurik",
    lastContacted: "2026-06-12",
  },
  {
    name: "Miras Ibrayev",
    email: "miras@steppepay.com",
    company: "SteppePay",
    status: "Nurture",
    source: "Event",
    owner: "Aruzhan",
    lastContacted: "2026-06-08",
  },
];

const contactStatuses = ["New", "Qualified", "Nurture", "Customer"] as const;
const contactSources = ["Website", "Referral", "LinkedIn", "Event"] as const;
const statuses = ["All", ...contactStatuses] as const;
const sources = ["All", ...contactSources] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const match = allowed.find(
    (option) => normalize(option) === normalize(value ?? ""),
  );
  return match ?? fallback;
}

function contactsFromCsv(text: string): Contact[] {
  const [headers = [], ...rows] = parseCsv(text);
  const indexes = new Map(headers.map((header, index) => [normalize(header), index]));

  return rows.map((row) => ({
    name: row[indexes.get("name") ?? 0] || "Unnamed contact",
    email: row[indexes.get("email") ?? 1] || "",
    company: row[indexes.get("company") ?? 2] || "",
    status: pick(row[indexes.get("status") ?? 3], contactStatuses, "New"),
    source: pick(row[indexes.get("source") ?? 4], contactSources, "Website"),
    owner: row[indexes.get("owner") ?? 5] || "Unassigned",
    lastContacted: row[indexes.get("lastcontacted") ?? 6] || new Date().toISOString().slice(0, 10),
  }));
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [source, setSource] = useState<(typeof sources)[number]>("All");
  const [uploadMessage, setUploadMessage] = useState("CSV: name,email,company,status,source,owner,lastContacted");

  const filteredContacts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesSearch = [contact.name, contact.email, contact.company, contact.owner]
        .join(" ")
        .toLowerCase()
        .includes(search);
      const matchesStatus = status === "All" || contact.status === status;
      const matchesSource = source === "All" || contact.source === source;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [contacts, query, source, status]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imported = contactsFromCsv(await file.text());
    setContacts((current) => [...imported, ...current]);
    setUploadMessage(`Imported ${imported.length} contacts from ${file.name}`);
    event.target.value = "";
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CRM</p>
          <h1 style={styles.title}>Contacts</h1>
        </div>
        <label style={styles.uploadButton}>
          Upload CSV
          <input accept=".csv,text/csv" onChange={handleUpload} style={styles.fileInput} type="file" />
        </label>
      </section>

      <section style={styles.toolbar}>
        <input
          aria-label="Search contacts"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, company, owner"
          style={styles.search}
          value={query}
        />
        <select aria-label="Filter by status" onChange={(event) => setStatus(event.target.value as typeof status)} style={styles.select} value={status}>
          {statuses.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select aria-label="Filter by source" onChange={(event) => setSource(event.target.value as typeof source)} style={styles.select} value={source}>
          {sources.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </section>

      <div style={styles.meta}>
        <span>{filteredContacts.length} of {contacts.length} contacts</span>
        <span>{uploadMessage}</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Source</th>
              <th style={styles.th}>Owner</th>
              <th style={styles.th}>Last contacted</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => (
              <tr key={`${contact.email}-${contact.name}`}>
                <td style={styles.td}>
                  <strong>{contact.name}</strong>
                  <span style={styles.subtle}>{contact.email}</span>
                </td>
                <td style={styles.td}>{contact.company}</td>
                <td style={styles.td}><span style={styles.badge}>{contact.status}</span></td>
                <td style={styles.td}>{contact.source}</td>
                <td style={styles.td}>{contact.owner}</td>
                <td style={styles.td}>{contact.lastContacted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f7f8fb",
    color: "#172033",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
  },
  eyebrow: {
    color: "#637083",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: 0,
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "34px",
    lineHeight: 1.1,
    margin: 0,
  },
  uploadButton: {
    background: "#166534",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    padding: "11px 16px",
  },
  fileInput: {
    display: "none",
  },
  toolbar: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginBottom: "14px",
  },
  search: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "11px 12px",
  },
  select: {
    background: "#ffffff",
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "11px 12px",
  },
  meta: {
    color: "#637083",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "13px",
    gap: "12px",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  tableWrap: {
    background: "#ffffff",
    border: "1px solid #dfe5ee",
    borderRadius: "8px",
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    minWidth: "920px",
    width: "100%",
  },
  th: {
    background: "#eef2f7",
    borderBottom: "1px solid #dfe5ee",
    color: "#526074",
    fontSize: "12px",
    fontWeight: 800,
    padding: "13px 16px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  td: {
    borderBottom: "1px solid #edf1f6",
    fontSize: "14px",
    padding: "14px 16px",
    verticalAlign: "top",
  },
  subtle: {
    color: "#637083",
    display: "block",
    fontSize: "13px",
    marginTop: "4px",
  },
  badge: {
    background: "#e9f7ef",
    border: "1px solid #bfe7cd",
    borderRadius: "999px",
    color: "#166534",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 9px",
  },
};
