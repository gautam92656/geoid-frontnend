# Next.js Starter Template

A minimal frontend starter with authentication flows and a sample CRUD page.

## Features

- **Auth:** Login, signup (`/register`), forgot password, reset password, email verification
- **CRUD example:** Items page at `/items` (list, create, update, delete)
- **Stack:** Next.js 16, React 19, Redux Toolkit, Axios, Bootstrap 5

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, forgot/reset password
│   └── (main)/          # Home + Items CRUD
├── modules/
│   ├── auth/            # Auth forms, API, types
│   └── items/           # Sample CRUD module
├── shared/
│   ├── components/      # UI + layout
│   └── services/        # apiClient
└── store/               # Redux auth state
```

## Auth routes

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Sign up |
| `/forgot-password` | Request password reset |
| `/reset-password?token=…` | Set new password |
| `/verify-account?email=…` | Email OTP verification |

## CRUD example

The Items module at `/items` expects these API endpoints (relative to `/api/v1`):

- `GET /items` — list items
- `POST /items` — create item
- `PATCH /items/:id` — update item
- `DELETE /items/:id` — delete item

Use it as a template when adding new resources.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run format` — Prettier
