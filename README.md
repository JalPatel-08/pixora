# Pixora

A full-stack Instagram-style social media platform built with React, Node.js, MongoDB, and Socket.io.

---

## Features

**Authentication**
- Register / Login / Logout
- Email verification
- Forgot & reset password
- JWT access + refresh token rotation
- Account lockout after failed attempts

**Social**
- Create posts with multiple images/videos
- Stories (24h expiry, views, likes, replies)
- Like, comment, save posts
- Follow / unfollow users
- Explore feed & user search
- Share posts via direct message

**Messaging**
- Real-time direct messages (Socket.io)
- Text, emoji, image, video messages
- Media preview before sending
- Upload progress indicator
- Typing indicators
- Online presence & last seen
- Read receipts
- Unread badge count

**UI**
- Dark / light mode
- Fully responsive (mobile-first)
- Skeleton loading states
- Empty states
- Framer Motion animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| State | TanStack React Query |
| Routing | React Router v7 |
| Animations | Framer Motion |
| Backend | Node.js, Express |
| Database | MongoDB Atlas + Mongoose |
| Real-time | Socket.io |
| Media | Cloudinary |
| Auth | JWT (access + refresh), bcrypt |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Vercel (client) + Render (server) |

---

## Screenshots

> _Add screenshots here_

| Feed | Messages | Profile |
|---|---|---|
| ![feed](./screenshots/feed.png) | ![messages](./screenshots/messages.png) | ![profile](./screenshots/profile.png) |

---

## Project Structure

```
thisone/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # Axios instance
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth, Socket, Theme, Toast
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Route-level pages
│   │   ├── services/        # API service functions
│   │   └── utils/           # Formatters, helpers
│   ├── .env.example
│   └── vercel.json
│
└── server/                  # Express backend
    ├── src/
    │   ├── config/          # DB, Cloudinary, Email
    │   ├── controllers/     # Route handlers
    │   ├── middlewares/     # Auth, upload, validate, errors
    │   ├── models/          # Mongoose schemas
    │   ├── routes/          # Express routers
    │   ├── services/        # Token service
    │   └── socket/          # Socket.io setup
    └── .env.example
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Gmail account with App Password

### 1. Clone

```bash
git clone https://github.com/your-username/pixora.git
cd pixora
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

### 3. Frontend

```bash
cd client
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

---

## Environment Variables

### Backend (`server/.env`)

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pixora

JWT_ACCESS_SECRET=<random_secret>
JWT_REFRESH_SECRET=<random_secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_gmail>
SMTP_PASS=<gmail_app_password>

CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `server`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `npm start`
6. Add all environment variables from `server/.env` in the Render dashboard
7. Set `NODE_ENV=production`
8. Set `CLIENT_URL=https://your-app.vercel.app`

### Frontend → Vercel

1. Import your repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `client`
3. Set **Framework Preset** to `Vite`
4. Add environment variables:
   - `VITE_API_URL=https://your-api.onrender.com/api`
   - `VITE_SOCKET_URL=https://your-api.onrender.com`
5. Deploy

> **Important:** After deploying the backend, update `CLIENT_URL` on Render to your Vercel URL, then redeploy the backend.

---

## Render Configuration

| Setting | Value |
|---|---|
| Service Type | Web Service |
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Node Version | 18 |

**Environment Variables on Render:**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
CLIENT_URL=https://your-app.vercel.app
```

---

## Vercel Configuration

| Setting | Value |
|---|---|
| Framework | Vite |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Environment Variables on Vercel:**
```
VITE_API_URL=https://your-api.onrender.com/api
VITE_SOCKET_URL=https://your-api.onrender.com
```

The `vercel.json` in the client folder handles SPA routing automatically.

---

## Future Roadmap

- [ ] Post comments with media
- [ ] Reels / short video feed
- [ ] Group messaging
- [ ] Push notifications (Web Push API)
- [ ] Post scheduling
- [ ] Analytics dashboard
- [ ] Verified badges
- [ ] Hashtag search
- [ ] Location tagging

---

## License

MIT
