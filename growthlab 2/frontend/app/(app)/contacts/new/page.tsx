"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Input } from "../../../../components/form";
import { StatusPill } from "../../../../components/StatusPill";
import styles from "../../../../components/ui.module.css";

type Form = { name: string; company: string; role: string; email: string; phone: string; whatsapp: string };

const EMPTY: Form = { name: "", company: "", role: "", email: "", phone: "", whatsapp: "" };

export default function NewContactsPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [added, setAdded] = useState<Form[]>([]);

  const set =
    (key: keyof Form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Укажите имя";
    if (!form.email.trim() && !form.phone.trim() && !form.whatsapp.trim()) {
      next.email = "Нужен хотя бы один канал: email, телефон или WhatsApp";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setAdded((list) => [{ ...form }, ...list]);
    setForm({ ...EMPTY, company: form.company }); // keep company for batch add
  };

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>Добавить контакты</h1>
          <p className={styles.subtitle}>Имя, компания, роль и каналы связи. Можно добавлять по одному.</p>
        </div>
        <span className={styles.mockBadge}>🟡 МОК — добавляется только локально</span>
      </div>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid2}>
          <Field label="Имя" required error={errors.name}>
            <Input value={form.name} onChange={set("name")} invalid={!!errors.name} placeholder="Айгерим Сапарова" />
          </Field>
          <Field label="Компания">
            <Input value={form.company} onChange={set("company")} placeholder="KazRetail" />
          </Field>
        </div>
        <Field label="Роль">
          <Input value={form.role} onChange={set("role")} placeholder="Head of Sales" />
        </Field>
        <div className={styles.formGrid2}>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={set("email")} invalid={!!errors.email} placeholder="a@company.kz" />
          </Field>
          <Field label="Телефон">
            <Input value={form.phone} onChange={set("phone")} placeholder="+7 701 000 00 00" />
          </Field>
        </div>
        <Field label="WhatsApp" hint="Номер для WhatsApp (если отличается от телефона)">
          <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="+7 701 000 00 00" />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Добавить контакт</button>
          <Link href="/contacts" className={styles.btn}>К списку</Link>
        </div>
      </form>

      {added.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <p className={styles.toolbarLabel} style={{ marginBottom: 8 }}>
            Добавлено в этой сессии: {added.length} (локально, не на сервере)
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Компания · роль</th>
                <th>Каналы</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {added.map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    {c.company || "—"}
                    <div className={styles.muted} style={{ fontSize: 12 }}>{c.role}</div>
                  </td>
                  <td>
                    {c.email ? <span className={styles.channelTag}>Email</span> : null}
                    {c.whatsapp ? <span className={styles.channelTag} style={{ marginLeft: 4 }}>WhatsApp</span> : null}
                    {c.phone && !c.whatsapp ? <span className={styles.channelTag} style={{ marginLeft: 4 }}>Тел.</span> : null}
                  </td>
                  <td><StatusPill status="queued" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
