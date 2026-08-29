# ⚡ TechQuiz AI - Full-Stack AI-Powered Learning & Assessment Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![Google Gemini LLM](https://img.shields.io/badge/Gemini_LLM-2.5--Flash-8E75B2.svg)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)

**TechQuiz AI** is a production-grade, full-stack web application designed for developer candidate assessment and technical interview preparation. Built with the **MERN Stack** (MongoDB, Express.js, React 19, Node.js) and TypeScript, it integrates **Google Gemini AI (`@google/genai`)** to dynamically generate multiple-choice questions, provide interactive tutoring, analyze student skill gaps, and compile server-side PDF study notes.

---

## 🌟 What This Platform Can Perform (Core Capabilities)

### 🧠 1. Automated AI Question Generation (Admin Suite)
- Generates schema-validated JSON multiple-choice questions (MCQs) on any software engineering topic (e.g., React Hooks, System Design, SQL Indexing, Git Internals).
- Guarantees strict structure (4 options, 0-based correct index, detailed explanations, and point weights) using Gemini's native `responseSchema` enforcement.

### 💬 2. Interactive AI Tutor Chatbot & Doubt Solver
- **Doubt Solver:** Explains wrong choices, reveals misconceptions, and provides real-world engineering analogies for any quiz question.
- **Floating AI Tutor:** Multi-turn conversational chatbot that maintains dialogue history in MongoDB to guide candidates through complex technical topics.

### 📄 3. Server-Side PDF Study Guide Compiler
- Compiles personalized downloadable A4 PDF study notes upon quiz completion.
- Uses headless **Puppeteer** to dynamically inject performance statistics, wrong answer breakdowns, explanations, and AI study recommendations into a responsive print template.

### ⏰ 4. Automated Daily Challenge Scheduler
- Features a **Node-Cron background service** running at midnight (`0 0 * * *`) that generates fresh 10-question daily challenges across rotating technical topics.
- Includes automatic startup database verification and seed fallback to guarantee an active daily challenge is available at all times.

### 📊 5. User Analytics & Visual Performance Charts
- **Recharts Integration:** Visualizes category mastery radar charts, activity progress line graphs, and accuracy percentage ratios.
- **Streak & Badge System:** Tracks daily play streaks and unlocks digital badges (e.g., *First Blood*, *Quiz Master*, *Daily Champion*).

### 🔐 6. Enterprise-Grade Security & Dual-Token Authentication
- Combined **short-lived in-memory JWT access tokens** with **rotated HttpOnly/Secure refresh cookies**.
- Active database session tracking (IP address & User-Agent) with **SHA-256 hashed OTP verification** and self-destructing **MongoDB TTL expiration indexes**.

---

## ⚡ Key Engineering & Architecture Highlights

> 📖 **Complete System Design Document:** For a detailed architectural breakdown, request lifecycle traces, sequence diagrams, and SDE interview cheat-sheets, see [ARCHITECTURE.md](ARCHITECTURE.md).

### 1. Robust Rate-Limit Failover API Key Rotator
Gemini's Free Tier enforces a strict `15 RPM` (Requests Per Minute) quota. To prevent API exhaustion:
- The backend implements a round-robin **API Key Rotator** ([gemini.ts](backend/src/config/gemini.ts)) registering multiple fallback keys (`GEMINI_KEY_1`, `GEMINI_KEY_2`, `GEMINI_KEY_3`, `GEMINI_API_KEY`).
- Operations are wrapped in `withGeminiFailover()`. On receiving transient `429 Rate Limit`, `503 Service Unavailable`, or invalid key responses, it applies **jittered exponential backoff**, rotates to the next available healthy key, and retries seamlessly.

### 2. Axios Interceptor Token Auto-Renewal
- The client-side Axios instance ([api.ts](frontend/src/utils/api.ts)) stores access tokens purely in-memory.
- An interceptor catches `401 Unauthorized` responses, silently triggers `/api/auth/refresh` to rotate cookies, acquires a new access token, and retries the original request transparently.

---

## 🛠️ Complete Technology Stack

