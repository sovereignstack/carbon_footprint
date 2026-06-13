# Build Spec — "Carbon Coach"

PromptWars submission spec. Build this app inside Antigravity, deploy to Google Cloud Run, push the full repo to GitHub. Read `AGENT_BUILD_RULES.md` first — this spec is written to satisfy that rubric, with problem-statement alignment as the top priority.

**Problem statement:** *Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.*

---

## 1. Concept & how it maps to the brief (alignment — read first)

Carbon Coach is a personal carbon-footprint companion for an Indian user. You describe your day in plain language; the app estimates your CO₂e, shows where it comes from, lets you simulate changes, and gives you personalized actions. Every phrase in the brief maps to a concrete feature:

| Brief phrase | Feature that delivers it |
|---|---|
| **Understand** | Dashboard breaking footprint down by category (transport/food/energy/shopping), trend over time, and comparison to the average Indian footprint. |
| **Track** | Natural-language daily logging — Gemini parses "took the local to Andheri, had chicken biryani, AC on 6 hrs" into structured, scored entries stored per user. |
| **Reduce** | "What-If" simulator: sliders for the user's top levers show projected annual CO₂e savings in real time. |
| **Simple actions** | Each insight is one concrete, achievable step (e.g., "swap 2 chicken meals for dal this week"), not a generic tip. |
| **Personalized insights** | Gemini generates weekly actions targeting the user's *own* largest contributors, plus a personalized plan in the simulator. |

This table must be reproduced in the README (see §11) — it is what the evaluator uses to score alignment.

**Why this wins:** it hits all five brief phrases unmistakably, uses Gemini in two distinct, central ways (parsing + insight generation), is India-specific (a differentiator), and is fully shippable solo in two weeks because the emission factors are a built-in dataset (mock/hybrid data is allowed).

---

## 2. Tech stack (Cloud Run + Google services)

Single containerized full-stack app = one Cloud Run service.

- **Frontend:** React + Vite + TypeScript. Charts via Recharts. Tailwind for styling.
- **Backend:** Node.js + Express + TypeScript in the same container, serving the built frontend as static files **and** exposing `/api/*` routes.
- **AI:** Google **Gemini** (use the current Gemini Flash model in your project, e.g. `gemini-flash` latest) via the official `@google/genai` SDK, called **server-side only** so the API key is never exposed.
- **Persistence:** **Google Cloud Firestore** (Native mode) via the Firebase Admin SDK on the backend. Firestore is serverless, survives Cloud Run instance restarts, and counts toward the "correct use of Google services" score.
  - *Simpler fallback if Firestore setup blocks you:* keep entries in memory + mirror to client `localStorage`, keyed by an anonymous device ID. Note the tradeoff in the README. Prefer Firestore.
- **User model:** no login. Generate an anonymous `userId` (UUID) on first load, store it in a cookie, send it with every API call. Keep it simple.

**Why a backend (not a static site):** the Gemini key must stay server-side (security dimension), and the parsing/insight calls happen there.

---

## 3. Architecture

```
Browser (React/Vite SPA)
   │  fetch /api/...   (sends anonymous userId cookie)
   ▼
Express server (Cloud Run container)
   ├── POST /api/parse      → Gemini: free text → structured activities
   ├── POST /api/log        → score activities (local factors) → save to Firestore
   ├── GET  /api/summary    → aggregate user's entries (by category, by day)
   ├── POST /api/insights   → Gemini: weekly personalized actions
   ├── POST /api/simulate   → deterministic projection + Gemini narrative plan
   └── (static) serves built React app
   ▼
Firestore: users/{userId}/entries/{entryId}, users/{userId}/profile
```

**Design rule:** all CO₂e math happens in code from the factor table — **never** ask Gemini to compute emission numbers. Gemini only extracts structure and writes prose. This keeps numbers consistent, explainable, and testable.

---

## 4. Data model

```ts
// users/{userId}/profile
type Profile = {
  userId: string;
  baselineAnnualKg: number;      // from onboarding quiz
  createdAt: string;
};

// users/{userId}/entries/{entryId}
type Entry = {
  id: string;
  userId: string;
  date: string;                  // YYYY-MM-DD
  rawText: string;               // original user input
  category: 'transport' | 'food' | 'energy' | 'shopping';
  subtype: string;               // key into FACTORS
  quantity: number;
  unit: string;
  co2eKg: number;                // computed in code
  estimated: boolean;            // true if Gemini guessed the quantity
  createdAt: string;
};
```

---

## 5. Emission-factor dataset (built-in, India-specific)

Ship this as `src/data/factors.ts`. Values are illustrative starting points — **cite your sources in the README** (CEA for grid, IPCC/India GHG program for the rest) and adjust if you find better figures. Conservative, defensible numbers preferred.

