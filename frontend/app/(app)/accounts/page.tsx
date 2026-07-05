"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";

interface SendingAccount {
  id: string;
  platform: string;
  identifier: string;
  status: string;
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [cookies, setCookies] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/clean-mvp/accounts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAccounts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !cookies.trim()) return;
    setBusy(true);
    setInfo("");
    setError("");
    try {
      const res = await fetch(`${API_URL}/clean-mvp/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim().replace(/^@/, ""),
          sessionCookies: cookies.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
      setInfo(`Аккаунт @${json.identifier} привязан ✓`);
      setIdentifier("");
      setCookies("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Аккаунты Instagram</h1>
      <p style={{ color: "#666", marginTop: -4, marginBottom: 16, fontSize: 14 }}>
        Привяжите Instagram-аккаунты для реальной рассылки в Direct через Puppeteer.
        Скопируйте куки из DevTools браузера (вкладка Application → Cookies → instagram.com)
        в формате JSON.
      </p>

      <form
        onSubmit={save}
        style={{
          display: "grid",
          gap: 10,
          padding: 16,
          border: "1px solid #ddd",
          background: "#fafafa",
          marginBottom: 24,
        }}
      >
        <label style={{ display: "block" }}>
          <span style={{ fontWeight: 600 }}>Username (без @)</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="например, growthlab_kz"
            style={inp}
            required
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ fontWeight: 600 }}>Ваши Cookies (вставьте из DevTools)</span>
          <textarea
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            placeholder='[{"name":"sessionid","value":"...","domain":".instagram.com", ...}]'
            rows={8}
            style={{ ...inp, fontFamily: "monospace", fontSize: 12 }}
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{ padding: "8px 16px", fontSize: 14, justifySelf: "start" }}
        >
          {busy ? "Сохраняю…" : "Привязать аккаунт"}
        </button>
        {info && <div style={{ color: "green", fontSize: 13 }}>{info}</div>}
        {error && <div style={{ color: "red", fontSize: 13 }}>Ошибка: {error}</div>}
      </form>

      <h2 style={{ fontSize: 18 }}>Привязанные аккаунты</h2>
      {loading ? (
        <p>Загрузка…</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: "#666" }}>Аккаунтов пока нет.</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              <th>Username</th>
              <th>Платформа</th>
              <th>Статус</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>@{a.identifier}</td>
                <td>{a.platform}</td>
                <td>{a.status === "ACTIVE" ? "✅ ACTIVE" : "⏸ PAUSED"}</td>
                <td style={{ color: "#666" }}>{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  marginTop: 4,
  boxSizing: "border-box",
};