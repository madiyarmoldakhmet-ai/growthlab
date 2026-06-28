"use client";

import { MockScreen } from "../../../components/MockScreen";
import styles from "../../../components/ui.module.css";
import { MOCK_CAMPAIGNS } from "../../../lib/mock/data";
import type { Campaign } from "../../../lib/mock/types";

const STATUS_LABEL: Record<Campaign["status"], string> = {
  draft: "черновик",
  active: "активна",
  paused: "на паузе",
  completed: "завершена",
};

const STATUS_STYLE: Record<Campaign["status"], { bg: string; fg: string }> = {
  draft: { bg: "#eef1f6", fg: "#5b6677" },
  active: { bg: "#e2f5ef", fg: "#0d8a5f" },
  paused: { bg: "#fff4d6", fg: "#9a6a00" },
  completed: { bg: "#e6efff", fg: "#2d6cdf" },
};

const channelLabel = (c: Campaign["channel"]) =>
  c === "email" ? "Gmail" : c === "whatsapp" ? "WhatsApp" : "Email + WhatsApp";

export default function CampaignsPage() {
  return (
    <MockScreen<Campaign>
      title="Кампании"
      subtitle="Список кампаний: цель, канал, статус и результаты."
      load={() => MOCK_CAMPAIGNS}
      emptyText="Кампаний пока нет. Создайте первую (форма — в Блоке 3)."
    >
      {(rows) => (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Кампания</th>
              <th>Цель</th>
              <th>Канал</th>
              <th>Статус</th>
              <th>Отправлено</th>
              <th>Ответы</th>
              <th>Кв. лиды</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td className={styles.muted}>{c.goal}</td>
                <td>
                  <span className={styles.channelTag}>{channelLabel(c.channel)}</span>
                </td>
                <td>
                  <span
                    className={styles.pill}
                    style={{ background: STATUS_STYLE[c.status].bg, color: STATUS_STYLE[c.status].fg }}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td>{c.sent}</td>
                <td>{c.replied}</td>
                <td>{c.qualified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </MockScreen>
  );
}