```ts
// kg CO2e per unit
export const FACTORS = {
  transport: {
    car_petrol_km:    { factor: 0.171, unit: 'km' },
    car_diesel_km:    { factor: 0.168, unit: 'km' },
    two_wheeler_km:   { factor: 0.045, unit: 'km' },
    auto_rickshaw_km: { factor: 0.107, unit: 'km' },
    bus_km:           { factor: 0.015, unit: 'km' },
    local_train_km:   { factor: 0.007, unit: 'km' }, // suburban/metro electric
    domestic_flight_km:{factor: 0.158, unit: 'km' },
  },
  food: { // per meal/serving
    veg_meal:     { factor: 0.5,  unit: 'meal' },
    chicken_meal: { factor: 1.8,  unit: 'meal' },
    red_meat_meal:{ factor: 5.0,  unit: 'meal' }, // mutton/beef
    dairy_serving:{ factor: 0.6,  unit: 'serving' },
    rice_serving: { factor: 0.4,  unit: 'serving' },
  },
  energy: {
    grid_electricity_kwh: { factor: 0.71, unit: 'kWh' }, // India grid avg (CEA)
    ac_hour:              { factor: 1.0,  unit: 'hour' }, // ~1.4kWh * 0.71
    lpg_cylinder:         { factor: 42.0, unit: 'cylinder' }, // 14.2kg cylinder
  },
  shopping: {
    clothing_item: { factor: 8.0, unit: 'item' },
    generic_inr:   { factor: 0.0004, unit: 'INR' }, // rough spend-based
  },
} as const;

// India per-capita reference for "Understand" comparisons
export const REFERENCE = {
  indiaAnnualPerCapitaKg: 1900,  // ~1.9 t CO2e
  globalAnnualPerCapitaKg: 4700, // ~4.7 t CO2e
};
```

Scoring: `co2eKg = quantity * FACTORS[category][subtype].factor`.

---

## 6. Screens

Four tabs + onboarding. Mobile-first, responsive.

1. **Onboarding (first visit):** 4 quick questions (commute mode + daily km, diet type, monthly electricity ₹ or kWh, flights per year). Compute `baselineAnnualKg` in code, save to profile, show the number with the India/global comparison. This is the "understand your starting point" moment.

2. **Log tab (Track):** chat-style text box ("What did you do today?"). On submit → `POST /api/parse` → show parsed entries as confirmable chips with their CO₂e (user can delete a wrong one) → `POST /api/log` saves them. Show today's running total and a friendly confirmation.

3. **Dashboard tab (Understand):**
   - Big number: this week's footprint + vs. your weekly baseline.
   - Line chart: daily CO₂e over the last 14 days.
   - Donut/bar: breakdown by category.
   - Comparison bar: you vs. average Indian vs. global.
   - "Your biggest source this week: Food (X kg)" callout.

4. **Reduce tab (What-If simulator):** sliders for the user's top levers (see §8). Projected new annual total + kg saved update live. A "Get my plan" button calls `POST /api/simulate` → Gemini writes a personalized plan.

5. **Insights (on Dashboard):** "This week's actions" card → `POST /api/insights` → 2–3 personalized, specific actions with estimated savings.

---

## 7. Gemini integration — exact calls

