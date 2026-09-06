"use server";

import { Resend } from "resend";

type ContactInput = { name: string; email: string; msg: string };
type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to: process.env.CONTACT_TO_EMAIL!,
      replyTo: input.email,
      subject: `Nuevo mensaje de ${input.name} — Arcade Vault`,
      text: `De: ${input.name} (${input.email})\n\n${input.msg}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}
