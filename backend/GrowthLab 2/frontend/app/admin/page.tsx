"use client";

import { type ChangeEvent, type CSSProperties, useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

const testMessage = "GrowthLab test passed. Delivery check completed.";
const tokenKey = "growthlab.adminToken";

type DeliveryResult = {
  channel: "whatsapp" | "email";
  recipient: string;
  status: "sent" | "failed" | "skipped";
  detail?: string;
};

type TestResponse = {
  message: string;
  results: DeliveryResult[];
  totalContacts?: number;
  eligibleContacts?: number;
};

type Overview = {
  contacts: number;
  campaigns: number;
  messages: number;
  responses: number;
  gmailConfigured: boolean;
  aiConfigured: boolean;
  whatsapp: {
    status: string;
    qr?: string;
    lastDisconnectReason?: string;
  };
};

type InboxItem = {
  id: string;
  channel: string;
  from?: string;
  contact?: string;
  campaign?: string;
  body?: string;
  receivedAt: string | number;
  source: "database" | "whatsapp_memory";
};

export default function AdminPage() {
  const [email, setEmail] = useState("admin@growthlab.local");
  const [password, setPassword] = useState("admin");
  const [token, setToken] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState(testMessage);
  const [aiProduct, setAiProduct] = useState("GrowthLab");
  const [aiAudience, setAiAudience] = useState("potential customers");
  const [aiGoal, setAiGoal] = useState("get a reply and offer a short call");
  const [aiTone, setAiTone] = useState("friendly and concise");
  const [whatsappTo, setWhatsappTo] = useState("87471523427");
  const [emailTo, setEmailTo] = useState("libmusor@gmail.com");
  const [result, setResult] = useState<TestResponse | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [pairingPhone, setPairingPhone] = useState("87471523427");
  const [pairingCode, setPairingCode] = useState("");
  const [status, setStatus] = useState("Log in first, then the send controls will unlock.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(tokenKey);

    if (!savedToken) {
      return;
    }

    setToken(savedToken);
    void refresh(savedToken).catch(() => {
      window.localStorage.removeItem(tokenKey);
      setToken("");
      setStatus("Session expired. Log in again.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login() {
    setBusy(true);
    setStatus("Logging in...");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = (await response.json()) as { accessToken: string };
      window.localStorage.setItem(tokenKey, data.accessToken);
      setToken(data.accessToken);
      setStatus("Logged in.");
      await refresh(data.accessToken);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(tokenKey);
    setToken("");
    setOverview(null);
    setInbox([]);
    setStatus("Logged out.");
  }

  async function refresh(authToken = token) {
    if (!authToken) {
      setStatus("Log in first.");
      return;
    }

    const [overviewResponse, inboxResponse] = await Promise.all([
      fetch(`${API_URL}/admin/overview`, {
        headers: { authorization: `Bearer ${authToken}` },
      }),
      fetch(`${API_URL}/admin/inbox`, {
        headers: { authorization: `Bearer ${authToken}` },
      }),
    ]);

    if (!overviewResponse.ok) {
      throw new Error(`Overview failed: ${overviewResponse.status}`);
    }

    if (!inboxResponse.ok) {
      throw new Error(`Inbox failed: ${inboxResponse.status}`);
    }

    setOverview((await overviewResponse.json()) as Overview);
    setInbox(((await inboxResponse.json()) as { items: InboxItem[] }).items);
  }

  async function refreshFromButton() {
    setBusy(true);
    setStatus("Refreshing...");

    try {
      await refresh();
      setStatus("Refreshed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectWhatsApp() {
    setBusy(true);
    setStatus("Connecting WhatsApp...");

    try {
      const response = await fetch(`${API_URL}/whatsapp/connect`, { method: "POST" });

      if (!response.ok) {
        throw new Error(`WhatsApp connect failed: ${response.status}`);
      }

      await pollWhatsAppStatus();
      setStatus("WhatsApp connection requested. If status is connected, no QR is needed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "WhatsApp connect failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resetWhatsAppSession() {
    setBusy(true);
    setStatus("Resetting WhatsApp session...");

    try {
      const response = await fetch(`${API_URL}/whatsapp/reset-session`, { method: "POST" });

      if (!response.ok) {
        throw new Error(`WhatsApp reset failed: ${response.status}`);
      }

      await pollWhatsAppStatus();
      setStatus("Old WhatsApp session removed. Scan the QR if it is visible.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "WhatsApp reset failed.");
    } finally {
      setBusy(false);
    }
  }

  async function getPairingCode() {
    setBusy(true);
    setPairingCode("");
    setStatus("Requesting WhatsApp pairing code...");

    try {
      const response = await fetch(`${API_URL}/whatsapp/pairing-code`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber: pairingPhone }),
      });

      if (!response.ok) {
        throw new Error(`Pairing code failed: ${response.status}`);
      }

      const data = (await response.json()) as { code: string; phoneNumber: string };
      setPairingCode(data.code);
      setStatus(`Pairing code for ${data.phoneNumber}. Use WhatsApp linked devices -> link with phone number.`);
      await pollWhatsAppStatus();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pairing code failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pollWhatsAppStatus() {
    for (let index = 0; index < 12; index += 1) {
      await refresh();

      const response = await fetch(`${API_URL}/whatsapp/qr`);
      const qr = (await response.json()) as { status: string; qr?: string };

      if (qr.status === "qr" || qr.status === "connected" || qr.status === "logged_out") {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
  }

  function connectGmail() {
    setStatus("Opening Google OAuth...");
    window.location.href = `${API_URL}/gmail/oauth/start`;
  }

  async function generateAiText() {
    if (!token) {
      setStatus("Log in first, then AI generation will work.");
      return;
    }

    setBusy(true);
    setStatus("Generating AI message...");

    try {
      const response = await fetch(`${API_URL}/admin/generate-message`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          product: aiProduct,
          audience: aiAudience,
          goal: aiGoal,
          tone: aiTone,
          channel: "whatsapp",
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.status}`);
      }

      const data = (await response.json()) as { body: string; subject?: string };
      setMessage(data.body);
      setStatus("AI message generated and inserted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importContacts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setStatus(`Importing ${file.name}...`);

    try {
      const body = new FormData();
      body.append("file", file);
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const response = await fetch(`${API_URL}/contacts/import/${isExcel ? "excel" : "csv"}`, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      const data = (await response.json()) as { imported: number; skippedDuplicates: number };
      await refresh();
      setStatus(`Imported ${data.imported} contacts. Skipped duplicates: ${data.skippedDuplicates}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function syncGmailReplies() {
    setBusy(true);
    setStatus("Syncing Gmail replies...");

    try {
      const response = await fetch(`${API_URL}/admin/sync-gmail-replies`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Gmail sync failed: ${response.status}`);
      }

      const data = (await response.json()) as { scanned: number; created: number; skipped: number; detail?: string };
      await refresh();
      setStatus(data.detail ?? `Gmail sync: ${data.created} new, ${data.skipped} skipped from ${data.scanned} scanned.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gmail sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!token) {
      setStatus("Log in first, then Send Test will work.");
      return;
    }

    setBusy(true);
    setStatus("Sending test...");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/admin/test-delivery`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          whatsappTo,
          emailTo,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Send failed: ${response.status}`);
      }

      const data = (await response.json()) as TestResponse;
      setResult(data);
      await refresh();
      setStatus("Test request completed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendToContacts() {
    if (!token) {
      setStatus("Log in first, then Send To Contacts will work.");
      return;
    }

    setBusy(true);
    setStatus("Sending to contacts...");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/admin/send-to-contacts`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Send to contacts failed: ${response.status}`);
      }

      const data = (await response.json()) as TestResponse;
      setResult(data);
      await refresh();
      setStatus(`Sent to ${data.eligibleContacts ?? data.results.length} contacts with phone numbers.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Send to contacts failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>GrowthLab</p>
          <h1 style={styles.title}>Admin Panel</h1>
        </div>
        <div style={styles.actions}>
          <button disabled={!token || busy} onClick={refreshFromButton} style={styles.secondaryButton}>
            Refresh
          </button>
          {token ? (
            <button disabled={busy} onClick={logout} style={styles.secondaryButton}>
              Logout
            </button>
          ) : null}
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Admin Login</h2>
          <label style={styles.label}>
            Email
            <input onChange={(event) => setEmail(event.target.value)} style={styles.input} value={email} />
          </label>
          <label style={styles.label}>
            Password
            <input
              onChange={(event) => setPassword(event.target.value)}
              style={styles.input}
              type="password"
              value={password}
            />
          </label>
          <button disabled={busy} onClick={login} style={styles.primaryButton}>
            {token ? "Login Again" : "Login"}
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>System Status</h2>
          <dl style={styles.statusList}>
            <Status label="Contacts" value={overview?.contacts ?? "-"} />
            <Status label="Campaigns" value={overview?.campaigns ?? "-"} />
            <Status label="Messages" value={overview?.messages ?? "-"} />
            <Status label="Responses" value={overview?.responses ?? "-"} />
            <Status label="WhatsApp" value={overview?.whatsapp.status ?? "-"} />
            <Status label="Gmail" value={overview ? (overview.gmailConfigured ? "configured" : "missing env") : "-"} />
            <Status label="AI" value={overview ? (overview.aiConfigured ? "configured" : "fallback") : "-"} />
          </dl>
          <div style={styles.actions}>
            <button disabled={!token || busy} onClick={connectWhatsApp} style={styles.secondaryButton}>
              Connect WhatsApp
            </button>
            <button disabled={!token || busy} onClick={resetWhatsAppSession} style={styles.secondaryButton}>
              Reset WhatsApp QR
            </button>
            <button disabled={busy} onClick={connectGmail} style={styles.secondaryButton}>
              Connect Gmail
            </button>
            <button disabled={!token || busy} onClick={syncGmailReplies} style={styles.secondaryButton}>
              Sync Gmail Replies
            </button>
          </div>
          <div style={styles.pairingBox}>
            <input
              aria-label="WhatsApp phone for pairing"
              onChange={(event) => setPairingPhone(event.target.value)}
              placeholder="WhatsApp phone"
              style={styles.input}
              value={pairingPhone}
            />
            <button disabled={!token || busy} onClick={getPairingCode} style={styles.secondaryButton}>
              Get Pairing Code
            </button>
            {pairingCode ? <strong style={styles.pairingCode}>{pairingCode}</strong> : null}
          </div>
          {overview?.whatsapp.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="WhatsApp QR"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                overview.whatsapp.qr,
              )}`}
              style={styles.qr}
            />
          ) : null}
          {overview?.whatsapp.lastDisconnectReason ? (
            <p style={styles.warning}>{overview.whatsapp.lastDisconnectReason}</p>
          ) : null}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Test Delivery</h2>
        <div style={styles.aiGrid}>
          <input
            aria-label="AI product"
            onChange={(event) => setAiProduct(event.target.value)}
            placeholder="Product"
            style={styles.input}
            value={aiProduct}
          />
          <input
            aria-label="AI audience"
            onChange={(event) => setAiAudience(event.target.value)}
            placeholder="Audience"
            style={styles.input}
            value={aiAudience}
          />
          <input
            aria-label="AI goal"
            onChange={(event) => setAiGoal(event.target.value)}
            placeholder="Goal"
            style={styles.input}
            value={aiGoal}
          />
          <input
            aria-label="AI tone"
            onChange={(event) => setAiTone(event.target.value)}
            placeholder="Tone"
            style={styles.input}
            value={aiTone}
          />
          <button disabled={!token || busy} onClick={generateAiText} style={styles.secondaryButton}>
            Generate AI Text
          </button>
        </div>
        <div style={styles.recipientGrid}>
          <div style={styles.recipient}>
            <span style={styles.recipientLabel}>WhatsApp</span>
            <input
              aria-label="Test WhatsApp recipient"
              onChange={(event) => setWhatsappTo(event.target.value)}
              style={styles.input}
              value={whatsappTo}
            />
          </div>
          <div style={styles.recipient}>
            <span style={styles.recipientLabel}>Email</span>
            <input
              aria-label="Test email recipient"
              onChange={(event) => setEmailTo(event.target.value)}
              style={styles.input}
              value={emailTo}
            />
          </div>
        </div>
        <label style={styles.label}>
          Message
          <textarea
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            style={styles.textarea}
            value={message}
          />
        </label>
        <div style={styles.actions}>
          <button disabled={busy} onClick={sendTest} style={token ? styles.primaryButton : styles.disabledButton}>
            {token ? "Send Test" : "Login Required"}
          </button>
          <label style={styles.uploadButton}>
            Import Base CSV/XLSX
            <input accept=".csv,.xlsx,.xls,text/csv" onChange={importContacts} style={styles.fileInput} type="file" />
          </label>
          <button disabled={!token || busy} onClick={sendToContacts} style={styles.secondaryButton}>
            Send To Contacts
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Result</h2>
        <p style={styles.status}>{status}</p>
        {result ? (
          <div style={styles.results}>
            <p style={styles.messagePreview}>{result.message}</p>
            {result.totalContacts !== undefined ? (
              <p style={styles.status}>
                Contacts: {result.totalContacts}; with phone: {result.eligibleContacts ?? 0}
              </p>
            ) : null}
            {result.results.map((item, index) => (
              <div key={`${item.channel}-${item.recipient}-${item.detail ?? index}`} style={styles.resultRow}>
                <strong>{item.channel}</strong>
                <span>{item.recipient}</span>
                <span style={item.status === "sent" ? styles.sent : styles.failed}>{item.status}</span>
                <span style={styles.detail}>{item.detail}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Replies Inbox</h2>
        {inbox.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Channel</th>
                  <th style={styles.th}>From</th>
                  <th style={styles.th}>Message</th>
                  <th style={styles.th}>Received</th>
                </tr>
              </thead>
              <tbody>
                {inbox.map((item) => (
                  <tr key={`${item.source}-${item.id}`}>
                    <td style={styles.td}>{item.channel}</td>
                    <td style={styles.td}>{item.contact ?? item.from ?? "-"}</td>
                    <td style={styles.td}>{item.body ?? "-"}</td>
                    <td style={styles.td}>{formatDate(item.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={styles.status}>No replies yet. WhatsApp replies appear while the backend is running; Gmail replies appear after OAuth and sync.</p>
        )}
      </section>
    </main>
  );
}

function Status({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statusItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDate(value: string | number) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f7f8fb",
    color: "#172033",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: "16px",
    justifyContent: "space-between",
    marginBottom: "22px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  eyebrow: {
    color: "#516175",
    fontSize: "13px",
    fontWeight: 800,
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "34px",
    lineHeight: 1.1,
    margin: 0,
  },
  grid: {
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    marginBottom: "16px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #dfe5ee",
    borderRadius: "8px",
    display: "grid",
    gap: "14px",
    marginBottom: "16px",
    padding: "18px",
  },
  cardTitle: {
    fontSize: "18px",
    margin: 0,
  },
  label: {
    color: "#526074",
    display: "grid",
    fontSize: "13px",
    fontWeight: 700,
    gap: "7px",
  },
  input: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    color: "#172033",
    padding: "10px 12px",
  },
  textarea: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    color: "#172033",
    padding: "10px 12px",
    resize: "vertical",
  },
  primaryButton: {
    background: "#1d4ed8",
    border: 0,
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "11px 16px",
    width: "fit-content",
  },
  disabledButton: {
    background: "#e2e8f0",
    border: 0,
    borderRadius: "8px",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: 800,
    padding: "11px 16px",
    width: "fit-content",
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#172033",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  uploadButton: {
    background: "#166534",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 800,
    padding: "10px 14px",
  },
  fileInput: {
    display: "none",
  },
  statusList: {
    display: "grid",
    gap: "9px",
    margin: 0,
  },
  statusItem: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  recipientGrid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  aiGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  },
  recipient: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    display: "grid",
    gap: "5px",
    padding: "12px",
  },
  recipientLabel: {
    color: "#637083",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  status: {
    color: "#526074",
    margin: 0,
  },
  warning: {
    color: "#b45309",
    fontSize: "13px",
    margin: 0,
  },
  qr: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    height: "240px",
    width: "240px",
  },
  pairingBox: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  pairingCode: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    color: "#166534",
    fontSize: "24px",
    letterSpacing: "2px",
    padding: "8px 12px",
  },
  results: {
    display: "grid",
    gap: "10px",
  },
  messagePreview: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    margin: 0,
    padding: "12px",
  },
  resultRow: {
    alignItems: "center",
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "100px minmax(160px, 1fr) 80px minmax(180px, 2fr)",
  },
  sent: {
    color: "#166534",
    fontWeight: 800,
  },
  failed: {
    color: "#b91c1c",
    fontWeight: 800,
  },
  detail: {
    color: "#637083",
    fontSize: "13px",
  },
  tableWrap: {
    border: "1px solid #dfe5ee",
    borderRadius: "8px",
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    minWidth: "760px",
    width: "100%",
  },
  th: {
    background: "#eef2f7",
    borderBottom: "1px solid #dfe5ee",
    color: "#526074",
    fontSize: "12px",
    fontWeight: 800,
    padding: "12px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  td: {
    borderBottom: "1px solid #edf1f6",
    fontSize: "14px",
    padding: "12px",
    verticalAlign: "top",
  },
};
