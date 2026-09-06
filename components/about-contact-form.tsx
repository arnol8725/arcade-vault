"use client";

import { useState, type FormEvent } from "react";
import { sendContactMessage } from "@/lib/contact";

interface ContactFormState {
  name: string;
  email: string;
  msg: string;
}

const EMPTY_FORM: ContactFormState = { name: "", email: "", msg: "" };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AboutContactForm() {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.msg.trim() ||
      !EMAIL_REGEX.test(form.email.trim())
    ) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setSending(true);
    const result = await sendContactMessage(form);
    if (result.ok) {
      setSent(form.name.trim());
    } else {
      setError(result.error);
    }
    setSending(false);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {!sent && !error ? (
        <>
          <div className="field">
            <label>NOMBRE</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label>CORREO ELECTRÓNICO</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>MENSAJE</label>
            <textarea
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          <button
            className="btn xl press"
            type="submit"
            disabled={sending}
            style={{ width: "100%" }}
          >
            {sending ? "ENVIANDO..." : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            {sent ? (
              <>
                <div className="line dim">[OK] Transmitiendo paquete…</div>
                <div className="line success">
                  &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
                  <span className="caret">_</span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setSent(null);
                      setForm(EMPTY_FORM);
                    }}
                  >
                    ENVIAR OTRO MENSAJE
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="line error">
                  &gt; [ERROR] TRANSMISIÓN FALLIDA — verificar conexión.
                  <span className="caret">_</span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setError(null)}
                  >
                    REINTENTAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
