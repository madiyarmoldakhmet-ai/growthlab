"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";

interface Contact {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  channelType: "GMAIL" | "WHATSAPP";
  status: "NEW" | "QUEUED" | "SENT" | "REPLIED";
  createdAt: string;
}

export default function QueuePage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/clean-mvp/queue`);
      if (!res.ok) throw new Error(`${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ marginTop: 0 }}>Очередь</h1>
        <button onClick={() => void reload()} style={{ padding: "6px 14px", fontSize: 14 }}>
          ↻ Обновить
        </button>
      </div>
      <p style={{ color: "#666" }}>
        Контакты со статусом ≠ NEW (которые были отправлены).
      </p>

      {loading ? (
        <p>Загрузка…</p>
      ) : error ? (
        <p style={{ color: "red" }}>Ошибка: {error}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#666" }}>
          Очередь пуста. Отправьте сообщение со страницы кампании.
        </p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              <th>Имя</th>
              <th>Канал</th>
              <th>Статус</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName}</td>
                <td>{c.channelType === "GMAIL" ? "Gmail" : "WhatsApp"}</td>
                <td>{c.status}</td>
                <td style={{ color: "#666" }}>{new Date(c.createdAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}