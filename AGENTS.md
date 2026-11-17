# AGENTS.md — Bistro Eleven Project Rules

Guidelines for AI coding agents and team contributors working on the **Bistro Eleven** capstone repository.

## 1. Tech Stack & Deployment
- **Web Frontend (`/src`)**: React + Vite (`HashRouter`), deployed to GitHub Pages (`https://marcy270208.github.io/bistro-eleven/`).
- **Mobile App (`/mobile-app`)**: React Native + Expo SDK 58 (tested on Android via Expo Go), targeting iOS & Android.
- **Backend API (`/backend`)**: Node.js + Express, deployed on Vercel (`https://bistro-eleven-97kt.vercel.app`).
- **Database**: Turso Cloud SQLite (`@libsql/client`) — shared by both Web and Mobile.
- **Image Storage**: Cloud image hosting (`iili.io` / Freeimage API via `POST /api/upload`); only URLs are stored in the database.

## 2. Folder Layout
- `src/` — Web application pages, components, and styles (`src/pages/Dashboard.jsx`, `Home.jsx`, `AccountSettings.jsx`, etc.)
- `backend/` — Express app, routes (`auth.js`, `dishes.js`, `orders.js`, `reviews.js`, `ai.js`, `upload.js`), middleware, and DB helpers
- `mobile-app/` — Expo React Native client (`App.js`, `src/lib/api.js`, `src/lib/storage.js`, `src/screens/*`)
- `.github/workflows/` — GitHub Pages CI/CD deployment

## 3. Rules Agents Must Follow
1. **Never commit secrets or `.env` files**: Keep `JWT_SECRET`, `TURSO_AUTH_TOKEN`, `GEMINI_API_KEY`, and `EXPO_PUBLIC_API_URL` / `VITE_API_URL` in local `.env` (gitignored) or platform env vars. Always maintain `.env.example` files.
2. **Never hardcode API URLs in screens/pages**:
   - Web must read `import.meta.env.VITE_API_URL` via `src/lib/api.js`.
   - Mobile must read `process.env.EXPO_PUBLIC_API_URL` via `mobile-app/src/lib/api.js`.
3. **Never store JWT tokens in plain `AsyncStorage` on mobile**: Always use `expo-secure-store` (`mobile-app/src/lib/storage.js`). `AsyncStorage` is only for non-sensitive preferences (such as `lang`).
4. **Never wipe or re-seed production database**: Use additive `ALTER TABLE` migrations for schema changes. Never run seed scripts against production Turso.
5. **Preserve role boundaries**: Admin role in this project is `'administrator'` (not `'admin'`). Protected endpoints must enforce `auth` (`401`) and `requireRole('administrator')` (`403`). Web `/admin` route must redirect non-administrators.
6. **Verify before pushing**:
   - Web changes: run `npm run build` in repo root.
   - Mobile changes: run `npx expo export --platform android --output-dir dist-check` (and clean up `dist-check`) in `mobile-app/`.
