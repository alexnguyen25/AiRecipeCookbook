# AI Recipe Cookbook

A full-stack web application for managing a home kitchen: track pantry items, generate recipes with AI, save and browse recipes, plan meals, and maintain a shopping list. The backend is a REST API built with **Node.js** and **Express**; data lives in **PostgreSQL**. The client is a **React** SPA built with **Vite**, **React Router**, **Tailwind CSS**, and **Axios**.

This repository was built as **practice for full-stack development on the PERN stack** (PostgreSQL, Express, React, Node.js).

## Credits and learning context

- **Frontend UI template:** The React interface was provided as a starting **template by [Time To Program](https://timetoprogram.com/)**. Application logic, API integration, authentication flow, and backend work were implemented on top of that template as part of this learning project.
- **Purpose:** Hands-on practice wiring a modern React client to a Node/Express API, PostgreSQL, and third-party AI (Google Gemini) for recipe generation.

## Features

- **Authentication:** Sign up, log in, JWT-protected routes, persisted session via `localStorage`.
- **Dashboard:** Overview stats (recipes, pantry, meal plans) and recent activity.
- **Pantry:** Add, list, and remove items; optional expiry tracking and “expiring soon” insight.
- **AI recipe generator:** Create recipe ideas from prompts using the Google Gemini API; save generated recipes to your collection.
- **My recipes:** List, view, edit, and delete saved recipes with ingredients and instructions.
- **Meal planner:** Schedule recipes on a calendar by meal type (breakfast, lunch, dinner).
- **Shopping list:** Track ingredients to buy, with categories and check-off state.
- **Settings / profile:** User preferences aligned with the schema (dietary restrictions, allergies, cuisines, servings, units, etc.).

## Tech stack

| Layer        | Technologies |
|-------------|---------------|
| **Database** | PostgreSQL (`pg` driver, raw SQL; migration via `config/schema.sql`) |
| **Backend**  | Node.js (ES modules), Express 5, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv` |
| **AI**       | Google Gemini (`@google/genai`) |
| **Frontend** | React 19, Vite 7, React Router 7, Tailwind CSS 4, Axios, `react-hot-toast`, `@dnd-kit` (drag-and-drop where used) |

> **Note:** `package.json` lists `sequelize` as a dependency; the active database layer in this project uses the `pg` pool and SQL files. If you extend the app, you can align on one persistence approach.

## Repository layout

```
AiRecipeCookbook/
├── backend/
│   ├── config/          # db.js, schema.sql
│   ├── controllers/
│   ├── middleware/
│   ├── routes/          # auth, users, pantry, recipes, meal-plans, shopping-list
│   ├── utils/           # e.g. Gemini helpers
│   ├── migrate.js       # applies schema.sql to DATABASE_URL
│   └── server.js
└── frontend/
    └── ai-recipe-generator/   # Vite React app
        └── src/
            ├── pages/
            ├── components/
            ├── context/
            └── services/api.js
```

## Prerequisites

- **Node.js** (v18+ recommended; project has been run on newer LTS versions)
- **PostgreSQL** (local install, Docker, or a hosted provider such as Neon, Supabase, or Railway)
- A **Google AI (Gemini) API key** for recipe generation (`GEMINI_API_KEY`)

## Environment variables

### Backend (`backend/.env`)

Create `backend/.env` (this path is gitignored). Example:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME

# Set to any truthy value if your host requires SSL (e.g. many cloud providers)
# DATABASE_SSL=1

# Secret for signing JWTs (use a long random string in production)
JWT_SECRET=your-secret-key

# Google Gemini (AI recipe generation)
GEMINI_API_KEY=your-gemini-api-key

# Optional: server port (default 8000)
# PORT=8000
```

### Frontend (`frontend/ai-recipe-generator/.env`)

Optional. If omitted, the client defaults to `http://localhost:8000/api`.

```env
VITE_API_URL=http://localhost:8000/api
```

Point `VITE_API_URL` at your deployed API base URL in production (must include `/api` if that is how the backend is mounted).

## Database setup

1. Create an empty PostgreSQL database.
2. Set `DATABASE_URL` (and `DATABASE_SSL` if required) in `backend/.env`.
3. From the `backend` directory, run:

```bash
npm install
npm run migrate
```

This executes `config/schema.sql` and creates tables (users, preferences, pantry, recipes, meal plans, shopping list, etc.).

## Running locally

**Terminal 1 — API**

```bash
cd backend
npm install
npm run dev
```

The API listens on **port 8000** by default (`http://localhost:8000`). A GET to `/` returns a short JSON health message.

**Terminal 2 — Frontend**

```bash
cd frontend/ai-recipe-generator
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Ensure `VITE_API_URL` matches your API if not using defaults.

## API overview

Base path: `/api` (combined with `VITE_API_URL` on the client).

| Area           | Prefix              | Notes |
|----------------|---------------------|--------|
| Auth           | `POST /api/auth/login`, `POST /api/auth/signup` | Public |
| Users / profile| `/api/users/...`    | JWT required |
| Pantry         | `/api/pantry/...`   | JWT required |
| Recipes        | `/api/recipes/...`  | Includes `POST /generate` for AI; JWT required |
| Meal plans     | `/api/meal-plans/...` | JWT required |
| Shopping list  | `/api/shopping-list/...` | JWT required |

For exact routes and handlers, see `backend/routes/` and `backend/controllers/`.

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| Backend | `npm run dev` | Nodemon + `server.js` |
| Backend | `npm start` | Production-style `node server.js` |
| Backend | `npm run migrate` | Apply `config/schema.sql` |
| Frontend | `npm run dev` | Vite dev server |
| Frontend | `npm run build` | Production build to `dist/` |
| Frontend | `npm run preview` | Preview production build |

## Production notes

- Use strong `JWT_SECRET` and HTTPS in production.
- Restrict CORS in `server.js` to your frontend origin instead of open `cors()` if you deploy publicly.
- Store secrets only in environment variables or your host’s secret manager, never in the repo.

## License

Specify a license here if you add one (e.g. MIT). The Time To Program template may have its own terms; respect those for any original template assets.
