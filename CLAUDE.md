# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for the highest score. Currently an unmodified `create-next-app` scaffold (Next.js 16, App Router, React 19, TypeScript strict, Tailwind CSS 4); no game features are implemented yet.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript)

No test runner is configured yet.

## Workflow

The README specifies this project follows Spec-Driven Design via `/spec` and `/spec-impl`, based on https://github.com/Klerith/fernando-skills, installed with `npx skills@latest add Klerith/fernando-skills`. Those skills are not currently installed in `.claude/skills` — if `/spec` or `/spec-impl` are invoked and missing, install them first.

## Architecture notes

- App Router (`app/`), `@/*` path alias resolves to the repo root (see `tsconfig.json`).
- **Read `node_modules/next/dist/docs/` before writing Next.js code** — see `AGENTS.md` for why (this Next.js version has breaking API/convention changes vs. training data).
