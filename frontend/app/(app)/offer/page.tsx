"use client";

import { MockScreen } from "../../../components/MockScreen";
import styles from "../../../components/ui.module.css";
import { MOCK_OFFERS } from "../../../lib/mock/data";
import type { Offer } from "../../../lib/mock/types";

const FIELDS: { key: keyof Offer; label: string }[] = [
  { key: "product", label: "Что продаём" },
  { key: "audience", label: "Кому" },
  { key: "price", label: "Цена" },
  { key: "benefit", label: "Польза / результат" },
  { key: "nextStep", label: "Следующий шаг" },
];

export default function OfferPage() {
  return (
    <MockScreen<Offer>
      title="Оффер"
      subtitle="Что продаём, кому, по какой цене и какой следующий шаг."
      load={() => MOCK_OFFERS}
      emptyText="Оффер ещё не задан (форма — в Блоке 3)."
    >
      {(rows) => (
        <div className={styles.cardGrid}>
          {rows.map((offer) => (
            <div key={offer.id} className={styles.card} style={{ display: "grid", gap: 12 }}>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div className={styles.muted} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 15 }}>{offer[f.key]}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </MockScreen>
  );
}
