"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, setSession } from "../../lib/api";

const DEFAULT_EMAIL = "admin@growthlab.local";
const DEFAULT_PASSWORD = "change-this-password";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await apiRequest<{
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        user: { id: string; email: string; role: string; organizationId: string };
      }>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setSession(session);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#f7f8fb",
        color: "#172033",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          border: "1px solid #dfe5ee",
          borderRadius: "8px",
          padding: "28px",
          display: "grid",
          gap: "20px",
        }}
      >
        <div>
          <p style={{ color: "#2d6cdf", fontSize: "13px", fontWeight: 800, margin: "0 0 6px" }}>
            GrowLab
          </p>
          <h1 style={{ fontSize: "24px", lineHeight: 1.2, margin: 0 }}>Вход в систему</h1>
          <p style={{ color: "#637083", fontSize: "13px", margin: "6px 0 0" }}>
            Войдите, чтобы подключиться к backend и отправлять сообщения.
          </p>
        </div>

        {error ? (
          <div
            style={{
              background: "#fdecec",
              border: "1px solid #f3c3c0",
              color: "#a23a35",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} style={{ display: "grid", gap: "14px" }} noValidate>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #dfe5ee",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #dfe5ee",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#2d6cdf",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "11px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <p style={{ color: "#8a94a6", fontSize: "12px", margin: 0, lineHeight: 1.5 }}>
          Данные по умолчанию: <code>admin@growthlab.local</code> / пароль из{" "}
          <code>backend/.env</code> (ADMIN_EMAIL / ADMIN_PASSWORD). Укажите реальный пароль, если
          его меняли.
        </p>
      </section>
    </main>
  );
}