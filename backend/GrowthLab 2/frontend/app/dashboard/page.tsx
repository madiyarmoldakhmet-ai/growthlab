import styles from "./dashboard.module.css";

const stats = [
  {
    label: "Активные кампании",
    value: "12",
    delta: "+18%",
    tone: "good",
  },
  {
    label: "Лиды за неделю",
    value: "486",
    delta: "+32%",
    tone: "good",
  },
  {
    label: "Конверсия",
    value: "14.8%",
    delta: "+2.4%",
    tone: "good",
  },
  {
    label: "Ожидают ответа",
    value: "37",
    delta: "-9%",
    tone: "warn",
  },
];

const cards = [
  {
    title: "Воронка продаж",
    value: "1 284",
    caption: "Новых касаний за месяц",
    progress: 72,
  },
  {
    title: "WhatsApp рассылки",
    value: "8 940",
    caption: "Доставлено сообщений",
    progress: 86,
  },
  {
    title: "Кампании",
    value: "5",
    caption: "Запланировано запусков",
    progress: 48,
  },
];

export default function DashboardPage() {
  return (
    <main className={styles.dashboard}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Dashboard</p>
          <h1>Панель управления</h1>
        </div>
        <div className={styles.period}>Сегодня</div>
      </section>

      <section className={styles.statsGrid} aria-label="Статистика">
        {stats.map((item) => (
          <article className={styles.statCard} key={item.label}>
            <span className={styles.statLabel}>{item.label}</span>
            <strong>{item.value}</strong>
            <span
              className={`${styles.delta} ${
                item.tone === "good" ? styles.deltaGood : styles.deltaWarn
              }`}
            >
              {item.delta}
            </span>
          </article>
        ))}
      </section>

      <section className={styles.cardsSection}>
        <div className={styles.sectionTitle}>
          <h2>Карточки</h2>
          <span>Ключевые показатели</span>
        </div>

        <div className={styles.cardsGrid}>
          {cards.map((card) => (
            <article className={styles.metricCard} key={card.title}>
              <div className={styles.cardTopline}>
                <h3>{card.title}</h3>
                <span>{card.progress}%</span>
              </div>
              <strong>{card.value}</strong>
              <p>{card.caption}</p>
              <div className={styles.progressTrack}>
                <span style={{ width: `${card.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
