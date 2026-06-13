# Project Agent Instructions — Carbon Coach (PromptWars)

> Save this file in the repo root as **`GEMINI.md`** (Antigravity-specific) or **`AGENTS.md`** (portable) — the content is identical. The agent reads this as standing context for every task. Detailed companion docs live alongside it: `CARBON_COACH_BUILD_SPEC.md` (full spec, factor table, exact Gemini prompts) and `AGENT_BUILD_RULES.md` (scoring rubric). Follow this file; consult those for exhaustive detail.

## What we're building

Carbon Coach: a personal carbon-footprint companion for an Indian user. The user describes their day in plain language; the app estimates CO₂e, shows where it comes from, lets them simulate changes, and gives personalized reduction actions.

Brief being solved: *Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.*

## Why it's built this way (the scoring rubric — optimize for this)

Submissions are scored by an automated evaluator across seven dimensions. Optimize in this order:

1. **Problem-statement alignment** — gating parameter. A clean app that doesn't obviously solve the brief scores near zero. Every feature must map to a brief phrase, and the README must state that mapping explicitly.
2. **Correct use of Google services** — built in Antigravity, deployed to Cloud Run, Gemini for AI, Firestore for persistence.
3. **Code quality** · 4. **Security** · 5. **Efficiency** · 6. **Testing** · 7. **Accessibility**.

## Hard constraints (do not deviate)

- Deploy target is **Google Cloud Run only** — never Vercel/Netlify/other hosts. The live Cloud Run URL is a required, evaluated artifact.
- Push the **entire** repo to **GitHub** — the evaluator inspects files individually. No missing files, no secrets committed.
- All **Gemini calls are server-side**; the API key never reaches the client bundle or the repo.
- **CO₂e numbers are computed in code from the factor table — never by Gemini.** Gemini only extracts structure from text and writes prose. This keeps numbers consistent, explainable, and testable.
- The **final** deploy/submission is the only one that counts (not best-of-three). Always make the final build the strongest, most complete, most aligned version. Never leave an experimental or half-built state as the final.

## Brief → feature mapping (reproduce verbatim in README.md)

| Brief phrase | Feature |
|---|---|
| Understand | Dashboard: footprint by category, trend over 14 days, vs. average Indian/global. |
| Track | Natural-language logging — Gemini parses free text into structured, scored entries stored per user. |
| Reduce | "What-If" simulator: sliders for the user's top levers → live projected annual savings. |
| Simple actions | Each insight is one concrete, achievable step (e.g. "swap 2 chicken meals for dal"). |
| Personalized insights | Gemini generates weekly actions targeting the user's own largest contributors. |

## Tech stack & conventions

- One container = one Cloud Run service. Frontend built and served as static files by the same Express backend that exposes `/api/*`.
- **Frontend:** React + Vite + TypeScript, Tailwind, Recharts.
- **Backend:** Node.js + Express + TypeScript.
- **AI:** Google Gemini (current Flash model) via `@google/genai`, server-side only.
- **Persistence:** Cloud Firestore (Native mode) via Firebase Admin SDK. Survives instance restarts; counts as a Google service. Fallback only if blocked: in-memory + client `localStorage` keyed by anonymous device ID (note tradeoff in README).
- **Users:** no login. Anonymous `userId` (UUID) in a cookie, sent with every API call.
- TypeScript strict mode. Keep pure logic (factors, scoring, simulator math) in standalone, testable functions.

## Architecture

```
React SPA  ──fetch /api/* (userId cookie)──▶  Express (Cloud Run container)
  POST /api/parse     Gemini: free text → structured activities
  POST /api/log       score via FACTORS in code → save to Firestore
  GET  /api/summary   aggregate user's entries (by category, by day)
  POST /api/insights  Gemini: 2–3 personalized weekly actions
  POST /api/simulate  deterministic projection + Gemini narrative plan
  (static) serves built React app
Firestore: users/{userId}/profile, users/{userId}/entries/{entryId}
```

Data model, the India-specific emission-factor table, simulator formulas, and the exact Gemini prompts are in `CARBON_COACH_BUILD_SPEC.md` §4–§8. Use them as written. CO₂e = `quantity * FACTORS[category][subtype].factor`.

## Screens

Onboarding quiz (baseline) → **Log** (track) → **Dashboard** (understand + weekly insights) → **Reduce** (simulator). Mobile-first, responsive.

## Definition of done (self-check before any final deploy)

- App directly and obviously solves the brief; every requirement maps to a working, tested feature.
- README starts with the description, the brief→feature table above, the Google services used, and cited factor sources.
- Built in Antigravity; deployed to Cloud Run; live URL works in a fresh browser session (run the full flow: onboard → log → dashboard → simulate).
- Gemini integrated server-side for parse + insights + simulator narrative; no key in client/repo.
- Firestore persistence working (or documented fallback).
- Full repo pushed to GitHub; clean, no secrets, `.env.example` present.
- Tests green — core logic (factors, parse-to-score mapping, simulator math) fully covered; one smoke test per screen.
- Accessible: semantic HTML, labelled inputs, alt text, charts have data-table/aria summaries, keyboard nav, AA contrast.
- Inputs validated/length-capped server-side; per-IP rate limit on Gemini routes; empty/loading/error states handled everywhere.

## Commands

Keep these working and update if the stack changes.

```bash
npm install
npm run dev          # local: Vite frontend + Express API
npm test             # Vitest unit/component tests
npm run build        # build frontend + compile server
docker build -t carbon-coach .
# Deploy: use the Cloud Run MCP; pass the GCP project ID.
# On Windows, run command execution via Command Prompt (not PowerShell).
# Set service env vars: GEMINI_API_KEY. Firestore uses the runtime service account (ADC).
```

## Build order

Scaffold + Dockerfile + prove Cloud Run deploy → factor engine + tests → onboarding/baseline → parse + Log → summary + Dashboard → simulator → insights → a11y/security/states → tests + README → final Cloud Run deploy + GitHub push (this is the submission).

## Out of scope (resist scope creep)

No auth beyond anonymous ID; no social/leaderboard; no real utility-bill or bank APIs (quiz + manual logging only); no native app. A complete, polished version of the spec beats a half-built larger app — completeness drives the score.