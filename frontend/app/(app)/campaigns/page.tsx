"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../../lib/api";

interface Campaign {
  id: string;
  name: string;
  status: string;
  clientName: string;
  contactsCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/clean-mvp/campaigns`);
      if (!res.ok) throw new Error(`${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await fetch(`${API_URL}/clean-mvp/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Кампании</h1>

      <form onSubmit={createCampaign} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Название кампании"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: "6px 8px", fontSize: 14, flex: 1, maxWidth: 320 }}
        />
        <button type="submit" style={{ padding: "6px 14px", fontSize: 14 }}>
          Создать
        </button>
      </form>

      {loading ? (
        <p>Загрузка…</p>
      ) : error ? (
        <p style={{ color: "red" }}>Ошибка: {error}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#666" }}>Пока нет кампаний. Создайте первую.</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f4f4f5" }}>
              <th>Название</th>
              <th>Клиент</th>
              <th>Статус</th>
              <th>Контактов</th>
              <th>Создана</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/campaigns/${c.id}/contacts`} style={{ color: "blue", textDecoration: "underline" }}>
                    {c.name}
                  </Link>
                </td>
                <td>{c.clientName}</td>
                <td>{c.status}</td>
                <td>{c.contactsCount}</td>
                <td style={{ color: "#666" }}>{new Date(c.createdAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}