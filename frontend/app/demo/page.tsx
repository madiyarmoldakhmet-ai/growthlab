"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./demo.module.css";
import { STATUS_COLOR, STATUS_LABEL, type StatusKey } from "../../lib/statuses";
import {
  AUTO_RESEARCH,
  DEMO_CONTACTS,
  DEMO_DIALOGUES,
  DEMO_MESSAGES,
  formatTenge,
} from "../../lib/demo-data";

const STEPS = [
  { meta: "Шаг 1", title: "База из 100 контактов", subtitle: "Собрали и верифицировали целевые компании под ICP клиента." },
  { meta: "Шаг 2", title: "Сообщения: Gmail + WhatsApp", subtitle: "AI подготовил персональные письма. Статусы меняются в реальном времени." },
  { meta: "Шаг 3", title: "Шесть диалогов", subtitle: "Кликните на любой — система ведёт разные сценарии переписки." },
  { meta: "Шаг 4", title: "Качественный лид", subtitle: "Подсветили диалог с 15+ сообщениями — переводим в статус «Качественный лид»." },
  { meta: "Шаг 5", title: "Отдел продаж: созвон и follow-up", subtitle: "Лид передан менеджеру. Назначен созвон, отправлен follow-up." },
  { meta: "Шаг 6", title: "Сделка закрыта", subtitle: "Горячий экран финала." },
  { meta: "Шаг 7", title: "Auto Research: рост от теста к тесту", subtitle: "Система сама улучшает письма — выручка растёт на каждой итерации." },
  { meta: "Шаг 8", title: "Начать заново", subtitle: "Прогнать демо ещё раз." },
];