| Category | Technologies / Libraries Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & UI/UX** | Tailwind CSS v4, Framer Motion, Lucide React Icons |
| **Data Visualization** | Recharts (Radar charts, Line graphs, Bar charts) |
| **Backend Runtime & Framework** | Node.js (v18+), Express.js, TypeScript |
| **Database & ORM** | MongoDB, Mongoose ORM (Mongoose 8) |
| **Generative AI & LLM** | Google Gemini API (`@google/genai` SDK v2.8) |
| **Document Processing** | Puppeteer (Headless PDF compiler) |
| **Background Tasks** | Node-Cron (Midnight cron scheduler) |
| **Security & Auth** | JSON Web Tokens (JWT), BcryptJS, Cookie-Parser, Express-Rate-Limit, Zod |
| **Email & Delivery** | Nodemailer (SMTP OTP delivery) |

---

## 📁 Repository Folder Structure

```
01_Project/
├── backend/
│   ├── src/
│   │   ├── config/       # Database, Nodemailer setup, Gemini failover rotator
│   │   ├── controllers/  # Auth, Quiz CRUD, AI tutors, user analytics controllers
│   │   ├── middleware/   # JWT verification, Admin authorization, Zod schema validator, Rate limiter
│   │   ├── models/       # Mongoose Schemas (User, Session, Otp, Quiz, Question, Attempt, Chat, Badge)
│   │   ├── routes/       # Express REST API route definitions
│   │   ├── services/     # Cron scheduler, Puppeteer PDF compiler
│   │   ├── app.ts        # Express app middleware configuration
│   │   └── server.ts     # Main entry point (HTTP API server)
│   ├── tsconfig.json     # Strict TypeScript backend configuration
│   ├── package.json
│   └── .env.example      # Backend environment variables template
├── frontend/
│   ├── src/
│   │   ├── assets/       # Static branding assets and icons
│   │   ├── components/   # Navbar, Footer, Glassmorphic UI components, AI recommendation widgets
│   │   ├── context/      # AuthContext state provider
│   │   ├── pages/        # Auth, VerifyOtp, Dashboard, QuizAttempt, QuizResult, Leaderboards, Admin
│   │   ├── utils/        # Axios API Client with 401 refresh interceptors
│   │   ├── App.tsx       # Route definitions & security guards
│   │   ├── index.css     # Tailwind CSS v4 custom variables & animations
│   │   └── main.tsx      # DOM Entrypoint
│   ├── index.html        # Main HTML layout (SEO optimized)
│   ├── tsconfig.json     # React TypeScript configuration
│   ├── vite.config.ts    # Vite bundler configuration
│   └── package.json
└── README.md
```

---

## 🗄️ Database Schema Design (MongoDB & Mongoose)

1. **User (`users`):** `username`, `email`, `passwordHash` (bcrypt), `role` (`user` \| `admin`), `isVerified`, `streak`, `lastActiveDate`, `badges`.
2. **Session (`sessions`):** `userId`, `refreshTokenSignature`, `ipAddress`, `userAgent`, `expiresAt` (MongoDB TTL index).
3. **Otp (`otps`):** `email`, `otpHash` (SHA-256), `expiresAt` (TTL index set to 10 minutes).
4. **Quiz (`quizzes`):** `title`, `description`, `category`, `difficulty` (`basic` \| `intermediate` \| `advanced`), `timeLimitPerQuestion`, `isActive`, `isDailyChallenge`, `creator`.
5. **Question (`questions`):** `quizId`, `text`, `options` (4 choices), `correctIndex` (0-3), `explanation`, `points`.
6. **Attempt (`attempts`):** `userId`, `quizId`, `score`, `timeTaken`, `mode` (`solo`), `aiFeedback`, `questionsAttempted` (audited choices & response times).
7. **Chat (`chats`):** `userId`, `attemptId`, `messages` (role `user` \| `model`, text, timestamp).
8. **Badge (`badges`):** `badgeId`, `name`, `description`, `iconCode`, `unlockCondition`.

---

## 🔌 API Documentation (Express REST Routes)

