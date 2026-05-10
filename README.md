# Team Task Manager 🚀

A full-stack SaaS project & task management application built for freelancers managing clients and teams.

**Live Stack:** React.js · Node.js · Express · PostgreSQL (Supabase) · Firebase Auth · Socket.io · Recharts

---

## Features

- ✅ Firebase Auth (Email + Google)
- 📁 Multi-project workspace management
- 🗂 Kanban board + List view with drag-and-drop
- ✅ Task CRUD with priority, labels, due dates, comments, activity log
- ⏱ Time tracking (start/stop timer + manual entry)
- 📊 Analytics dashboard (4 chart types)
- 🔔 Real-time updates via Socket.io
- 📧 Email notifications (invites, assignments, overdue)
- 👥 Role-based access (Admin / Member)
- 🚀 Deployed on Railway (backend) + Vercel (frontend)

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Firebase project

### 1. Clone & install
```bash
git clone https://github.com/Shxvm1437/team-task-manager.git
cd team-task-manager
npm run install:all
```

### 2. Configure server
```bash
cd server
cp .env.example .env
# Fill in: DATABASE_URL, FIREBASE_*, JWT_SECRET, EMAIL_*, CLIENT_URL
```

### 3. Configure client
```bash
cd client
cp .env.example .env.local
# Fill in: REACT_APP_API_URL, REACT_APP_FIREBASE_*
```

### 4. Start development
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

The database tables are created automatically on first server start.

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password + Google
4. Go to **Project Settings → Service Accounts → Generate new private key** (for server)
5. Go to **Project Settings → General → Your apps → Web app** (for client)

---

## Supabase (PostgreSQL) Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string → URI**
3. Copy the connection string as `DATABASE_URL`

---

## Railway Deployment (Backend)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `server/` directory (or set root directory to `server`)
3. Add environment variables from `server/.env.example`
4. Railway auto-detects Node.js and deploys

---

## Vercel Deployment (Frontend)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `client`
3. Add environment variables from `client/.env.example`
4. Set `REACT_APP_API_URL` to your Railway backend URL

---

## Project Structure

```
team-task-manager/
├── server/
│   └── src/
│       ├── config/         # DB + Firebase
│       ├── controllers/    # Route handlers
│       ├── middleware/     # Auth + error handler
│       ├── models/         # DB migrations
│       ├── routes/         # Express routes
│       └── services/       # Email, notifications, cron
├── client/
│   └── src/
│       ├── api/            # Axios API calls
│       ├── components/     # Reusable components
│       ├── context/        # Auth + Socket context
│       └── pages/          # Route pages
└── .github/workflows/      # CI/CD
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/:id/projects` | List projects |
| POST | `/api/projects/:id/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/time/start` | Start timer |
| GET | `/api/projects/:id/analytics` | Project analytics |
| GET | `/api/notifications` | User notifications |

Full API reference in `server/src/routes/index.js`

---

## Built by Shivam Nigam
