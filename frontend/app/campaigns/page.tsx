"use client";

import { type CSSProperties, type ChangeEvent, useMemo, useState } from "react";

type Campaign = {
  name: string;
  channel: "Email" | "Paid Search" | "Social" | "Webinar";
  status: "Draft" | "Active" | "Paused" | "Completed";
  audience: string;
  budget: number;
  leads: number;
  startDate: string;
};

const initialCampaigns: Campaign[] = [
  {
    name: "June Product Trial",
    channel: "Email",
    status: "Active",
    audience: "SaaS founders",
    budget: 2400,
    leads: 186,
    startDate: "2026-06-03",
  },
  {
    name: "Central Asia Growth",
    channel: "Paid Search",
    status: "Paused",
    audience: "Retail operators",
    budget: 5100,
    leads: 94,
    startDate: "2026-05-28",
  },
  {
    name: "Retention Playbook",
    channel: "Webinar",
    status: "Draft",
    audience: "Customer success teams",
    budget: 1200,
    leads: 0,
    startDate: "2026-07-02",
  },
  {
    name: "Founder Stories",
    channel: "Social",
    status: "Completed",
    audience: "Early-stage startups",
    budget: 1800,
    leads: 221,
    startDate: "2026-05-10",
  },
];

const campaignChannels = ["Email", "Paid Search", "Social", "Webinar"] as const;
const campaignStatuses = ["Draft", "Active", "Paused", "Completed"] as const;
const channels = ["All", ...campaignChannels] as const;
const statuses = ["All", ...campaignStatuses] as const;

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

function toNumber(value: string | undefined) {
  const parsed = Number((value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function campaignsFromCsv(text: string): Campaign[] {
  const [headers = [], ...rows] = parseCsv(text);
  const indexes = new Map(headers.map((header, index) => [normalize(header), index]));

  return rows.map((row) => ({
    name: row[indexes.get("name") ?? 0] || "Untitled campaign",
    channel: pick(row[indexes.get("channel") ?? 1], campaignChannels, "Email"),
    status: pick(row[indexes.get("status") ?? 2], campaignStatuses, "Draft"),
    audience: row[indexes.get("audience") ?? 3] || "General audience",
    budget: toNumber(row[indexes.get("budget") ?? 4]),
    leads: toNumber(row[indexes.get("leads") ?? 5]),
    startDate: row[indexes.get("startdate") ?? 6] || new Date().toISOString().slice(0, 10),
  }));
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<(typeof channels)[number]>("All");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [uploadMessage, setUploadMessage] = useState("CSV: name,channel,status,audience,budget,leads,startDate");

  const filteredCampaigns = useMemo(() => {
    const search = query.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch = [campaign.name, campaign.channel, campaign.audience]
        .join(" ")
        .toLowerCase()
        .includes(search);
      const matchesChannel = channel === "All" || campaign.channel === channel;
      const matchesStatus = status === "All" || campaign.status === status;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [campaigns, channel, query, status]);

  const totals = useMemo(
    () =>
      filteredCampaigns.reduce(
        (summary, campaign) => ({
          budget: summary.budget + campaign.budget,
          leads: summary.leads + campaign.leads,
        }),
        { budget: 0, leads: 0 },
      ),
    [filteredCampaigns],
  );

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imported = campaignsFromCsv(await file.text());
    setCampaigns((current) => [...imported, ...current]);
    setUploadMessage(`Imported ${imported.length} campaigns from ${file.name}`);
    event.target.value = "";
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CRM</p>
          <h1 style={styles.title}>Campaigns</h1>
        </div>
        <label style={styles.uploadButton}>
          Upload CSV
          <input accept=".csv,text/csv" onChange={handleUpload} style={styles.fileInput} type="file" />
        </label>
      </section>

      <section style={styles.toolbar}>
        <input
          aria-label="Search campaigns"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by campaign, channel, audience"
          style={styles.search}
          value={query}
        />
        <select aria-label="Filter by channel" onChange={(event) => setChannel(event.target.value as typeof channel)} style={styles.select} value={channel}>
          {channels.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select aria-label="Filter by status" onChange={(event) => setStatus(event.target.value as typeof status)} style={styles.select} value={status}>
          {statuses.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </section>

      <div style={styles.meta}>
        <span>{filteredCampaigns.length} of {campaigns.length} campaigns</span>
        <span>Budget ${totals.budget.toLocaleString()} · {totals.leads.toLocaleString()} leads</span>
        <span>{uploadMessage}</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Campaign</th>
              <th style={styles.th}>Channel</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Audience</th>
              <th style={styles.th}>Budget</th>
              <th style={styles.th}>Leads</th>
              <th style={styles.th}>Start date</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.map((campaign) => (
              <tr key={`${campaign.name}-${campaign.startDate}`}>
                <td style={styles.td}><strong>{campaign.name}</strong></td>
                <td style={styles.td}>{campaign.channel}</td>
                <td style={styles.td}><span style={styles.badge}>{campaign.status}</span></td>
                <td style={styles.td}>{campaign.audience}</td>
                <td style={styles.td}>${campaign.budget.toLocaleString()}</td>
                <td style={styles.td}>{campaign.leads.toLocaleString()}</td>
                <td style={styles.td}>{campaign.startDate}</td>
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
    background: "#1d4ed8",
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
    minWidth: "980px",
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
  badge: {
    background: "#eaf1ff",
    border: "1px solid #c9d8ff",
    borderRadius: "999px",
    color: "#1d4ed8",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 800,
    padding: "4px 9px",
  },
};
