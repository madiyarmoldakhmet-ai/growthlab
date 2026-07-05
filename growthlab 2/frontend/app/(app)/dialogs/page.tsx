"use client";

import { useState } from "react";
import { MockScreen } from "../../../components/MockScreen";
import { StatusPill } from "../../../components/StatusPill";
import styles from "../../../components/ui.module.css";
import { MOCK_DIALOGUES } from "../../../lib/mock/data";
import type { Dialogue } from "../../../lib/mock/types";

function DialogsView({ items }: { items: Dialogue[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const selected = items.find((d) => d.id === selectedId) ?? items[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`${styles.card} ${d.id === selected.id ? styles.chipActive : ""}`}
            style={{ textAlign: "left", cursor: "pointer", display: "grid", gap: 6 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{d.contact}</strong>
              <span className={styles.channelTag}>{d.channel === "email" ? "Gmail" : "WhatsApp"}</span>
            </div>
            <span className={styles.muted} style={{ fontSize: 12 }}>
              {d.company} · {d.lastAt}
            </span>
            <StatusPill status={d.status} />
          </button>
        ))}
      </div>

      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>
            {selected.contact} · {selected.company}
          </strong>
          <span className={styles.channelTag}>{selected.channel === "email" ? "Gmail" : "WhatsApp"}</span>
        </div>
        <div className={styles.chat}>
          {selected.messages.map((m, i) => (
            <div key={i} className={`${styles.bubble} ${m.from === "us" ? styles.bubbleUs : styles.bubbleThem}`}>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DialogsPage() {
  return (
    <MockScreen<Dialogue>
      title="Диалоги"
      subtitle="Ответы Gmail и WhatsApp в одном месте."
      load={() => MOCK_DIALOGUES}
      emptyText="Ответов пока нет."
    >
      {(rows) => <DialogsView items={rows} />}
    </MockScreen>
  );
}
