"use client";

import { MockScreen } from "../../../components/MockScreen";
import { StatusPill } from "../../../components/StatusPill";
import styles from "../../../components/ui.module.css";
import { MOCK_QUEUE } from "../../../lib/mock/data";
import type { QueueItem } from "../../../lib/mock/types";

export default function QueuePage() {
  return (
    <MockScreen<QueueItem>
      title="Очередь отправки"
      subtitle="Кто ждёт, отправляется или упал с ошибкой. Ошибки — человеческим языком, не скрыты."
      load={() => MOCK_QUEUE}
      emptyText="Очередь пуста — всё отправлено."
    >
      {(rows) => (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Получатель</th>
              <th>Канал</th>
              <th>Статус</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id}>
                <td>
                  <strong>{q.to}</strong>
                  <div className={styles.muted} style={{ fontSize: 12 }}>
                    {q.company}
                  </div>
                </td>
                <td>
                  <span className={styles.channelTag}>{q.channel === "email" ? "Gmail" : "WhatsApp"}</span>
                </td>
                <td>
                  <StatusPill status={q.status} />
                </td>
                <td style={{ color: q.error ? "#a23a35" : "#8a94a6", maxWidth: 420 }}>
                  {q.error ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </MockScreen>
  );
}
