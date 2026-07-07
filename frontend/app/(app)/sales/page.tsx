"use client";

import { MockScreen } from "../../../components/MockScreen";
import styles from "../../../components/ui.module.css";
import { MOCK_SALES, formatTenge } from "../../../lib/mock/data";
import type { Sale } from "../../../lib/mock/types";

const STAGE_STYLE: Record<Sale["stage"], { bg: string; fg: string }> = {
  созвон: { bg: "#e6efff", fg: "#2d6cdf" },
  "follow-up": { bg: "#fff4d6", fg: "#9a6a00" },
  закрыто: { bg: "#e2f5ef", fg: "#0d8a5f" },
};

export default function SalesPage() {
  return (
    <MockScreen<Sale>
      title="Продажи"
      subtitle="Созвоны, follow-up и суммы сделок."
      load={() => MOCK_SALES}
      emptyText="Сделок пока нет."
    >
      {(rows) => {
        const total = rows.filter((s) => s.stage === "закрыто").reduce((sum, s) => sum + s.amount, 0);
        return (
          <>
            <div className={styles.card} style={{ marginBottom: 16 }}>
              <span className={styles.metric}>
                <span className={styles.muted}>Закрыто на</span>
                <span className={styles.metricValue} style={{ color: "#0d8a5f" }}>{formatTenge(total)}</span>
              </span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Компания</th>
                  <th>Этап</th>
                  <th>Сумма</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.company}</strong>
                    </td>
                    <td>
                      <span className={styles.pill} style={{ background: STAGE_STYLE[s.stage].bg, color: STAGE_STYLE[s.stage].fg }}>
                        {s.stage}
                      </span>
                    </td>
                    <td>{formatTenge(s.amount)}</td>
                    <td className={styles.muted}>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      }}
    </MockScreen>
  );
}
