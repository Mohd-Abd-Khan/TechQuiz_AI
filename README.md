# TechQuiz AI - Full-Stack AI-Powered Learning Platform

TechQuiz AI is a production-grade, full-stack web application built using the **MERN Stack** (MongoDB, Express.js, React.js, Node.js) and integrated with the **Google Gemini API** (using the new `@google/genai` SDK). 

It features automated AI question generation, a real-time multiplayer duel system, a floating AI tutor chatbot, automated PDF study guides compiler, and custom user progress dashboard analytics.

---

## ⚡ Architectural Highlights & Portfolio Showcase

This project resolves critical real-world engineering bottlenecks to demonstrate senior-level engineering standards:

### 1. Robust Rate-Limit Failover API Key Rotator
Gemini's Free Tier has a strict `15 RPM` (Requests Per Minute) limit. To scale this, the backend features an **API Key Rotator** inside [gemini.ts](backend/src/config/gemini.ts).
* It registers three separate Gemini API keys: `GEMINI_KEY_1`, `GEMINI_KEY_2`, and `GEMINI_KEY_3`.
* It wraps AI operations in `withGeminiFailover()`. If a `429 ResourceExhausted` quota error is encountered, the backend automatically logs the exception, rotates to the next available healthy key, and retries the operation seamlessly without dropping requests.

### 2. Live Match Token Protection Safeguard
During live multiplayer matches, simultaneous AI calls could exhaust limits immediately.
* **The Protection:** Generative AI workloads (interactive Tutor Chatbot and Doubt Solver) are strictly disabled during multiplayer match sessions.
* **The Enforcement:** The backend API guards check and verify `attempt.mode === 'solo'`. Non-solo sessions block AI widgets, ensuring lightweight real-time WebSocket sync.

### 3. Highly Secure JWT & HttpOnly Session Auth
Implemented a robust, stateless-to-stateful authentication flow:
* User registration triggers a temporary inactive record and generates a 6-digit verification OTP. The SHA-256 hashed OTP is stored in MongoDB with a `10-minute TTL index` that self-destructs.
* Successful login writes a session document (tracking IP address and User-Agent) and sets a rotated `HttpOnly`, `Secure`, `SameSite=Strict` cookie containing a `refreshToken`.
* The client receives a short-lived (15-minute) JWT Access Token in-memory. An Axios response interceptor intercepts `401 Unauthorized` states, calls `/api/auth/refresh` to rotate the cookie, and obtains a new access token seamlessly.

### 4. Puppeteer Server-Side PDF Compiler
When users click "Download Study Notes", the backend launches a headless Puppeteer browser pipeline, renders a personalized HTML template loaded with AI progress feedback, compile errors, and score charts, and generates a printable A4 PDF guide.

---

## 📁 Repository Folder Structure

```
01_Project/
├── backend/
│   ├── src/
│   │   ├── config/       # Databases, Mailers, Socket.io setup, Gemini failover rotator
│   │   ├── controllers/  # Auth, Quiz CRUD, AI tutors, user dashboard controllers
│   │   ├── middleware/   # JWT verification, Admin privileges, Zod validator, Rate limiter
│   │   ├── models/       # Mongoose Schemas (User, Session, Otp, Quiz, Question, Attempt, Chat, Badge)
│   │   ├── services/     # Cron scheduler, Puppeteer PDF compiler
│   │   ├── app.ts        # Express app configuration & middlewares
│   │   └── server.ts     # Main entry point (HTTP & WebSocket servers)
│   ├── tsconfig.json     # TypeScript strict configuration
│   ├── package.json
│   └── .env              # Backend secrets and DB URI configurations
├── frontend/
│   ├── src/
│   │   ├── components/   # UI/UX elements, Navigation, Glassmorphic components
│   │   ├── context/      # AuthContext, SocketContext providers
│   │   ├── pages/        # Auth, VerifyOtp, Dashboard, QuizAttempt, QuizResult, Lobbies, Leaderboards, Admin
│   │   ├── utils/        # Axios API Client with token refresh interceptors
│   │   ├── App.tsx       # Route guard definitions and app routes
│   │   ├── index.css     # Tailwind CSS v4 styling, custom variables, animations
│   │   └── main.tsx      # DOM Entrypoint
│   ├── index.html        # Main HTML layout (SEO optimized)
│   ├── tsconfig.json     # Strict React-TS configuration
│   ├── vite.config.ts    # Vite compiler + Tailwind CSS plugin config
│   └── package.json
└── README.md
```

