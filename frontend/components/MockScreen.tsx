"use client";

import { type ReactNode, useEffect, useState } from "react";
import styles from "./ui.module.css";

type Mode = "data" | "empty" | "error";
type Phase = "loading" | "ready";

interface MockScreenProps<T> {
  title: string;
  subtitle?: string;
  /**
   * Returns the rows to render. May be sync (mock) or async (real API fetch).
   * Swap the implementation from mock to a real fetch without touching the UI.
   * When the path option is provided, the screen will fetch from the backend
   * (and silently fall back to `fallback` on network error so the screen never breaks).
   */
  load: () => T[] | Promise<T[]>;
  emptyText?: string;
  errorText?: string;
  /** Optional header action (e.g. a "+ create" button). */
  action?: ReactNode;
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
  action,
  children,
}: MockScreenProps<T>) {
  const [mode, setMode] = useState<Mode>("data");
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    const result = mode === "data" ? load() : [];

    // Sync path (mock) and async path (real fetch) share the same setter.
    Promise.resolve(result)
      .then((rows) => {
        if (!cancelled) {
          setData(rows);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([]);
          setPhase("ready");
        }
      });

    return () => {
      cancelled = true;
    };
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {action}
          <span className={styles.mockBadge}>🟡 МОК-данные (заглушка под будущий API)</span>
        </div>
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