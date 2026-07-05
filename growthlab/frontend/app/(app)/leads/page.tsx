"use client";

import { MockScreen } from "../../../components/MockScreen";
import { StatusPill } from "../../../components/StatusPill";
import styles from "../../../components/ui.module.css";
import { MOCK_LEADS } from "../../../lib/mock/data";
import type { Lead } from "../../../lib/mock/types";

export default function LeadsPage() {
  return (
    <MockScreen<Lead>
      title="Лиды"
      subtitle="Качественные лиды и причина оценки: интерес, роль, вопросы, готовность к созвону."
      load={() => MOCK_LEADS}
      emptyText="Лидов пока нет — ждём ответы из кампаний."
    >
      {(rows) => (
        <div className={styles.cardGrid}>
          {rows.map((lead) => (
            <div key={lead.id} className={styles.card} style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{lead.name}</strong>
                  <div className={styles.muted} style={{ fontSize: 13 }}>
                    {lead.company}
                  </div>
                </div>
                <StatusPill status={lead.status} />
              </div>
              <div>
                <div className={styles.muted} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  Почему лид
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                  {lead.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </MockScreen>
  );
}
