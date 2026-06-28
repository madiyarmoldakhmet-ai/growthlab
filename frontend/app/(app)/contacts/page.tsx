"use client";

import { MockScreen } from "../../../components/MockScreen";
import { StatusPill } from "../../../components/StatusPill";
import styles from "../../../components/ui.module.css";
import { MOCK_CONTACTS } from "../../../lib/mock/data";
import type { Contact } from "../../../lib/mock/types";

export default function ContactsPage() {
  return (
    <MockScreen<Contact>
      title="Контакты"
      subtitle="База лидов: каналы связи, статус, оценка качества."
      load={() => MOCK_CONTACTS}
      emptyText="Контактов нет. Импортируйте CSV или добавьте вручную (форма — в Блоке 3)."
    >
      {(rows) => (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Контакт</th>
              <th>Компания · роль</th>
              <th>Каналы</th>
              <th>Статус</th>
              <th>Качество</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <div className={styles.muted} style={{ fontSize: 12 }}>
                    {c.email}
                  </div>
                </td>
                <td>
                  {c.company}
                  <div className={styles.muted} style={{ fontSize: 12 }}>
                    {c.role}
                  </div>
                </td>
                <td>
                  <span className={styles.channelTag}>Email</span>
                  {c.whatsapp ? <span className={styles.channelTag} style={{ marginLeft: 4 }}>WhatsApp</span> : null}
                </td>
                <td>
                  <StatusPill status={c.status} />
                </td>
                <td className={styles.muted}>{c.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </MockScreen>
  );
}
