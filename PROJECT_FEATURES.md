# ⚡ TechQuiz AI - Comprehensive Project Features Specification

TechQuiz AI is an enterprise-grade, full-stack AI-powered learning and technical assessment platform. Built on the **MERN stack** (MongoDB, Express.js, React 19, Node.js) with **TypeScript** and **Google Gemini 2.5 Flash LLM**, the application delivers end-to-end quiz management, automated AI question generation, interactive AI tutoring, AI doubt solving, performance diagnostics, and automated PDF study guide compilation.

---

## 📋 Table of Contents
1. [Core Generative AI Features](#1-core-generative-ai-features)
2. [Quiz & Assessment Engine](#2-quiz--assessment-engine)
3. [Gamification, Streaks & Badges](#3-gamification-streaks--badges)
4. [Analytics & Data Visualization](#4-analytics--data-visualization)
5. [Server-Side PDF Study Guide Compiler](#5-server-side-pdf-study-guide-compiler)
6. [Automated Daily Challenge Scheduler (Cron)](#6-automated-daily-challenge-scheduler-cron)
7. [Authentication, Authorization & Security](#7-authentication-authorization--security)
8. [Administrator Control Suite](#8-administrator-control-suite)
9. [Frontend UI/UX & Design Architecture](#9-frontend-uiux--design-architecture)
10. [Backend Architecture & Reliability Engineering](#10-backend-architecture--reliability-engineering)

---

## 1. 🧠 Core Generative AI Features

### 1.1 Automated AI Question Generator (Admin)
* **Dynamic Topic MCQ Creation**: Admins can generate high-quality, practical multiple-choice questions on any technology stack (e.g., React Hooks, System Design, SQL Indexing, Git Internals, Python, Docker).
* **Configurable Difficulty & Quantity**: Supports 3 difficulty tiers (*Basic*, *Intermediate*, *Advanced*) and customizable question batch counts (1 to 10 questions per prompt).
* **Strict JSON Schema Enforcement**: Employs `@google/genai` native `responseSchema` to guarantee 100% structured JSON output containing question text, exactly 4 choices, 0-based `correctIndex`, detailed explanation, and default point weight.
* **Live Review & One-Click Import**: Admin preview table allows editing or discarding generated questions before bulk-importing directly into any quiz.

### 1.2 Interactive AI Doubt Solver
* **Targeted Misconception Diagnostics**: Explains why a user's selected choice was incorrect and highlights common engineering misunderstandings.
* **Engineering Analogies**: Provides relatable real-world analogies (e.g., explaining database indexes like book indexes) to facilitate deep conceptual understanding.
* **Direct Solution Clarification**: Explains why the correct answer is right with clean Markdown formatting.

### 1.3 AI Performance Analyzer & Study Plan Generator
* **Automatic Attempt Evaluation**: Analyzes user performance upon quiz submission (scores, time taken, question-by-question error logs).
* **Specific Weakness Identification**: Detects concept gaps based on specific missed questions rather than generic advice.
* **Actionable 3-Step Recommendations**: Formulates concrete, prioritized next steps for candidate improvement.
* **Structured Progress Recommendations**: Profile page generates prioritized study recommendation cards (*Critical*, *Needs Improvement*, *Good*) with custom emojis, concise gap summaries, and direct action items.
* **On-Demand Refresh ("Generate New Plan")**: Allows users to re-evaluate their overall profile performance and generate a refreshed study roadmap.

### 1.4 Multi-Turn Conversational AI Tutor Chatbot
* **Persistent Dialogue History**: Retains conversational context across questions and previous messages stored in MongoDB (`Chat` collection).
* **Quiz-Aware Context**: The AI tutor is seeded with the specific quiz title and the user's score to provide customized contextual guidance.
* **Floating Slide-Over Drawer**: Interactive drawer widget accessible on the results page for instant clarification without leaving the review flow.

---

## 2. 📝 Quiz & Assessment Engine

### 2.1 Quiz Discovery & Filtering
* **Category Categorization**: Quizzes organized across software engineering domains (JavaScript, React, Node.js, DSA, System Design, SQL, Git, Security, CSS, Python).
* **Difficulty Tiers**: Visual badges indicating *Basic*, *Intermediate*, and *Advanced* difficulty levels.
* **Dynamic Metadata Counters**: Live question count and estimated duration per quiz card.
* **Seamless Quiz Launch**: Single-click CTA to start any solo quiz attempt with real-time countdown.

### 2.2 Quiz Runner
* **Synchronized Question Timers**: Per-question countdown with visual countdown bar (default 30s per question).
* **Anti-Cheating API Design**: Client-facing endpoints strip `correctIndex` and `explanation` from responses, preventing client-side inspection.
* **Auto-Submission on Timeout**: Automatically commits current answers when the timer expires.
* **Interactive Option Selection**: Single-select radio buttons with instant visual feedback and step-by-step progress tracking.

### 2.3 Direct Actual Scoring Engine
* **Actual Mark Evaluation**: Correct answers award full question points (default: 10 points per question). Incorrect or unanswered questions award 0 points.
* **Tie-Breaker Metric**: Total time taken in seconds is recorded per attempt to resolve rank ties on the leaderboard.
* **Comprehensive Audit Trail**: Records exact time taken per question, selected option, and correctness in the `Attempt` schema.

---

## 3. 🏆 Gamification, Streaks & Badges

### 3.1 Daily Activity Streak Tracking
* **Consecutive Day Tracking**: Automatically detects consecutive daily quiz attempts and increments the user's active streak count.
* **Streak Expiry Detection**: Resets streak to 1 if more than 24 hours have elapsed since the previous active day.
* **Visual Flame Indicator**: Displays current streak prominently in the navigation bar and user profile.

### 3.2 Achievement Badge System
* **Pre-Seeded Badges**: Stored in MongoDB with unique identifiers, unlock criteria, and Lucide icon mappings.
* **Automatic Badge Unlocking**:
  * **First Quiz Attempt (`first_quiz`)**: Unlocked immediately upon completing the first quiz.
  * **Quiz Master (`speed_demon`)**: Unlocked when achieving a 100% perfect score on any quiz attempt.
  * **7-Day Streak Master (`streak_7`)**: Unlocked when maintaining an active streak for 7 consecutive days.
* **Trophy Room Showcase**: Profile page provides a visual grid displaying unlocked achievements alongside locked badges with requirement tooltips.

---

## 4. 📊 Analytics & Data Visualization

### 4.1 User Performance Analytics
* **Category Mastery Radar Chart**: Recharts-powered polar radar chart mapping percentage accuracy across all technical domains.
* **Summary Scorecards**: Displays total completed attempts, aggregate earned points, and overall accuracy percentages.
* **Detailed Question History**: Full question audit breakdowns with user answers, correct answers, time taken, and explanations on the result page.

### 4.2 Global & Quiz-Specific Leaderboards
* **Top 10 Rankings Per Quiz**: Dynamic MongoDB aggregation pipeline calculating top performers.
* **Tie-Breaker Logic**: Ranked primarily by total score descending, with faster total time taken resolving ties.
* **Podium Cards & Ranks**: Highlighting top 3 podium finishers with gold, silver, and bronze badges.

### 4.3 Admin Platform Analytics
* **Executive Summary**: Real-time totals for registered users, active quizzes, overall submissions, and platform-wide average score.
* **Activity Over Time Line Graph**: Visualizes daily quiz attempt volume and average scores over the rolling last 7 days.
* **Quiz Category Distribution**: Charts the count of quizzes categorized by subject matter.

---

## 5. 📄 Server-Side PDF Study Guide Compiler

* **Headless Puppeteer Generation**: Compiles high-resolution, print-ready A4 PDF study guides on the backend without relying on client-side rendering hacks.
* **Comprehensive Study Package**: Includes:
  * Branded header with Quiz Title, Date, Category, and Difficulty.
  * Scorecard banner displaying Earned Score, Percentage, and Time Taken.
  * AI Study Recommendations and weak topic diagnostics.
  * Question-by-Question breakdown highlighting student choice, correct answer, and full technical explanation.
* **Direct Binary Streaming**: Streams generated PDF buffers directly via `res.send()` with automatic `Content-Disposition` attachment download headers.

---

## 6. ⏰ Automated Daily Challenge Scheduler (Cron)

* **Midnight Execution (`0 0 * * *`)**: Node-Cron service automatically triggers at 12:00 AM server time every night.
* **AI Generation with Rotating Categories**: Automatically prompts Gemini to create a fresh 10-question MCQ challenge from a rotating category list.
* **Exponential Backoff Retry**: Includes a 3-attempt automated retry loop with exponential delay if transient network or API errors occur.
* **Startup Verification & Seeding**: Verifies on server boot whether an active challenge exists for the current day; automatically seeds a new one if missing or stale.

---

## 7. 🔐 Authentication, Authorization & Security

### 7.1 Dual-Token Authentication Architecture
* **Short-Lived Access Tokens**: In-memory JSON Web Tokens (JWT) with short expiration windows for stateless API authorization.
* **Rotated HttpOnly Refresh Tokens**: Secure, HttpOnly, SameSite cookies carrying refresh signatures to prevent XSS attacks.
* **Axios Silent Auto-Renewal**: Client-side interceptor transparently intercepts `401 Unauthorized` responses, calls `/api/auth/refresh`, updates in-memory tokens, and retries original requests seamlessly.

### 7.2 Email OTP Verification Flow
* **6-Digit OTP Delivery**: Sends email verification codes via Nodemailer SMTP on user registration.
* **SHA-256 OTP Hashing**: OTP values are hashed before storage in MongoDB to protect against database leaks.
* **MongoDB TTL Self-Destruct**: OTP documents automatically delete after 10 minutes via MongoDB TTL indexing.

### 7.3 Security & Middleware Protections
* **Role-Based Access Control (RBAC)**: `adminMiddleware` restricts administrative endpoints to users with `role: 'admin'`.
* **Session Tracking**: Tracks user sessions with IP address and User-Agent signatures.
* **Password Hashing**: Salted bcrypt password hashing (`bcryptjs`).
* **Rate Limiting**: `express-rate-limit` guards against brute-force attacks and abuse.
* **Input Validation**: Zod schema validation on request payloads.

---

## 8. 🛠️ Administrator Control Suite

* **Quiz Management (CRUD)**:
  * Create new quizzes with custom title, category, difficulty, time limits, and descriptions.
  * Edit quiz parameters or toggle active/inactive status.
  * Delete quizzes and cascade deletion to attached questions.
* **Question Management (CRUD & Bulk Tools)**:
  * Manually add individual questions with 4 options, correct answer index, point value, and explanation.
  * Edit existing questions or delete obsolete entries.
  * Bulk-import JSON question arrays directly.
* **AI Question Generator Integration**: One-click generation and direct database import into any quiz shell.
* **Manual Daily Challenge Trigger**: Admin button to immediately force-rotate and generate a new Daily Challenge on demand.
* **Platform Health & Metrics**: Live analytics dashboard with user registration counts, attempt volumes, and usage charts.

---

## 9. 🎨 Frontend UI/UX & Design Architecture

* **Modern Dark-Mode SaaS Aesthetic**: Deep charcoal/slate backgrounds (`#0a0b10`), cyan/purple gradients, and refined typographic contrast.
* **Glassmorphism**: Backdrop-blurred semi-transparent cards, modals, navigation bars, and stats containers (`backdrop-blur-md`).
* **Framer Motion Micro-Interactions**: Smooth page transitions, score tally counters, hover scale effects, and animated drawer menus.
* **Lucide Iconography**: Contextual vector icons across questions, categories, badges, and status alerts.
* **Fully Responsive Design**: Tailored layouts for desktop, tablet, and mobile displays.

---

## 10. ⚙️ Backend Architecture & Reliability Engineering

* **API Key Rotator & Failover**:
  * Round-robin rotation across multiple Gemini API keys (`GEMINI_KEY_1`, `GEMINI_KEY_2`, `GEMINI_KEY_3`, `GEMINI_API_KEY`) to circumvent Free Tier 15 RPM limits.
  * `withGeminiFailover()` wrapper with jittered exponential backoff retries on `429 Rate Limit` or `503 Service Unavailable`.
* **Clean Modular Architecture**: Separation of concerns across `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, and `services/`.
* **Strict TypeScript Type Safety**: End-to-end interface contracts covering database schemas, API payloads, and Gemini structured output schemas.
