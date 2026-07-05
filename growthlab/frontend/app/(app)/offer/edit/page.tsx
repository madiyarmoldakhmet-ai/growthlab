"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { Field, Input, TextArea, SavedBanner } from "../../../../components/form";
import styles from "../../../../components/ui.module.css";
import { MOCK_OFFERS } from "../../../../lib/mock/data";

const base = MOCK_OFFERS[0];

type Form = { product: string; audience: string; price: string; benefit: string; nextStep: string };

export default function OfferEditPage() {
  const [form, setForm] = useState<Form>({
    product: base.product,
    audience: base.audience,
    price: base.price,
    benefit: base.benefit,
    nextStep: base.nextStep,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const set =
    (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.product.trim()) next.product = "Укажите, что продаём";
    if (!form.nextStep.trim()) next.nextStep = "Укажите следующий шаг";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaved("Оффер сохранён локально (мок — на сервер не отправляется).");
  };

  return (
    <section>
      <div className={styles.screenHead}>
        <div>
          <h1 className={styles.title}>Оффер</h1>
          <p className={styles.subtitle}>Что продаём, кому, цена, результат и следующий шаг.</p>
        </div>
        <span className={styles.mockBadge}>🟡 МОК — без отправки на сервер</span>
      </div>

      {saved ? <div style={{ marginBottom: 16 }}><SavedBanner>{saved}</SavedBanner></div> : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Что продаём" required error={errors.product}>
          <Input value={form.product} onChange={set("product")} invalid={!!errors.product} />
        </Field>
        <Field label="Кому">
          <Input value={form.audience} onChange={set("audience")} />
        </Field>
        <Field label="Цена">
          <Input value={form.price} onChange={set("price")} />
        </Field>
        <Field label="Результат / польза">
          <TextArea value={form.benefit} onChange={set("benefit")} />
        </Field>
        <Field label="Следующий шаг" required error={errors.nextStep}>
          <Input value={form.nextStep} onChange={set("nextStep")} invalid={!!errors.nextStep} />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить</button>
          <Link href="/offer" className={styles.btn}>Отмена</Link>
        </div>
      </form>
    </section>
  );
}
