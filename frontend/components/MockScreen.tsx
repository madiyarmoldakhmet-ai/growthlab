"use client";

import { type ReactNode, useEffect, useState } from "react";
import styles from "./ui.module.css";

type Mode = "data" | "empty" | "error";
type Phase = "loading" | "ready";

interface MockScreenProps<T> {
  title: string;
  subtitle?: string;
  /** Returns the mock rows. Swap this for a real API fetch later. */
  load: () => T[];
  emptyText?: string;
  errorText?: string;
  children: (data: T[]) => ReactNode;
}

/**
 * Wraps every MVP screen with: a clear MOCK badge, a state switcher (so all four
 * states — loading / data / empty / error — are demonstrable), and the data render.
 * Mock errors are shown in plain language, never hidden.
 */
export function MockScreen<T>({
  title,
  subtitle,
  load,
  emptyText = "Пока нет данных.",
  errorText = "Не удалось загрузить данные. Проверьте подключение и попробуйте снова.",
  children,
}: MockScreenProps<T>) {
  const [mode, setMode] = useState<Mode>("data");
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    setPhase("loading");
    const id = setTimeout(() => {
      setData(mode === "data" ? load() : []);
      setPhase("ready");
    }, 450);
    return () => clearTimeout(id);
    // load is stable per screen; re-run only when the demo mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const showEmpty = phase === "ready" && mode === "data" && data.length === 0;

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <span className={styles.mockBadge}>🟡 МОК-данные (заглушка под будущий API)</span>
      </div>

      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Состояние:</span>
        {(["data", "empty", "error"] as Mode[]).map((m) => (
          <button
            key={m}
            className={`${styles.chip} ${mode === m ? styles.chipActive : ""}`}
            onClick={() => setMode(m)}
          >
            {m === "data" ? "Данные" : m === "empty" ? "Пусто" : "Ошибка"}
          </button>
        ))}
      </div>

      {phase === "loading" ? (
        <div className={styles.state}>
          <div className={styles.spinner} />
          <span>Загрузка…</span>
        </div>
      ) : mode === "error" ? (
        <div className={`${styles.state} ${styles.stateError}`}>
          <strong>Ошибка</strong>
          <span>{errorText}</span>
        </div>
      ) : showEmpty ? (
        <div className={styles.state}>
          <strong>Пусто</strong>
          <span>{emptyText}</span>
        </div>
      ) : (
        children(data)
      )}
    </section>
  );
}
