"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Input, Select, TextArea, SavedBanner } from "../../../../components/form";
import styles from "../../../../components/ui.module.css";

type Channel = "email" | "whatsapp";
type WaContext = "reply" | "cold";

const RECIPIENTS = [
  "Айгерим Сапарова · KazRetail",
  "Дмитрий Орлов · LogiPro",
  "Ольга Беляева · MedLink",
  "Группа: вся кампания «KazRetail — выход на сети»",
];

export default function NewMessagePage() {
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [version, setVersion] = useState("v1");
  const [recipient, setRecipient] = useState(RECIPIENTS[0]);
  const [waContext, setWaContext] = useState<WaContext>("reply");
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [saved, setSaved] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: { subject?: string; body?: string } = {};
    if (channel === "email" && !subject.trim()) next.subject = "Для Gmail нужна тема";
    if (!body.trim()) next.body = "Введите текст сообщения";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaved("Черновик сохранён локально (мок). Реальная отправка — на стороне backend (по умолчанию DRY_RUN: письма не уходят).");
  };

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>Новое сообщение</h1>
          <p className={styles.subtitle}>Канал, текст, версия, получатель — и предпросмотр перед отправкой.</p>
        </div>
        <span className={styles.mockBadge}>🟡 МОК — отправка через backend (DRY_RUN)</span>
      </div>

      {saved ? <div style={{ marginBottom: 16 }}><SavedBanner>{saved}</SavedBanner></div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Editor */}
        <form className={styles.form} onSubmit={submit} noValidate style={{ maxWidth: "none" }}>
          <Field label="Канал" required>
            <Select value={channel} onChange={(e: ChangeEvent<HTMLSelectElement>) => setChannel(e.target.value as Channel)}>
              <option value="email">Email (Gmail)</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </Field>

          {channel === "email" ? (
            <Field label="Тема (Gmail)" required error={errors.subject}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} invalid={!!errors.subject} placeholder="Идея по лидам для компании" />
            </Field>
          ) : null}

          <Field label="Текст" required error={errors.body} hint={`${body.length} символов`}>
            <TextArea value={body} onChange={(e) => setBody(e.target.value)} invalid={!!errors.body} placeholder="Персональный текст под получателя" />
          </Field>

          <div className={styles.formGrid2}>
            <Field label="Версия">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" />
            </Field>
            <Field label="Кому">
              <Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                {RECIPIENTS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>

          {channel === "whatsapp" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <span className={styles.fieldLabel}>Контекст WhatsApp</span>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="radio" name="wa" checked={waContext === "reply"} onChange={() => setWaContext("reply")} />
                Ответ в течение 24 ч после сообщения клиента
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="radio" name="wa" checked={waContext === "cold"} onChange={() => setWaContext("cold")} />
                Холодное / вне 24-часового окна
              </label>
              {waContext === "reply" ? (
                <div className={styles.calloutInfo}>
                  ✅ Можно обычный текст: вы внутри 24-часового окна после сообщения клиента.
                </div>
              ) : (
                <div className={styles.calloutWarn}>
                  ⚠️ Нужен одобренный шаблон (template). Обычный текст вне окна WhatsApp не доставит —
                  это ограничение WhatsApp Business API, не баг.
                </div>
              )}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить черновик</button>
            <Link href="/messages" className={styles.btn}>К списку</Link>
          </div>
        </form>

        {/* Live preview */}
        <div>
          <div className={styles.toolbarLabel} style={{ marginBottom: 8 }}>Предпросмотр перед отправкой</div>
          {channel === "email" ? (
            <div className={styles.gmailPreview}>
              <div className={styles.gmailHead}>
                <div><strong>Тема:</strong> {subject || <span className={styles.muted}>— тема —</span>}</div>
                <div className={styles.muted}>Кому: {recipient}</div>
              </div>
              <div className={styles.gmailBody}>{body || <span className={styles.muted}>— текст письма —</span>}</div>
            </div>
          ) : (
            <div className={styles.waPreview}>
              <div className={styles.waBubble}>{body || "— текст сообщения —"}</div>
              <div className={styles.note} style={{ color: "#5b6677" }}>
                {waContext === "cold" ? "Будет отправлено как шаблон (template)." : "Обычное сообщение в окне 24 ч."}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
