# Shalom — E-Learning Platform

Shalom is a full-stack e-learning platform with a mobile app for learners, a web portal for instructors, a Supabase backend, and an ML-powered course recommendation system.

---

## Project Structure

```
Shalom/
├── mobile/          # React Native / Expo learner app
├── web/             # React instructor web portal
├── backend/
│   ├── supabase/    # Edge Functions (TypeScript / Deno)
│   └── ml/          # Python ML pipeline (recommendation system)
└── db_schema/       # Database schema snapshots
```

---

## Tech Stack

### Mobile App (`mobile/`)
- **React Native 0.81.5** + **Expo SDK 54**
- TypeScript
- React Navigation (stack + bottom tabs)
- TanStack React Query for data fetching
- Supabase JS client for database access
- Expo Notifications for push notifications
- Jest + React Native Testing Library for unit tests

### Instructor Web Portal (`web/`)
- **React 18** + **Vite** + TypeScript
- Tailwind CSS + **shadcn/ui** (Radix UI primitives)
- TanStack React Query for data fetching
- React Router v6
- AWS Cognito for authentication
- Recharts for analytics dashboards
- **Vitest** for unit/component tests
- **Playwright** for E2E and integration tests

### Backend (`backend/supabase/`)
- **Supabase** — PostgreSQL database + Edge Functions (Deno/TypeScript)
- **AWS Cognito** — user pool management and JWT auth
- Row Level Security (RLS) policies on all tables

### ML Pipeline (`backend/ml/`)
- **Python 3.9+**
- pandas, numpy, scikit-learn
- LightGBM (LambdaRank re-ranker — optional, falls back to Logistic Regression)
- sentence-transformers (pgvector course embeddings — optional)
- supabase-py for database access

### Database
- **PostgreSQL** via Supabase (with pgvector extension for embeddings)
- Latest schema: `db_schema/13May_pgdump.sql`

---

## Dependencies

Full dependency lists are in each component's package file. Key packages are summarised below.

### Mobile App — npm (`mobile/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0.30 | React Native framework & build tooling |
| react-native | 0.81.5 | Native mobile UI runtime |
| react | 19.1.0 | UI library |
| @supabase/supabase-js | ^2.89.0 | Database & auth client |
| @react-navigation/native | ^7.1.17 | Screen navigation |
| @tanstack/react-query | ^5.87.4 | Server state & data fetching |
| expo-notifications | ^0.32.15 | Push notifications |
| expo-av / expo-video | ~16.0.8 / ^3.0.15 | Audio/video playback |
| expo-image-picker | ~17.0.10 | Profile photo upload |
| react-native-reanimated | ~4.1.1 | Animations |
| jest / jest-expo | ~29.7.0 / ~54.0.17 | Unit testing |

