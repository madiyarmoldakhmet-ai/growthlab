"use client";

import { useState } from "react";
import { MockScreen } from "../../../components/MockScreen";
import styles from "../../../components/ui.module.css";
import { MOCK_AUTO_RESEARCH } from "../../../lib/mock/data";
import type { AutoResearchInsight } from "../../../lib/mock/types";

function InsightList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className={styles.card} style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 700, color }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function AutoResearchView({ insight }: { insight: AutoResearchInsight }) {
  const [decision, setDecision] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className={styles.cardGrid}>
        <InsightList title="✅ Что сработало" items={insight.worked} color="#0d8a5f" />
        <InsightList title="⚠️ Что не сработало" items={insight.failed} color="#a23a35" />
        <InsightList title="🛠 Что улучшить" items={insight.improve} color="#9a6a00" />
      </div>

      <div className={styles.card} style={{ display: "grid", gap: 12 }}>
        <strong>Предложение новой версии письма</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className={styles.muted} style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Текущая</div>
            <div className={styles.card} style={{ fontSize: 13, background: "#fbfcfe" }}>{insight.proposal.current}</div>
          </div>
          <div>
            <div className={styles.muted} style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Предложенная AI</div>
            <div className={styles.card} style={{ fontSize: 13, background: "#f3f9f6", borderColor: "#bfe3d3" }}>
              {insight.proposal.next}
            </div>
          </div>
        </div>

        <div className={styles.toolbar} style={{ margin: 0 }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setDecision("Принято: новая версия станет активной (мок — действие не выполняется).")}>
            Принять
          </button>
          <button className={styles.btn} onClick={() => setDecision("Открыт редактор для правок (мок — действие не выполняется).")}>
            Изменить
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setDecision("Отклонено: оставили текущую версию (мок — действие не выполняется).")}>
            Отклонить
          </button>
        </div>
        {decision ? <p className={styles.note}>{decision}</p> : null}
      </div>
    </div>
  );
}

export default function AutoResearchPage() {
  return (
    <MockScreen<AutoResearchInsight>
      title="Auto Research"
      subtitle="Что сработало, что нет, что улучшить — и предложение новой версии письма."
      load={() => [MOCK_AUTO_RESEARCH]}
      emptyText="Недостаточно данных для анализа — нужно больше отправок и ответов."
    >
      {(rows) => <AutoResearchView insight={rows[0]} />}
    </MockScreen>
  );
}