function StatusPill({ status }: { status: StatusKey }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className={styles.pill}
      style={{ background: `${c.bg}22`, color: c.fg, borderColor: `${c.fg}55` }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ChannelTag({ channel }: { channel: "gmail" | "whatsapp" }) {
  return (
    <span
      className={`${styles.channelTag} ${channel === "gmail" ? styles.channelGmail : styles.channelWa}`}
    >
      {channel === "gmail" ? "Gmail" : "WhatsApp"}
    </span>
  );
}

function useCountUp(target: number, active: boolean, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [activeDialogue, setActiveDialogue] = useState(5); // deep_call по умолчанию подсвечен
  const [flashIdx, setFlashIdx] = useState<number>(-1);

  // Шаг 2: анимация смены статусов
  useEffect(() => {
    if (step !== 1) return;
    setFlashIdx(-1);
    const id = setInterval(() => {
      setFlashIdx((prev) => (prev + 1) % DEMO_MESSAGES.length);
    }, 400);
    return () => clearInterval(id);
  }, [step]);

  const delivered = useCountUp(87, step === 1);
  const last = STEPS.length - 1;
  const current = STEPS[step];
  const dialogue = DEMO_DIALOGUES[activeDialogue];
  const hotDialogue = useMemo(() => DEMO_DIALOGUES.find((d) => d.isHotLead)!, []);

  const maxRevenue = Math.max(...AUTO_RESEARCH.map((r) => r.revenue));

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <span className={styles.brand}>GROWTHLAB</span>
          <span className={styles.demoBadge}>● DEMO · постановочные данные</span>
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

        <section key={step} className={styles.card}>
          <div>
            <p className={styles.stepMeta}>
              {current.meta} / {STEPS.length}
            </p>
            <h1 className={styles.stepTitle}>{current.title}</h1>
            <p className={styles.stepSubtitle}>{current.subtitle}</p>
          </div>

          {/* STEP 1 — 100 контактов */}
          {step === 0 && (
            <>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>100</div>
                  <div className={styles.metricLabel}>контактов в базе</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>100%</div>
                  <div className={styles.metricLabel}>верифицированы</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue}>2</div>
                  <div className={styles.metricLabel}>канала: Gmail + WhatsApp</div>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Имя</th>
                      <th>Компания</th>
                      <th>Роль</th>
                      <th>Канал</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_CONTACTS.map((c) => (
                      <tr key={c.id}>
                        <td className={styles.muted}>{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.company}</td>
                        <td className={styles.muted}>{c.role}</td>
                        <td>
                          <ChannelTag channel={c.channel} />
                        </td>
                        <td>
                          <StatusPill status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* STEP 2 — логи сообщений с анимацией */}
          {step === 1 && (
            <>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <div className={styles.metricValue} style={{ color: "#4c8dff" }}>
                    {delivered}/100
                  </div>
                  <div className={styles.metricLabel}>отправлено</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricValue} style={{ color: "#2dd4bf" }}>
                    ~85%
                  </div>
                  <div className={styles.metricLabel}>доставляемость</div>
                </div>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${delivered}%` }} />
              </div>
              <div className={styles.msgList}>
                {DEMO_MESSAGES.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`${styles.msgRow} ${i === flashIdx ? styles.msgRowFlash : ""}`}
                  >
                    <ChannelTag channel={msg.channel} />
                    <div style={{ overflow: "hidden" }}>
                      <strong style={{ fontSize: 13 }}>{msg.subject ?? msg.to}</strong>
                      <div className={styles.msgPreview}>{msg.preview}</div>
                    </div>
                    <StatusPill status={msg.status} />
                  </div>
                ))}
              </div>
              <p className={styles.muted}>
                Статусы двигаются: <em>ожидает → отправляется → отправлено → ответил</em>. Ошибки доставки видны, а не спрятаны.
              </p>
            </>
          )}

          {/* STEP 3 — 6 диалогов */}
          {step === 2 && (
            <>
              <div className={styles.dialogueGrid}>
                {DEMO_DIALOGUES.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDialogue(i)}
                    className={`${styles.dialogueCard} ${i === activeDialogue ? styles.dialogueCardActive : ""}`}
                  >
                    <ChannelTag channel={d.channel} />
                    <span className={styles.dialogueTitle}>{d.title}</span>
                    <StatusPill status={d.outcomeStatus} />
                  </button>
                ))}
              </div>
              <div className={styles.chat}>
                {dialogue.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`${styles.bubble} ${m.from === "system" ? styles.bubbleUs : styles.bubbleThem}`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <p className={styles.muted}>
                Исход: <strong>{dialogue.outcome}</strong>
              </p>
            </>
          )}

          {/* STEP 4 — подсветка горячего диалога → «Качественный лид» */}
          {step === 3 && (
            <>
              <div className={styles.dialogueGrid}>
                {DEMO_DIALOGUES.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDialogue(i)}
                    className={`${styles.dialogueCard} ${
                      i === activeDialogue ? styles.dialogueCardActive : ""
                    } ${d.isHotLead ? styles.dialogueCardHot : ""}`}
                  >
                    <ChannelTag channel={d.channel} />
                    <span className={styles.dialogueTitle}>{d.title}</span>
                    <span className={styles.muted}>{d.messages.length} сообщений</span>
                    <StatusPill status={d.isHotLead ? "qualified" : d.outcomeStatus} />
                  </button>
                ))}
              </div>
              <div className={styles.hotBanner}>
                <strong style={{ color: "#0de6a0" }}>
                  🔥 {hotDialogue.title} — {hotDialogue.messages.length} сообщений
                </strong>
                <span className={styles.muted}>
                  Статус изменён: <StatusPill status="qualified" /> · лид передан в отдел продаж.
                </span>
              </div>
            </>
          )}

          {/* STEP 5 — отдел продаж: созвон + follow-up */}
          {step === 4 && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className={styles.metric}>
                <strong style={{ color: "#4c8dff" }}>📅 Созвон — завтра, 15:00 (Алматы), Zoom</strong>
                <div className={styles.muted}>Айгерим Сапарова · KazRetail · обсуждение базы и старта</div>
              </div>
              <div className={styles.metric}>
                <strong style={{ color: "#2dd4bf" }}>✉️ Follow-up #1 — после звонка</strong>
                <div className={styles.muted}>Отправили коммерческое предложение и пример писем под нишу.</div>
              </div>
              <div className={styles.metric}>
                <strong style={{ color: "#fbbf24" }}>🔔 Напоминание — через 2 дня</strong>
                <div className={styles.muted}>Если нет ответа — мягкий пинг. Стоп — как только клиент ответил.</div>
              </div>
              <p className={styles.muted}>
                Все действия зафиксированы в карточке лида. Менеджер видит полный контекст переписки.
              </p>
            </div>
          )}

          {/* STEP 6 — ГОРЯЧИЙ ЭКРАН: сделка закрыта */}
          {step === 5 && (
            <div className={styles.saleCard}>
              <div className={styles.saleCheck}>✓</div>
              <div className={styles.saleLabel}>Сделка закрыта · KazRetail</div>
              <div className={styles.saleAmount}>$5,000</div>
              <div className={styles.saleSub} style={{ color: "#6ee7b7" }}>
                ≈ {formatTenge(2_500_000)}
              </div>
              <div className={styles.saleSub}>
                100 контактов → 7 ответов → 2 качественных лида → <strong>1 продажа</strong>
              </div>
            </div>
          )}

          {/* STEP 7 — Auto Research: таблица + график роста выручки */}
          {step === 6 && (
            <>
              <div className={styles.tableWrap} style={{ maxHeight: "none" }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Тест</th>
                      <th>Что улучшили</th>
                      <th>Ответы</th>
                      <th>Лиды</th>
                      <th>Продажи</th>
                      <th>Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUTO_RESEARCH.map((row, i) => (
                      <tr key={row.test}>
                        <td><strong>{row.test}</strong></td>
                        <td className={styles.muted}>{row.improved}</td>
                        <td className={i > 0 ? styles.growUp : ""}>{row.replies}</td>
                        <td className={i > 0 ? styles.growUp : ""}>{row.leads}</td>
                        <td className={i > 0 ? styles.growUp : ""}>{row.sales}</td>
                        <td className={i > 0 ? styles.growUp : ""}>{formatTenge(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.chart}>
                <strong style={{ fontSize: 13 }}>Рост выручки по итерациям</strong>
                {AUTO_RESEARCH.map((row) => (
                  <div key={row.test} className={styles.chartRow}>
                    <span className={styles.muted}>{row.test}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.chartBar}
                        style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className={styles.chartVal}>{formatTenge(row.revenue)}</span>
                  </div>
                ))}
              </div>
              <p className={styles.muted}>
                Система анализирует, что сработало, и сама предлагает улучшенную версию письма — цифры растут от теста к тесту.
              </p>
            </>
          )}

          {/* STEP 8 — начать заново */}
          {step === 7 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>↺</div>
              <h2 className={styles.stepTitle}>Готово!</h2>
              <p className={styles.muted} style={{ marginTop: 8 }}>
                Нажмите «Начать заново», чтобы прогнать демо с первого шага.
              </p>
            </div>
          )}
        </section>

        <div className={styles.footer}>
          <button
            className={styles.btn}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Назад
          </button>
          <span className={styles.muted}>
            {step + 1} / {STEPS.length}
          </span>
          {step < last ? (
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnNext}`}
              onClick={() => setStep((s) => Math.min(last, s + 1))}
            >
              Next →
            </button>
          ) : (
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnNext}`}
              onClick={() => {
                setStep(0);
                setActiveDialogue(5);
              }}
            >
              Начать заново ↺
            </button>
          )}
        </div>
      </div>
    </main>
  );
}