### Instructor Web Portal — npm (`web/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react / react-dom | ^18.3.1 | UI library |
| vite | ^5.4.19 | Build tool & dev server |
| typescript | ^5.8.3 | Static typing |
| tailwindcss | ^3.4.17 | Utility-first CSS |
| @radix-ui/* | various | Accessible UI primitives (shadcn/ui) |
| @supabase/supabase-js | ^2.39.0 | Database client |
| @tanstack/react-query | ^5.83.0 | Server state & data fetching |
| react-router-dom | ^6.30.1 | Client-side routing |
| recharts | ^2.15.4 | Analytics charts |
| react-hook-form + zod | ^7.61.1 / ^3.25.76 | Form handling & validation |
| pdfjs-dist | ^5.4.530 | PDF lesson viewer |
| vitest | ^4.0.18 | Unit & component testing |
| @playwright/test | ^1.58.2 | E2E & integration testing |

### ML Pipeline — pip (`backend/ml/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| pandas | 3.0.1 | Data manipulation |
| numpy | 2.4.2 | Numerical computing |
| scikit-learn | 1.8.0 | ML models & evaluation metrics |
| python-dotenv | 2.4.2 | Environment variable loading |
| supabase | 2.28.0 | Database access from Python |
| lightgbm | 4.6.0 | LambdaRank re-ranker *(optional)* |
| sentence-transformers | 5.2.3 | Course embedding generation *(optional)* |

### Backend — Deno / Supabase Edge Functions (`backend/supabase/`)

Edge Functions run on Deno and import dependencies via URL — no package file needed. Key Supabase built-ins used:

- `@supabase/supabase-js` — database queries and storage
- Deno standard library (`std/`) — HTTP, crypto utilities

---

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Python 3.9+
- Supabase CLI (for deploying Edge Functions): `npm install -g supabase`
- iOS Simulator (macOS only) or Android emulator / physical device

---

## Running the Mobile App

```bash
cd mobile
npm install
```

Copy the env template and fill in your values:

```bash
cp .env.example .env
# Edit .env with your Supabase URL, anon key, and Cognito credentials
```

Start the dev server:

```bash
npx expo start
```

From the Expo CLI menu: press `i` for iOS simulator, `a` for Android emulator, or `s` and scan the QR code with the Expo Go app on a physical device.

> **Note:** Push notifications require a development build (`npx expo run:ios` / `npx expo run:android`), not Expo Go.

---

## Running the Instructor Web Portal

```bash
cd web
npm install
```

Set up your environment variables (check your Supabase and Cognito dashboards):

```
VITE_COGNITO_REGION=
VITE_COGNITO_CLIENT_ID=
VITE_AUTH_STORAGE_KEY=
VITE_COGNITO_USER_POOL_ID=
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Tests

### Web — Unit & Component Tests (Vitest)

```bash
cd web
npm run test:run      # run once (CI mode)
npm run test          # watch mode
npm run test:ui       # Vitest browser UI
```

### Web — E2E Tests (Playwright)

Page-level tests use mocked APIs and require no extra setup:

```bash
cd web
npx playwright install   # first time only — installs browsers
npm run test:e2e         # all page-level tests
npm run test:e2e:ui      # Playwright interactive UI
npm run test:e2e:debug   # debug mode
```

Integration tests hit a real Supabase database. Set up a separate test project and copy `web/.env.test.example` to `web/.env.test` with its credentials:

```bash
npm run test:e2e:integration
```

### Mobile — Unit Tests (Jest)

```bash
cd mobile
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

---

## ML Pipeline (Recommendation System)

The ML pipeline is optional for running the app — it retrains the recommendation model and refreshes course embeddings.

```bash
cd backend/ml
pip install -r requirements.txt
```

Create a `.env` file in `backend/ml/`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Train the re-ranker model (writes output to `model_weights.json`):

```bash
python train_reranker.py
```

Generate course embeddings (requires `sentence-transformers`):

```bash
python embed_courses.py
```

Evaluate recommendation quality:

```bash
python evaluate.py
```

---

## Database Schema

The latest full schema snapshot is at:

```
db_schema/13May_pgdump.sql
```

This file (dated 13 May 2026) contains all tables, functions, RLS policies, triggers, and indexes. It was exported from the Supabase Schema Visualizer using "Copy as SQL".

To apply it to a fresh Supabase project, paste the contents into the Supabase SQL editor, or use `psql`:

```bash
psql -h <db-host> -U postgres -d postgres -f db_schema/13May_pgdump.sql
```

Incremental migration files for specific features are also in `db_schema/`:

| File | Description |
|------|-------------|
| `2026-02-20_quiz_completion_exhausted_attempts.sql` | Quiz attempt exhaustion logic |
| `2026-03-05_add_graded_variations.sql` | Graded answer variations |
| `2026-03-18_short_answer_quiz_completion.sql` | Short-answer quiz completion |
| `direct_messages.sql` | Direct messaging tables |
| `create_get_direct_message_conversations_rpc.sql` | DM RPC function |

---

## Deploying Edge Functions

```bash
cd backend/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy
```

To deploy a single function:

```bash
supabase functions deploy <function-name>
```
