"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./demo.module.css";
import { STATUS_COLOR, STATUS_LABEL, type StatusKey } from "../../lib/statuses";
import {
  AUTO_RESEARCH,
  DEMO_FUNNEL,
  DIALOGUES,
  HANDOFF_LEADS,
  SAMPLE_CONTACTS,
  SAMPLE_MESSAGES,
  formatTenge,
} from "./demo-data";

const STEPS = [
  { meta: "Шаг 1", title: "База на 100 контактов", subtitle: "Собрали и верифицировали целевые компании под ICP клиента." },
  { meta: "Шаг 2", title: "Сообщения: Gmail + WhatsApp", subtitle: "AI подготовил персональные письма под каждую компанию." },
  { meta: "Шаг 3", title: "Отправка пошла", subtitle: "Статусы двигаются: ожидает → отправляется → отправлено." },
  { meta: "Шаг 4", title: "Первые ответы", subtitle: "Лиды начинают отвечать — фиксируем каждый ответ." },
  { meta: "Шаг 5", title: "6 разных диалогов", subtitle: "Как система ведёт разные сценарии переписки." },
  { meta: "Шаг 6", title: "Передача в отдел продаж", subtitle: "Качественные лиды уходят менеджеру с контекстом." },
  { meta: "Шаг 7", title: "Созвон и follow-up", subtitle: "Встреча назначена, дожимаем до решения." },
  { meta: "Шаг 8", title: "Продажа", subtitle: "Сделка закрыта." },
  { meta: "Шаг 9", title: "Auto Research: рост цифр", subtitle: "Система учится и улучшает результат от теста к тесту." },
];

