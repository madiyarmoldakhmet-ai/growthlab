"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Input, Select, SavedBanner } from "../../../../components/form";
import styles from "../../../../components/ui.module.css";

type Form = { name: string; client: string; channel: string; goal: string; startDate: string };

const CLIENTS = ["KazRetail", "LogiPro", "FinScale", "MedLink"];
const CHANNELS = [
  { value: "email", label: "Email (Gmail)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "multi", label: "Email + WhatsApp" },
];

export default function NewCampaignPage() {
  const [form, setForm] = useState<Form>({ name: "", client: "", channel: "email", goal: "", startDate: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const set =
    (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Укажите название";
    if (!form.client) next.client = "Выберите клиента";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaved(`Кампания «${form.name}» создана как черновик локально (мок — на сервер не отправляется).`);
  };

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>Создать кампанию</h1>
          <p className={styles.subtitle}>Название, клиент, канал, цель и дата старта.</p>
        </div>
        <span className={styles.mockBadge}>🟡 МОК — без отправки на сервер</span>
      </div>

      {saved ? <div style={{ marginBottom: 16 }}><SavedBanner>{saved}</SavedBanner></div> : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Название" required error={errors.name}>
          <Input value={form.name} onChange={set("name")} invalid={!!errors.name} placeholder="KazRetail — выход на сети" />
        </Field>
        <Field
          label="Клиент"
          required
          error={errors.client}
          hint="Нет нужного? Создайте клиента отдельно."
        >
          <Select value={form.client} onChange={set("client")}>
            <option value="">— выберите —</option>
            {CLIENTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Канал" required>
          <Select value={form.channel} onChange={set("channel")}>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Цель">
          <Input value={form.goal} onChange={set("goal")} placeholder="Встречи / демо / заявки" />
        </Field>
        <Field label="Дата старта">
          <Input type="date" value={form.startDate} onChange={set("startDate")} />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Создать</button>
          <Link href="/clients/new" className={styles.btn}>+ Новый клиент</Link>
          <Link href="/campaigns" className={styles.btn}>Отмена</Link>
        </div>
      </form>
    </section>
  );
}
