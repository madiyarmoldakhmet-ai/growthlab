"use client";

import { useState } from "react";
import Link from "next/link";
import { MockScreen } from "../../../components/MockScreen";
import styles from "../../../components/ui.module.css";
import { MOCK_MESSAGES } from "../../../lib/mock/data";
import type { MessageVersion } from "../../../lib/mock/types";

function MessagesView({ items }: { items: MessageVersion[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const selected = items.find((m) => m.id === selectedId) ?? items[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={`${styles.card} ${m.id === selected.id ? styles.chipActive : ""}`}
            style={{ textAlign: "left", cursor: "pointer", display: "grid", gap: 6 }}
          >
            <div>
              <span className={styles.channelTag}>{m.channel === "email" ? "Gmail" : "WhatsApp"}</span>
              <span className={styles.channelTag} style={{ marginLeft: 6 }}>{m.version}</span>
            </div>
            <strong style={{ fontSize: 14 }}>{m.name}</strong>
          </button>
        ))}
      </div>

      <div>
        <div className={styles.toolbarLabel} style={{ marginBottom: 8 }}>Предпросмотр перед отправкой</div>
        {selected.channel === "email" ? (
          <div className={styles.gmailPreview}>
            <div className={styles.gmailHead}>
              <div>
                <strong>Тема:</strong> {selected.subject}
              </div>
              <div className={styles.muted}>Gmail · от вашего прогретого ящика</div>
            </div>
            <div className={styles.gmailBody}>{selected.body}</div>
          </div>
        ) : (
          <div className={styles.waPreview}>
            <div className={styles.waBubble}>{selected.body}</div>
            <div className={styles.note} style={{ color: "#5b6677" }}>
              WhatsApp: вне 24-часового окна нужен одобренный шаблон. Обычный текст — только в ответ
              в течение 24 ч после сообщения клиента.
            </div>
          </div>
        )}
        <p className={styles.note}>Отправка отсюда — в Блоке 3. Сейчас это предпросмотр версии письма.</p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <MockScreen<MessageVersion>
      title="Сообщения"
      subtitle="Версии писем и предпросмотр Gmail / WhatsApp перед отправкой."
      load={() => MOCK_MESSAGES}
      emptyText="Сообщений нет. Создайте первое."
      action={<Link href="/messages/new" className={styles.headBtn}>+ Новое сообщение</Link>}
    >
      {(rows) => <MessagesView items={rows} />}
    </MockScreen>
  );
}