---

## 🗄️ Database Schema Design (MongoDB & Mongoose)

1. **User (`users`):**
   * Coordinates account details: `username`, `email`, `passwordHash` (bcrypt), `role` (`user` | `admin`), `isVerified` (boolean), `streak` (integer), `lastActiveDate`, and `badges` (array of string IDs).
2. **Session (`sessions`):**
   * Tracks active client login instances: `userId`, `refreshTokenSignature`, `ipAddress`, `userAgent`, and `expiresAt` (has a MongoDB TTL expiration index).
3. **Otp (`otps`):**
   * Temporary OTP tracker: `email`, `otpHash` (SHA-256), and `expiresAt` (TTL index set to 10 minutes).
4. **Quiz (`quizzes`):**
   * Quiz shell: `title`, `description`, `category`, `difficulty` (`basic` | `intermediate` | `advanced`), `timeLimitPerQuestion` (seconds), `isActive`, `isDailyChallenge`, and `creator` (ObjectId reference).
5. **Question (`questions`):**
   * MCQ question: `quizId` (ObjectId), `text`, `options` (exactly 4 string options), `correctIndex` (integer 0-3), `explanation` (details why other choices are wrong), and `points` (default 10).
6. **Attempt (`attempts`):**
   * Quiz attempt log: `userId`, `quizId`, `score` (base points), `speedBonus`, `timeTaken` (seconds), `mode` (`solo` | `multiplayer`), `aiFeedback` (cached markdown text), and `questionsAttempted` (array of audits tracking question ID, selected option index, correctness, and response time).
7. **Chat (`chats`):**
   * AI multi-turn dialog context: `userId`, `attemptId`, and `messages` (array tracking role `user` | `model`, text, and timestamp).
8. **Badge (`badges`):**
   * Achievement metrics: `badgeId` (string ID), `name`, `description`, `iconCode` (Lucide identifier map), and `unlockCondition` definition.

---

## 🔌 API Documentation (Express REST routes)

### 🔑 Authentication Routes (`/api/auth`)
* `POST /register`: Registers a new inactive user; generates and hashes a 6-digit OTP, sends an email (logs to terminal if SMTP keys are absent), and returns registration metadata.
* `POST /verify-otp`: Validates the SHA-256 hash of the verification OTP. On success, updates the user status to `isVerified: true` and deletes the OTP document.
* `POST /login`: Validates credentials. Sets `refreshToken` as an HttpOnly secure cookie and creates a database Session. Returns a short-lived access token JWT in the response body.
* `POST /refresh`: Verifies the cookie-bound refresh token against active database sessions, rotates the signature, updates the session, and sets a fresh HttpOnly cookie + a new access token.
* `POST /logout`: Invalidates the active Session in MongoDB and clears cookie containers.

### 📝 Quiz Management Routes (`/api/quizzes`)
* `GET /`: Returns a list of active standard quizzes (visible to standard clients).
* `GET /:id`: Retrieves the quiz metadata and its questions for starting a quiz.
* `POST /:id/submit`: Submits quiz responses; audits options, awards correct scores, calculates speed bonuses, updates streaks, checks badge completions, and writes an Attempt log.
* `GET /attempt/:attemptId`: Retrieves the audited attempt statistics, quiz metadata, and correct options.
* `GET /attempt/:attemptId/pdf`: Puppeteer renders a styled study guide HTML block containing results and AI recommendations, compiling it into a downloadable PDF binary.
* **Admin-Restricted Registry (`/api/quizzes/admin/*`):**
  * `GET /admin/list`: Lists all quizzes (active and inactive).
  * `POST /admin/create`: Instantiates a new quiz shell.
  * `PUT /admin/update/:id`: Edits quiz settings.
  * `DELETE /admin/delete/:id`: Removes a quiz and its questions.
  * `GET /admin/quiz/:id/questions`: Lists all questions under a quiz.
  * `POST /admin/question/add`: Manually creates a question.
  * `POST /admin/question/bulk-import`: Performs a bulk question upload.