### 🔑 Authentication Routes (`/api/auth`)
* `POST /register`: Registers inactive user; hashes 6-digit OTP, sends email, returns registration metadata.
* `POST /verify-otp`: Validates SHA-256 hash of OTP. Sets `isVerified: true` and deletes OTP document.
* `POST /login`: Validates credentials. Sets `refreshToken` HttpOnly cookie & returns short-lived access token JWT.
* `POST /refresh`: Verifies cookie refresh token against active sessions, rotates signature, and issues new access token.
* `POST /logout`: Invalidates active session in MongoDB and clears cookie containers.

### 📝 Quiz Management Routes (`/api/quizzes`)
* `GET /`: Retrieves active standard quizzes.
* `GET /:id`: Retrieves quiz metadata and questions.
* `POST /:id/submit`: Audits choices, calculates actual marks score, updates streaks, checks badges, and creates Attempt document.
* `GET /attempt/:attemptId`: Retrieves audited attempt stats and answers.
* `GET /attempt/:attemptId/pdf`: Puppeteer compiles a styled A4 PDF study guide binary for download.
* **Admin Registry (`/api/quizzes/admin/*`):**
  * `GET /admin/list`: Lists all quizzes.
  * `POST /admin/create`: Creates a new quiz shell.
  * `PUT /admin/update/:id`: Edits quiz parameters.
  * `DELETE /admin/delete/:id`: Removes quiz & attached questions.
  * `POST /admin/question/add`: Adds a manual MCQ.
  * `POST /admin/question/bulk-import`: Imports bulk question arrays.

### 🧠 Gemini AI Routes (`/api/ai`)
* `POST /generate-questions` (Admin): Generates schema-validated JSON question lists via Gemini.
* `POST /doubt-solver`: Provides explanations & technical analogies for incorrect options.
* `GET /analyze-attempt/:attemptId`: Generates weak topic study guide reports.
* `POST /chat-tutor`: Multi-turn conversational chat with saved MongoDB context.

### 👤 User Analytics (`/api/users`)
* `GET /profile`: Summarizes total points, quizzes taken, and daily streak.
* `GET /progress`: Aggregates category correct/incorrect ratio datasets for Recharts radar maps.
* `GET /badges`: Compares active badge logs against unlocked listings.
* `GET /admin/analytics` (Admin): Compiles platform metrics and chart data.

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Google Gemini API Key(s)** ([Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
```
Fill in `.env` variables:
```env
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/techquiz-ai

JWT_SECRET=your_long_access_token_secret
REFRESH_TOKEN_SECRET=your_long_refresh_token_secret

# Gemini Failover Rotator Keys
GEMINI_KEY_1=first_gemini_key
GEMINI_KEY_2=second_gemini_key
GEMINI_KEY_3=third_gemini_key
GEMINI_API_KEY=fallback_gemini_key

CLIENT_URL=http://localhost:5173
```
Install dependencies and run:
```bash
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the hot-reloading dev server at `http://localhost:5173`.

---

## 🚀 Future Work & Product Roadmap

To further elevate **TechQuiz AI** into a full enterprise interview platform, the following features are planned:

- [ ] **Redis In-Memory Caching**: Cache session tokens and duplicate Gemini AI query outputs to reduce database load and cut down API latency.
- [ ] **Adaptive AI Difficulty Engine**: Implement dynamic item-response theory (IRT) algorithms that adjust subsequent question difficulty automatically based on real-time candidate accuracy.
- [ ] **Automated Testing Suite**: Introduce comprehensive unit tests (using Vitest/Jest) for backend controllers and end-to-end integration tests (using Playwright/Cypress).
- [ ] **Docker Containerization**: Add a root `Dockerfile` and `docker-compose.yml` orchestrating Node.js API, React frontend, and local MongoDB container deployments.

---

## 👨‍💻 Author & Maintainer

Developed by **Mohd Abdullah Khan**  
- **GitHub**: [@Mohd-Abd-Khan](https://github.com/Mohd-Abd-Khan)  
- **Project Repository**: [TechQuiz_AI](https://github.com/Mohd-Abd-Khan/TechQuiz_AI)
