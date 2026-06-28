"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Input, TextArea, SavedBanner } from "../../../../components/form";
import styles from "../../../../components/ui.module.css";

type Form = { name: string; product: string; price: string; goal: string; offer: string };

export default function NewClientPage() {
  const [form, setForm] = useState<Form>({ name: "", product: "", price: "", goal: "", offer: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const set =
    (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Укажите название";
    if (!form.product.trim()) next.product = "Укажите продукт";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaved(`Клиент «${form.name}» сохранён локально (мок — на сервер не отправляется).`);
  };

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>Создать клиента</h1>
          <p className={styles.subtitle}>Кого продвигаем: продукт, цена, цель, оффер.</p>
        </div>
        <span className={styles.mockBadge}>🟡 МОК — без отправки на сервер</span>
      </div>

      {saved ? <div style={{ marginBottom: 16 }}><SavedBanner>{saved}</SavedBanner></div> : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Название" required error={errors.name}>
          <Input value={form.name} onChange={set("name")} invalid={!!errors.name} placeholder="KazRetail" />
        </Field>
        <Field label="Продукт" required error={errors.product}>
          <Input value={form.product} onChange={set("product")} invalid={!!errors.product} placeholder="Что продаём от лица клиента" />
        </Field>
        <Field label="Цена" hint="Например: от 250 000 ₸/мес">
          <Input value={form.price} onChange={set("price")} placeholder="от 250 000 ₸/мес" />
        </Field>
        <Field label="Цель">
          <Input value={form.goal} onChange={set("goal")} placeholder="Встречи с байерами сетей" />
        </Field>
        <Field label="Оффер" hint="Короткое описание ценности для писем">
          <TextArea value={form.offer} onChange={set("offer")} placeholder="Что получит клиент и почему стоит ответить" />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить</button>
          <Link href="/campaigns" className={styles.btn}>Отмена</Link>
        </div>
      </form>
    </section>
  );
}