### 🧠 Gemini AI Assistant Routes (`/api/ai`)
* `POST /generate-questions` (Admin Only): Takes a topic, difficulty, and count. Gemini generates a schema-validated JSON MCQ question list.
* `POST /doubt-solver`: Explains correct answer reasoning and gives technical analogies (Solo mode attempts only).
* `GET /analyze-attempt/:attemptId`: Lazily audits score metrics and generates weak topic study guide reports.
* `POST /chat-tutor`: multi-turn interactive chat chatbot dialogue with previous conversation context.

### 👤 User Profile Analytics (`/api/users`)
* `GET /profile`: Summarizes total quiz count, total points, and play streak.
* `GET /progress`: Aggregates category correct/incorrect ratio datasets for Recharts progress bar charts and queries Gemini progress advice.
* `GET /badges`: Compares active badge logs against unlocked listings.
* `GET /admin/analytics` (Admin Only): Compiles platform metrics and chart data (attempts trends and category radar weights).

---

## ⚙️ Environment Setup & Installation

### 1. Requirements
* **Node.js** (v18 or higher)
* **MongoDB** (Local instance or MongoDB Atlas cluster)
* **Google Gemini API Key(s)** (Obtainable via [Google AI Studio](https://aistudio.google.com/))

### 2. Configure Environment variables
Navigate to the `backend` directory, create a `.env` file from the example, and configure variables:
```bash
cd backend
cp .env.example .env
```
Open `.env` and fill the variables:
```env
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/techquiz-ai

# Auth secrets
JWT_SECRET=use_a_very_long_random_hash_string_here_for_access_token
REFRESH_TOKEN_SECRET=use_a_very_long_random_hash_string_here_for_refresh_token

# Gemini Rotator Keys (Scale up request limits)
GEMINI_KEY_1=first_gemini_api_key_from_google
GEMINI_KEY_2=second_gemini_api_key_from_google
GEMINI_KEY_3=third_gemini_api_key_from_google
GEMINI_API_KEY=primary_or_fallback_gemini_api_key

# NodeMailer SMTP settings (Optional: if empty, OTPs output to terminal console)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="TechQuiz AI" <noreply@techquiz.com>

CLIENT_URL=http://localhost:5173
```

---

## 🚀 Running the Project Locally

### 1. Run the Backend Server
From the root directory:
```bash
cd backend
npm install
npm run dev
```
*The server will watch for changes and launch at `http://localhost:5000`.*

### 2. Run the Frontend Client
From the root directory:
```bash
cd frontend
npm install
npm run dev
```
*The client dev bundle will compile and launch the hot-reloading development server at `http://localhost:5173`.*

---

## 🌐 Production Deployment Guide

### Backend Hosting (e.g., Render)
1. Set up a Web Service on Render, linking your backend repository folder.
2. Select **Node** as the environment and specify `npm install` and `npm run build` as construction commands.
3. Configure the start command as `npm start`.
4. Copy all `.env` secrets into Render's **Environment Variables** console (ensure `CLIENT_URL` points to your deployed frontend domain).
5. *Note:* Make sure your hosting environment has Puppeteer dependencies loaded (e.g., add the Puppeteer Buildpack on Heroku or verify Chromium libraries on Render).

### Frontend Hosting (e.g., Vercel)
1. Import your frontend repository folder to Vercel.
2. Select **Vite** as the framework template.
3. Configure the Output Directory as `dist` and build commands as `npm run build`.
4. Set the **Environment Variable** `VITE_API_URL` to point to your deployed backend domain (e.g., `https://your-backend.onrender.com/api`).
5. Deploy.
