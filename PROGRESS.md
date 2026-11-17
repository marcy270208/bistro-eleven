# PROGRESS.md — Bistro Eleven Capstone Progress & Handover

Last Updated: 2026-11-17
Repository: `https://github.com/marcy270208/bistro-eleven`

## Live Deployments
- **Web App (GitHub Pages)**: `https://marcy270208.github.io/bistro-eleven/`
- **Backend API (Vercel)**: `https://bistro-eleven-97kt.vercel.app`
- **Database**: Turso Cloud SQLite (shared across Web & Mobile)

## Team Ownership
- **Marcy Priscilla Simanjuntak** — System Integration, Deployment & CI/CD (Vercel, Turso Cloud, GitHub Pages), AI Concierge & Full-Stack Features
- **Margaret E. Sihombing** — Backend API, Role-based Access Control, Sales Excel Export & Web Dashboard
- **Vicencia Chasandra Imanuel** — Mobile App (Expo React Native), Web UI/UX & Profile/Review Features

---

## Completed Milestones

### 1. Backend & Database (Checklist §A, §B, §F)
- Deployed Express API on Vercel connected to Turso Cloud SQLite.
- Implemented JWT authentication (`POST /api/auth/login`, `register`, `GET /api/auth/me`, `PUT /api/auth/profile`, `PUT /api/auth/password`).
- Implemented role-gated endpoints (`401` unauthenticated, `403` wrong role) using role `'administrator'` vs `'client'`.
- Configured explicit CORS allowing GitHub Pages origin and local dev origins.
- Added cloud image upload (`POST /api/upload`) storing only returned HTTPS URLs in Turso.
- Implemented AI Concierge (`POST /api/ai/chat`) with server-side API key + Head Chef escalation (`POST /api/ai/escalate`, `GET /api/ai/inquiries`, `POST /api/ai/inquiries/:id/reply`).

### 2. Web Application (Checklist §C, §E)
- Connected web app to deployed Vercel API via `VITE_API_URL`.
- Separated `/admin` route (restricted to `'administrator'`) and `/dashboard` (client orders), with automatic redirects.
- Added bilingual EN/ID language switcher across UI and AI Concierge.
- Added loading, empty, and error/retry states on all data-driven screens.
- Added Admin review moderation (delete client reviews) and formatted **`.xlsx` Sales Report Export** (`xlsx-js-style`) with date range filters (Specific Month/Year, Last 1 Year, Custom Range, All Time), colored header, borders, wrap text, and AutoFilter.
- Added immediate profile photo removal (`Remove profile photo`) in Account Settings.
- Refined Home UI (removed low-contrast hero overlay, added contrast & balanced copy to `.story` band, hid AI floating button when cart drawer opens, spaced review cards).

### 3. Mobile Application — Expo React Native (Checklist §D, §E)
- Scaffolded Expo SDK 58 app in `/mobile-app` sharing the same Vercel backend and Turso database.
- Centralized API client (`mobile-app/src/lib/api.js`) reading `EXPO_PUBLIC_API_URL` from `.env` with automatic `401` logout/redirect.
- Stored JWT securely in `expo-secure-store`; stored language preference (`en`/`id`) in `AsyncStorage`.
- Built client flows: Menu List (search, favorites, pull-to-refresh) → Dish Detail → Cart & Checkout (`Delivery`/`Dine-in`, `Cash`/`QRIS`/`Bank transfer`) → My Orders → Reviews → AI & Live Chef Concierge → Account Settings (photo upload & instant photo removal).
- Built Admin / Chef views on mobile:
  - `OrdersScreen`: switches to **Customer Orders Queue** with `Active`/`Completed`/`All` filters and live status updates (`PATCH /api/orders/:code/status`).
  - `ReviewsScreen`: hides customer review form and enables **Delete Review** for `'administrator'`.
  - `AiScreen`: switches to **Kitchen Desk · Head Chef** so admin can view & reply to escalated customer inquiries.

---

## Bugs Found & Fixed
1. **GitHub Pages CI race condition** (`e8b80ba`): Separated `build` and `deploy` jobs in `.github/workflows/deploy.yml`.
2. **AI floating button overlapping Cart Checkout button** (`60dfe0c`): Hid floating AI button while cart drawer is open.
3. **CSV export crammed into Column A in Indonesian Excel** (`8550e18`, `06b1f60`): Replaced CSV with styled `.xlsx` workbook via `xlsx-js-style`.
4. **Profile photo could not be removed directly** (`2f328f4`): Added instant `Remove photo` action on both Web and Mobile calling `PUT /api/auth/profile` with `photo: null`.
5. **Mobile Add to Cart not updating cart count** (`57b8809`): `MenuScreen`/`DishDetailModal` passed `dish.id` while `handleAddToCart` expected an object; fixed `handleAddToCart` to accept both ID and object.
6. **Mobile Android keyboard covering AI input & admin role mismatch** (`57b8809`): Enabled `KeyboardAvoidingView` `behavior="height"` + auto-scroll on Android and fixed role check from `'admin'` to `'administrator'`.

---

## Remaining Before Final Demo
- [ ] Test Expo Go mobile app on a physical **iPhone (iOS)** and on **mobile data (Wi-Fi off)**.
- [ ] Verify GitHub Issues, PR review history, and Design Document (§1–§8 with latest web & mobile screenshots).
- [ ] Rehearse 5-minute demo script and record backup demo video.
