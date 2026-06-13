# Carbon Coach — Personal Carbon Footprint Companion for India

Carbon Coach is a personal carbon footprint tracker and sustainability companion designed specifically for users in India, helping individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Brief to Feature Mapping

| Brief phrase | Feature |
|---|---|
| Understand | Dashboard: footprint by category, trend over 14 days, vs. average Indian/global. |
| Track | Natural-language logging — Gemini parses free text into structured, scored entries stored per user. |
| Reduce | "What-If" simulator: sliders for the user's top levers → live projected annual savings. |
| Simple actions | Each insight is one concrete, achievable step (e.g. "swap 2 chicken meals for dal"). |
| Personalized insights | Gemini generates weekly actions targeting the user's own largest contributors. |

## Google Services Used
- **Google Antigravity**: Developed, debugged, and verified the entire project within the Antigravity pair-programming agent environment.
- **Google Cloud Run**: Powers the live production container, running our unified Express backend and React Single Page Application on a serverless, highly-scalable platform.
- **Google Gemini**: Utilizes the modern `gemini-2.5-flash` model server-side via the `@google/genai` SDK for parsing natural language activity entries, recommending weekly reduction insights, and generating simulator roadmap narratives.
- **Google Cloud Firestore (Native Mode)**: Serves as the primary serverless persistence layer, keeping track of anonymous user baseline profiles and carbon-emission log entries securely.

## Emission-Factor Citations & Sources
All carbon calculation constants are defined deterministically in code (see [factors.ts](file:///home/priyank/pw/carbon_footprint/src/data/factors.ts)) and cited using:
- **Central Electricity Authority (CEA), Ministry of Power, Government of India**: Grid emission factor of 0.71 kg CO₂e/kWh representing the Indian national average.
- **India GHG Program / WRI India**: Emission factor constants for Indian transport modes including two-wheelers, auto-rickshaws, petrol/diesel passenger cars, public buses, and local suburban trains.
- **IPCC Guidelines for National Greenhouse Gas Inventories**: Standard carbon-equivalent estimates for food items (veg meals, chicken meals, red meat, dairy, and rice servings) and LPG cylinders.

## Production URL
Live Cloud Run Deployment: [https://carbon-coach-ugc2t6exba-ew.a.run.app](https://carbon-coach-ugc2t6exba-ew.a.run.app)

---

## Local Development Instructions

### Prerequisites
- Node.js (v20+ recommended)
- Google Cloud CLI (`gcloud`) authenticated locally with Application Default Credentials (ADC) for Vertex AI access.

### Installation
Clone the repository and install dependencies for both root and client spaces:
```bash
npm install
```

### Local Dev Server
Start both Vite frontend and Express API server concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Test Runner
Run unit and integration test suites:
```bash
npm test
```

### Production Build
Verify TypeScript compiler and bundle the assets:
```bash
npm run build
```

### Docker Build
Package the application locally:
```bash
docker build -t carbon-coach .
```
