"use client";

import { useState } from "react";
import { API_URL } from "../../../lib/api";

export default function IgConnectPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_URL}/instagram/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().replace(/^@/, ""), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(json?.message) ? json.message.join(", ") : json?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setFeedback({ kind: "ok", text: json?.message ?? `Аккаунт @${json.username} успешно привязан!` });
      setPassword("");
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Привязка Instagram аккаунтов</h1>
      <p style={{ color: "#666", marginTop: -4, marginBottom: 16, fontSize: 14 }}>
        Откроется видимое окно Chrome. Введите код из SMS, если Instagram запросит 2FA.
      </p>

      <form
        onSubmit={connect}
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #ddd",
          background: "#fafafa",
          maxWidth: 420,
        }}
      >
        <label style={{ display: "block" }}>
          <span style={{ fontWeight: 600 }}>Логин (без @)</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="например, growthlabcom"
            style={inp}
            required
            disabled={busy}
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ fontWeight: 600 }}>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inp}
            required
            disabled={busy}
          />
        </label>

        <p style={{ color: "red", fontSize: 13, margin: 0 }}>
          ВНИМАНИЕ: После нажатия откроется окно Chrome. Введите код из СМС, если Инстаграм запросит!
        </p>

        <button
          type="submit"
          disabled={busy}
          style={{ padding: "10px 18px", fontSize: 15, fontWeight: 600, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "⏳ Открываю Chrome… (до 60 сек)" : "🤖 Привязать аккаунт"}
        </button>

        {feedback && (
          <div
            style={{
              fontSize: 14,
              padding: 10,
              borderRadius: 6,
              background: feedback.kind === "ok" ? "#e6ffe6" : "#ffe6e6",
              color: feedback.kind === "ok" ? "#0a7d0a" : "#a00",
            }}
          >
            {feedback.text}
          </div>
        )}
      </form>
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