function StatusPill({ status }: { status: StatusKey }) {
  const c = STATUS_COLOR[status];
  return (
    <span className={styles.pill} style={{ background: c.bg, color: c.fg }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function useCountUp(target: number, active: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 28));
    const id = setInterval(() => {
      current = Math.min(target, current + increment);
      setValue(current);
      if (current >= target) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [target, active]);
  return value;
}

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [activeDialogue, setActiveDialogue] = useState(0);

  const delivered = useCountUp(DEMO_FUNNEL.delivered, step === 2);
  const opened = useCountUp(DEMO_FUNNEL.opened, step === 2);
  const replied = useCountUp(DEMO_FUNNEL.replied, step === 3);
  const qualified = useCountUp(DEMO_FUNNEL.qualified, step === 3);

  const last = STEPS.length - 1;
  const current = STEPS[step];
  const dialogue = DIALOGUES[activeDialogue];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <span className={styles.brand}>GROWLAB</span>
          <span className={styles.demoBadge}>● DEMO / сценарий — постановочные данные, не реальная отправка</span>
          <Link href="/" className={styles.backLink}>
            ← в рабочее пространство
          </Link>
        </div>

        <div className={styles.progress}>
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index === step ? styles.dotActive : index < step ? styles.dotDone : ""}`}
            />
          ))}
        </div>

        <section className={styles.card}>
          <div>
            <p className={styles.stepMeta}>
              {current.meta} из {STEPS.length}
            </p>
            <h1 className={styles.stepTitle}>{current.title}</h1>
            <p className={styles.stepSubtitle}>{current.subtitle}</p>
          </div>

          {/* STEP 1 — contacts base */}
          {step === 0 && (
            <>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{DEMO_FUNNEL.contacts}</div>
                  <div className={styles.metricLabel}>контактов в базе</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>100%</div>
                  <div className={styles.metricLabel}>верифицированы</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>2</div>
                  <div className={styles.metricLabel}>канала: Email, WhatsApp</div>
                </div>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Компания</th>
                    <th>Роль</th>
                    <th>Канал</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_CONTACTS.map((c) => (
                    <tr key={c.email}>
                      <td>{c.name}</td>
                      <td>{c.company}</td>
                      <td className={styles.muted}>{c.role}</td>
                      <td>
                        <span className={styles.channelTag}>{c.channel === "email" ? "Email" : "WhatsApp"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.muted}>…и ещё {DEMO_FUNNEL.contacts - SAMPLE_CONTACTS.length} контактов.</p>
            </>
          )}

          {/* STEP 2 — generated messages */}
          {step === 1 && (
            <div style={{ display: "grid", gap: "10px" }}>
              {SAMPLE_MESSAGES.map((msg, i) => (
                <div key={i} className={styles.msgRow}>
                  <span className={styles.channelTag}>{msg.channel === "email" ? "Gmail" : "WhatsApp"}</span>
                  <div style={{ overflow: "hidden" }}>
                    <strong style={{ fontSize: 13 }}>{msg.subject ?? msg.to}</strong>
                    <div className={styles.msgPreview}>{msg.preview}</div>
                  </div>
                  <StatusPill status={msg.status} />
                </div>
              ))}
            </div>
          )}

          {/* STEP 3 — sending in motion */}
          {step === 2 && (
            <>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <div className={styles.metricValue} style={{ color: "#2d6cdf" }}>
                    {delivered}/{DEMO_FUNNEL.contacts}
                  </div>
                  <div className={styles.metricLabel}>отправлено</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>{opened}</div>
                  <div className={styles.metricLabel}>открыли</div>
                </div>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(delivered / DEMO_FUNNEL.contacts) * 100}%`, background: "#2d6cdf" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusPill status="queued" />
                <StatusPill status="sending" />
                <StatusPill status="sent" />
                <StatusPill status="failed" />
              </div>
              <p className={styles.muted}>
                Доставляемость ~{Math.round((DEMO_FUNNEL.delivered / DEMO_FUNNEL.contacts) * 100)}% — часть писем
                не дойдёт, и это нормально: ошибки доставки видны, а не спрятаны.
              </p>
            </>
          )}

          {/* STEP 4 — first replies */}
          {step === 3 && (
            <>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <div className={styles.metricValue} style={{ color: "#6b3fc0" }}>
                    {replied}
                  </div>
                  <div className={styles.metricLabel}>ответили</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue} style={{ color: "#9a6a00" }}>
                    {qualified}
                  </div>
                  <div className={styles.metricLabel}>качественных лида</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {SAMPLE_MESSAGES.filter((m) => m.status === "replied" || m.status === "interested").map((m, i) => (
                  <div key={i} className={styles.msgRow}>
                    <span className={styles.channelTag}>{m.channel === "email" ? "Gmail" : "WhatsApp"}</span>
                    <div className={styles.msgPreview}>{m.to}</div>
                    <StatusPill status={m.status} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP 5 — six dialogues */}
          {step === 4 && (
            <>
              <div className={styles.dialogueGrid}>
                {DIALOGUES.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDialogue(i)}
                    className={`${styles.dialogueCard} ${i === activeDialogue ? styles.dialogueCardActive : ""}`}
                  >
                    <span className={styles.channelTag}>{d.channel === "email" ? "Gmail" : "WhatsApp"}</span>
                    <span className={styles.dialogueTitle}>{d.title}</span>
                    <StatusPill status={d.outcomeStatus} />
                  </button>
                ))}
              </div>
              <div className={styles.chat}>
                {dialogue.messages.map((m, i) => (
                  <div key={i} className={`${styles.bubble} ${m.from === "us" ? styles.bubbleUs : styles.bubbleThem}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <p className={styles.muted}>
                Исход: <strong>{dialogue.outcome}</strong>
              </p>
            </>
          )}

          {/* STEP 6 — handoff to sales */}
          {step === 5 && (
            <div style={{ display: "grid", gap: 12 }}>
              {HANDOFF_LEADS.map((lead) => (
                <div key={lead.company} className={styles.msgRow} style={{ gridTemplateColumns: "1fr auto" }}>
                  <div>
                    <strong>
                      {lead.name} · {lead.company}
                    </strong>
                    <div className={styles.muted}>{lead.reason}</div>
                  </div>
                  <StatusPill status="qualified" />
                </div>
              ))}
              <p className={styles.muted}>Лиды переданы менеджеру вместе с историей переписки и контекстом.</p>
            </div>
          )}

          {/* STEP 7 — call + follow-up */}
          {step === 6 && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className={styles.metric}>
                <strong>📅 Созвон — завтра, 15:00 (Алматы), Zoom</strong>
                <div className={styles.muted}>KazRetail · Айгерим Сапарова · обсуждение базы и старта</div>
              </div>
              <div className={styles.metric}>
                <strong>✉️ Follow-up #1 — после звонка</strong>
                <div className={styles.muted}>Отправили коммерческое предложение и пример писем под нишу.</div>
              </div>
              <div className={styles.metric}>
                <strong>🔔 Напоминание — через 2 дня</strong>
                <div className={styles.muted}>Если нет ответа — мягкий пинг. Стоп — как только клиент ответил.</div>
              </div>
            </div>
          )}

          {/* STEP 8 — sale */}
          {step === 7 && (
            <div className={styles.saleCard}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Сделка закрыта · KazRetail</div>
              <div className={styles.saleAmount}>{formatTenge(2_500_000)}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                100 контактов → 7 ответов → 2 качественных лида → 1 продажа
              </div>
            </div>
          )}

          {/* STEP 9 — auto research growth */}
          {step === 8 && (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Тест</th>
                    <th>Что улучшили</th>
                    <th>Ответы</th>
                    <th>Кв. лиды</th>
                    <th>Продажи</th>
                    <th>Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {AUTO_RESEARCH.map((row, i) => (
                    <tr key={row.test}>
                      <td>
                        <strong>{row.test}</strong>
                      </td>
                      <td className={styles.muted}>{row.improved}</td>
                      <td className={i > 0 ? styles.growUp : ""}>{row.replies}</td>
                      <td className={i > 0 ? styles.growUp : ""}>{row.qualified}</td>
                      <td className={i > 0 ? styles.growUp : ""}>{row.sales}</td>
                      <td className={i > 0 ? styles.growUp : ""}>{formatTenge(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.muted}>
                Система анализирует, что сработало, и сама предлагает улучшенную версию письма — цифры растут от
                теста к тесту.
              </p>
            </>
          )}
        </section>

        <div className={styles.footer}>
          <button className={styles.btn} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Назад
          </button>
          <span className={styles.muted}>
            {step + 1} / {STEPS.length}
          </span>
          {step < last ? (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep((s) => Math.min(last, s + 1))}>
              Дальше →
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep(0)}>
              ↺ Заново
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
