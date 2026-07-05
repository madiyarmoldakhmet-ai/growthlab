"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../../../../../lib/api";

type ChannelType = "GMAIL" | "WHATSAPP" | "INSTAGRAM";

interface Contact {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  channelType: ChannelType;
  status: "NEW" | "QUEUED" | "SENT" | "REPLIED";
  createdAt: string;
}

export default function ContactsPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New-contact form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ig, setIg] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("GMAIL");

  // Inline send UI per contact
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [sendText, setSendText] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/clean-mvp/campaigns/${campaignId}/contacts`);
      if (!res.ok) throw new Error(`${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void reload(); }, [reload]);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/clean-mvp/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          fullName:
            channelType === "INSTAGRAM" ? ig.trim().replace(/^@/, "") || fullName.trim() : fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          channelType,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFullName(""); setEmail(""); setPhone(""); setIg("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function endpointFor(channel: ChannelType): string {
    if (channel === "GMAIL") return "send-email";
    if (channel === "WHATSAPP") return "send-whatsapp";
    return "send-instagram";
  }

  function contactDisplay(c: Contact): string {
    if (c.channelType === "GMAIL") return c.email ?? "—";
    if (c.channelType === "WHATSAPP") return c.phone ?? "—";
    return `@${c.fullName.replace(/^@/, "")}`;
  }

  function channelLabel(c: ChannelType): string {
    if (c === "GMAIL") return "Gmail";
    if (c === "WHATSAPP") return "WhatsApp";
    return "Instagram";
  }

  async function doSend(contact: Contact) {
    if (!sendText.trim()) return;
    setSendBusy(true);
    setFeedback(
      contact.channelType === "INSTAGRAM"
        ? "🤖 Отправляю через Puppeteer... открывается браузер, подождите."
        : "",
    );
    try {
      const endpoint = endpointFor(contact.channelType);
      const res = await fetch(`${API_URL}/clean-mvp/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, text: sendText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setFeedback("Отправлено ✓");
      // WhatsApp: open the wa.me link in a new tab.
      if (contact.channelType === "WHATSAPP" && json?.link) {
        window.open(json.link, "_blank", "noopener,noreferrer");
      }
      setSendFor(null);
      setSendText("");
      await reload();
    } catch (e) {
      setFeedback(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Link href="/campaigns" style={{ color: "blue" }}>← все кампании</Link>
      </div>
      <h1 style={{ marginTop: 0 }}>Контакты кампании</h1>

      {/* Add contact form */}
      <form
        onSubmit={addContact}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, auto))",
          gap: 8,
          alignItems: "end",
          marginBottom: 20,
          padding: 12,
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      >
        <label>
          Имя
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inp} required />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        </label>
        <label>
          Телефон
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inp} />
        </label>
        {channelType === "INSTAGRAM" && (
          <label>
            IG username (без @)
            <input value={ig} onChange={(e) => setIg(e.target.value)} style={inp} placeholder="target_user" />
          </label>
        )}
        <label>
          Канал
          <select
            value={channelType}
            onChange={(e) => setChannelType(e.target.value as ChannelType)}
            style={inp}
          >
            <option value="GMAIL">Gmail</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>
        </label>
        <button type="submit" style={{ padding: "6px 14px", fontSize: 14 }}>
          Добавить контакт
        </button>
      </form>

      {loading ? (
        <p>Загрузка…</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#666" }}>Контактов пока нет.</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              <th>Имя / @username</th>
              <th>Канал</th>
              <th>Контакт</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <>
                <tr key={c.id}>
                  <td>{c.fullName}</td>
                  <td>{channelLabel(c.channelType)}</td>
                  <td style={{ color: "#666" }}>{contactDisplay(c)}</td>
                  <td>{c.status}</td>
                  <td>
                    <button
                      onClick={() => { setSendFor(c.id); setSendText(""); setFeedback(""); }}
                      style={{ padding: "4px 10px", fontSize: 13 }}
                    >
                      Отправить
                    </button>
                  </td>
                </tr>
                {sendFor === c.id && (
                  <tr key={c.id + "-send"}>
                    <td colSpan={5} style={{ background: "#f9f9f9" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <textarea
                          rows={3}
                          placeholder={
                            c.channelType === "GMAIL"
                              ? "Текст письма…"
                              : c.channelType === "WHATSAPP"
                                ? "Текст WhatsApp…"
                                : "Текст сообщения в Instagram Direct…"
                          }
                          value={sendText}
                          onChange={(e) => setSendText(e.target.value)}
                          style={{ flex: 1, padding: 6, fontSize: 13, fontFamily: "inherit" }}
                        />
                        <button
                          onClick={() => doSend(c)}
                          disabled={sendBusy}
                          style={{ padding: "6px 14px", fontSize: 13 }}
                        >
                          {sendBusy
                            ? "…"
                            : c.channelType === "GMAIL"
                              ? "Отправить Email"
                              : c.channelType === "WHATSAPP"
                                ? "Открыть WhatsApp"
                                : "🤖 Отправить в IG"}
                        </button>
                        <button
                          onClick={() => { setSendFor(null); setFeedback(""); }}
                          style={{ padding: "6px 10px", fontSize: 13 }}
                        >
                          ✕
                        </button>
                      </div>
                      {feedback && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: feedback.startsWith("Ошибка") ? "red" : feedback.startsWith("🤖") ? "#b8860b" : "green",
                          }}
                        >
                          {feedback}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  display: "block",
  padding: "6px 8px",
  fontSize: 14,
  width: "100%",
  marginTop: 2,
};