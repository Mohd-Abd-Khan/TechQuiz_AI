# How to Run and Verify TechQuiz AI

Follow this step-by-step guide to configure, run, and verify the TechQuiz AI platform locally on your machine.

---

## 🛠️ Step 1: Prerequisites
Make sure you have the following installed:
* **Node.js** (v18 or higher)
* **MongoDB** (Atlas account or local community server running)
* **Google Gemini API Key(s)** (Generate from [Google AI Studio](https://aistudio.google.com/))

---

## ⚙️ Step 2: Configure Environment Settings

1. Navigate to the `backend` directory:
   ```powershell
   cd d:\Antigravity_Workspace\01_Project\backend
   ```
2. Create a copy of `.env.example` named `.env`:
   ```powershell
   cp .env.example .env
   ```
3. Open the `.env` file and configure the values:
   * **MONGODB_URI:** Enter your MongoDB Atlas connection string.
   * **GEMINI Keys:** Input your Gemini keys to enable failover rotation.
     ```env
     GEMINI_KEY_1=first_gemini_api_key_from_google
     GEMINI_KEY_2=second_gemini_api_key_from_google
     GEMINI_KEY_3=third_gemini_api_key_from_google
     GEMINI_API_KEY=primary_fallback_gemini_api_key
     ```
   * **SMTP (Optional):** If left blank, OTPs will print to your backend terminal logs instead of sending emails, which makes registration tests quick and convenient.

---

## 🚀 Step 3: Run the Application

To start the full stack, open **two separate terminal shells**:

### Terminal 1: Start Backend Service
```powershell
cd d:\Antigravity_Workspace\01_Project\backend
npm install
npm run dev
```
*Wait until the terminal displays `MongoDB Connected` and `Daily Challenge cron scheduler loaded`.*

### Terminal 2: Start Frontend Service
```powershell
cd d:\Antigravity_Workspace\01_Project\frontend
npm install
npm run dev
```
*Vite will compile files and open the hot-reloading server at `http://localhost:5173`.*

---

## 🧪 Step 4: Verification Checklist

### 1. Register and Verify Account (OTP)
1. Open `http://localhost:5173` in your browser.
2. Navigate to **Register**, fill out the form, and click sign up.
3. Look at your **Terminal 1 (Backend Logs)**. You will see a console printout:
   ```bash
   ==================================================
   DEVELOPMENT MAIL LOG: OTP for username is: 123456
   ==================================================
   ```
4. Copy the 6-digit OTP code, paste it on the browser verification screen, and submit. You will be redirected to the Login page.

### 2. Rotated Session Login
1. Log in with your new email and password.
2. Open browser **DevTools (F12)** -> **Application** -> **Cookies**.
3. Confirm that the `refreshToken` cookie is set and marked **HttpOnly** and **Secure**.
4. Observe the network logs; your access token is stored safely in-memory and rotates transparently.

### 3. Solo Quiz Gameplay & PDF Study Notes Compiler
1. Select any technical quiz category (e.g., JavaScript Core) on your dashboard and click **Solo**.
2. Complete the quiz before the circular countdown timer expires.
3. On the results page, click **Download Study Notes**. 
4. Confirm that a styled PDF study guide compiles and automatically downloads via Puppeteer.

### 4. AI Doubt Solver, Analyzer & Tutor Chatbot
1. On the Quiz Result page, click **Explain with AI Analyst** under any question.
2. Verify that Gemini generates a detailed code explanation and a custom technical analogy.
3. Click **Analyze My Score** in the performance review widget to review your personalized weak areas summary.
4. Click the floating purple **Chat Tutor** icon in the bottom right corner, send a custom message, and confirm the AI responds with historical context.

### 5. Simulate Key Rotation (Failover Test)
1. Stop your backend.
2. In `backend/.env`, set `GEMINI_KEY_1=INVALID_KEY_EXPIRED`, and insert a valid key as `GEMINI_KEY_2`.
3. Restart the backend and attempt to click **Analyze My Score**.
4. Check **Terminal 1 (Backend Logs)**. You will see:
   ```bash
   [FAILOVER] Attempt 1 failed with 429. Rotating key and retrying...
   [ROTATION] Switched to Gemini API Key Index: 1
   ```
5. Confirm that the frontend still successfully loads the study advice without crashing.

### 6. Real-time Multiplayer Duels
1. Click **Host Match** on any quiz.
2. Copy the 6-digit lobby code generated on the host dashboard.
3. Open a secondary browser window in **Incognito Mode**, register/log in a test user, paste the code in the dashboard **Lobby Code** field, and join the room.
4. In the host window, click **Start Game**. Play through the questions and verify that timers, score updates, and live standings sync in real time.