All calls server-side. Always instruct JSON-only output and parse defensively (strip ``` fences, try/catch, fall back gracefully).

### 7a. Parse free text → activities (`/api/parse`)
System/instruction:
```
You are an activity-extraction engine for a carbon-footprint app used in India.
From the user's free-text description, extract each distinct carbon-relevant activity.
Return ONLY a JSON array (no prose, no markdown fences). Each element:
{ "category": "transport"|"food"|"energy"|"shopping",
  "subtype": <one of the allowed keys below>,
  "quantity": <number>,
  "unit": <string>,
  "estimated": <true if you inferred the quantity, else false> }
Allowed subtypes and units:
<inject the keys+units from FACTORS here>
Rules: If a quantity isn't stated, estimate a sensible default for India and set estimated=true.
Map synonyms (e.g. "local"/"metro" -> local_train_km, "biryani with chicken" -> chicken_meal).
If nothing carbon-relevant is mentioned, return [].
```
Then in code: validate each item's subtype exists in FACTORS, compute `co2eKg`, drop invalid items.

### 7b. Weekly personalized insights (`/api/insights`)
Input: the user's category breakdown for the week (JSON of {category: kg}).
```
You are a sustainability coach for an Indian user.
Given this weekly footprint breakdown (JSON), produce 2-3 SPECIFIC, achievable
reduction actions that target the user's LARGEST contributors.
Return ONLY a JSON array:
[{ "action": <concrete India-relevant step>,
   "category": <the category it targets>,
   "estimatedWeeklySavingKg": <number>,
   "rationale": <one sentence> }]
Be specific: "Swap 2 chicken meals for dal" not "eat less meat".
No preamble, no markdown.
```

### 7c. Simulator narrative plan (`/api/simulate`)
Code computes the projection first (§8); pass the result to Gemini for prose only.
```
The user's baseline is <baseline> kg CO2e/year. With these changes <levers JSON>,
their projected total is <new> kg/year, saving <saved> kg/year.
Write a short (<=120 words) encouraging, personalized action plan explaining how to
implement these changes in an everyday Indian context. Plain text, second person.
```

---

## 8. Simulator math (deterministic, in code)

Compute projections in code from FACTORS; Gemini only narrates. Levers (seed from the user's actual biggest categories):

- **Transport:** "Shift N car-km/week to public transit" → `saving = N * 52 * (car_petrol_km - local_train_km)`.
- **Diet:** "Replace N red-meat or chicken meals/week with veg" → `saving = N * 52 * (meat_factor - veg_meal)`.
- **Energy:** "Reduce AC by N hours/day" → `saving = N * 365 * ac_hour`; "Offset M% of electricity with rooftop solar" → `saving = annualGridKwh * (M/100) * grid_electricity_kwh`.

Show projected new annual total and total kg saved, updating live as sliders move.

---

## 9. Testing (scored dimension)

Use Vitest + React Testing Library.

- **Emission engine (highest value):** unit-test `computeCo2e` for every category/subtype; verify a known input → expected kg. This is deterministic and easy to cover well.
- **Parser mapping:** given a mocked Gemini JSON response, verify invalid subtypes are dropped and co2e is computed correctly.
- **Simulator math:** test each lever's saving formula.
- **API routes:** test `/api/log`, `/api/summary` with a mocked Firestore.
- **One smoke test** per major screen renders without crashing.

Aim for the core logic (factors, parsing-to-score, simulator) to be fully covered — these are pure functions and cheap to test.

---

## 10. Non-functional requirements

**Accessibility:** semantic HTML; labelled inputs; alt text; every chart has an adjacent data table or `aria-label` summary; keyboard-navigable tabs with visible focus; WCAG-AA contrast; respects `prefers-reduced-motion`.

**Security:** `GEMINI_API_KEY` from env / Secret Manager, never in the repo or client bundle; validate and length-cap all user input server-side; basic per-IP rate limit on `/api/parse` and `/api/insights`; Firestore rules scoped so a user can only read/write their own `userId` path; no secrets in git (`.gitignore` + `.env.example`).

**Efficiency:** debounce simulator slider → Gemini call (only on "Get my plan", not every drag); cache the weekly summary; lazy-load charts; small bundle.

---

## 11. README → problem-statement mapping (drives alignment score)

The README must contain, near the top:
1. One-line description: what the app does.
2. **The exact mapping table from §1** (brief phrase → feature). This is the single highest-leverage thing for the alignment score.
3. Which Google services are used and how: Antigravity (built with), Cloud Run (deployed on), Gemini (parsing + insights), Firestore (persistence).
4. Emission-factor sources cited.
5. Live Cloud Run URL + run-locally instructions.

---

## 12. Deployment (Cloud Run)

- `Dockerfile`: multi-stage — build the Vite frontend, then run the Express server serving static + API. Listen on `process.env.PORT` (Cloud Run sets it).
- Ask the Antigravity agent to deploy via the Cloud Run MCP; pass your GCP project ID; use Command Prompt for execution if on Windows.
- Set env vars on the service: `GEMINI_API_KEY`, Firestore uses the runtime service account (Application Default Credentials) — grant it Firestore access.
- After deploy: open the live URL in a fresh browser, run the full flow (onboard → log → dashboard → simulate), fix anything broken **before** submitting.

---

## 13. Build sequence (milestones for the agent)

1. Scaffold Vite+React+TS frontend and Express+TS backend in one repo; health-check route; Dockerfile; deploy a "hello" to Cloud Run to prove the pipeline.
2. Add `factors.ts` + `computeCo2e` + unit tests (no AI yet).
3. Build onboarding quiz + baseline calc + profile save (Firestore).
4. `/api/parse` (Gemini) + Log tab with confirmable entries + `/api/log` save.
5. `/api/summary` + Dashboard charts + comparisons.
6. Simulator tab + deterministic projections + `/api/simulate` narrative.
7. `/api/insights` weekly actions card.
8. Accessibility pass, security hardening, rate limiting, error/empty/loading states.
9. Full test suite green; README with the §1 mapping table and sources.
10. Final deploy to Cloud Run; verify live; push full repo to GitHub. This deploy is the final submission — make it the strongest version.

---

## 14. Out of scope (keep it shippable)

No user accounts/auth beyond anonymous ID; no social/leaderboard features; no real utility-bill or bank API integrations (use quiz + manual logging); no native mobile app. Resist scope creep — a complete, polished version of the above beats a half-built bigger app, and completeness drives the score.