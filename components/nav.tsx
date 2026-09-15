"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/user-context";

// Same four neon accents used across game cards (ARCADE/PUZZLE/SHOOTER/VERSUS),
// so the initials background always reads as part of the design system.
const AVATAR_COLORS = ["cyan", "magenta", "green", "yellow"] as const;

function avatarColor(name: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar URL, not a local/static asset
      <img
        src={avatarUrl}
        alt=""
        className="av-avatar"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={`av-avatar av-avatar-initials ${avatarColor(name)}`}
      aria-hidden="true"
    >
      {name.slice(0, 2)}
    </span>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useUser();

  const isActive = (
    name: "home" | "biblioteca" | "salon" | "auth" | "about",
  ) => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca")
      return pathname === "/biblioteca" || pathname.startsWith("/juego");
    if (name === "salon") return pathname === "/salon";
    if (name === "about") return pathname === "/acerca-de";
    return pathname === "/auth";
  };

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("home") ? "active" : ""}>
            Inicio
          </Link>
          <Link
            href="/biblioteca"
            className={isActive("biblioteca") ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={signOut}>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} />
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link
          href="/"
          className={isActive("home") ? "active" : ""}
          onClick={close}
        >
          Inicio
        </Link>
        <Link
          href="/biblioteca"
          className={isActive("biblioteca") ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/salon"
          className={isActive("salon") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/acerca-de"
          className={isActive("about") ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        <Link
          href="/auth"
          className={isActive("auth") ? "active" : ""}
          onClick={close}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
