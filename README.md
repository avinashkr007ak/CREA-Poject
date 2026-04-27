<div align="center">

<img src="assets/logo.png" alt="CREA Logo" width="120" />

# CREA — Creative Efficiency

**Your all-in-one personal productivity planner**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white)](https://yourusername.github.io/crea-app)
[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Sync-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![HTML5](https://img.shields.io/badge/HTML5-Pure%20Web-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

*Plan smarter. Study better. Live efficiently.*

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Firebase Setup](#-firebase-setup)
- [Security](#-security)
- [Deployment](#-deployment)
- [Desktop App](#-desktop-app)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**CREA (Creative Efficiency)** is a full-featured, browser-based personal productivity suite designed for students and professionals. It combines all your essential daily tools — task manager, study planner, habit tracker, budget manager, Pomodoro timer, notes, and more — into a single beautiful, offline-capable web application.

All data syncs in real-time to the cloud via Firebase, so your information is always available across every device you use.

> Built with pure HTML, CSS, and JavaScript — zero frameworks, zero build tools, just open and use.

---

## ✨ Features

### 📋 Assignments & Tasks
- Create, edit, and complete tasks with deadlines and priority levels
- Visual progress tracking with completion percentage
- Filter by status: pending, in-progress, completed

### 📚 Course Manager
- Track all your enrolled courses in one place
- Record course details, schedules, and progress
- Link study sessions to specific courses

### 🕐 Study Sessions
- Log study hours per subject
- Track cumulative time spent on each course
- Visual summaries by week and month

### ⏱️ Pomodoro Focus Timer
- Customizable work / short break / long break intervals
- Session counter with daily goals
- Auto-start next session option
- Completion sounds and notifications

### ✅ Habit Tracker
- Build and track daily habits with streaks
- Visual calendar heatmap for each habit
- Current and best streak display

### 📝 Knowledge Base (Notes)
- Rich text notes organized by topic
- Quick search across all notes
- Markdown-style formatting support

### 💰 Budget Manager
- Track income and expense transactions
- Category-based breakdown
- Running balance with visual summaries

### 🎨 Canvas Drawing
- Built-in freehand drawing board
- Multiple colors and brush sizes
- Save drawings locally

### 📊 Dashboard
- Unified overview of all modules
- Today's tasks, habits due, budget summary
- Motivational daily quote

### ⚙️ Settings & Personalization
- **Dark / Light theme** toggle
- **6 accent colors** to personalize the UI
- **Multiple layouts** (compact, card, list)
- **6 languages supported**: English, Hindi, Tamil, Telugu, Marathi, Bengali
- Account management and data export

---

## 📸 Screenshots

> *(Add your own screenshots here)*

| Dashboard | Tasks | Pomodoro |
|-----------|-------|----------|
| ![Dashboard](assets/screenshots/dashboard.png) | ![Tasks](assets/screenshots/tasks.png) | ![Pomodoro](assets/screenshots/pomodoro.png) |

| Habits | Budget | Settings |
|--------|--------|----------|
| ![Habits](assets/screenshots/habits.png) | ![Budget](assets/screenshots/budget.png) | ![Settings](assets/screenshots/settings.png) |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Authentication** | Firebase Authentication (Email/Password + Google Sign-In) |
| **Database** | Firebase Firestore (NoSQL, real-time sync) |
| **Security** | Custom XSS & SQL-injection sanitizer, rate limiting |
| **Hosting** | GitHub Pages / Netlify / Vercel (static) |
| **Desktop** | Electron (Windows .exe) |
| **Fonts** | Google Fonts |
| **Icons** | Inline SVG |

---

## 🚀 Getting Started

### Option 1 — Run Locally (Instant, No Install)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/crea-app.git
   cd crea-app
   ```

2. **Double-click `LAUNCH_CREA.bat`** (Windows)
   — or open `index.html` directly in your browser

That's it. No npm, no build step.

---

### Option 2 — Run with Local Server (Recommended)

Running via a local server avoids browser security restrictions on local files.

**Using Python** (pre-installed on most systems):
```bash
# Python 3
python -m http.server 5500

# Then open: http://localhost:5500
```

**Using Node.js:**
```bash
npx http-server . -p 5500
# Then open: http://localhost:5500
```

Or just double-click **`LAUNCH_CREA.bat`** — it auto-detects Python or Node and opens the browser for you.

---

## 📁 Project Structure

```
crea-app/
│
├── index.html              # Main app (single-page application)
├── LAUNCH_CREA.bat         # Windows one-click launcher
├── STOP_CREA.bat           # Windows server stopper
│
├── css/
│   └── crea.css            # All styles (themes, layouts, components)
│
├── js/
│   ├── crea.js             # Core app logic (all modules)
│   ├── security.js         # XSS prevention, sanitization, rate limiting
│   ├── api.js              # Firebase config & plan definitions ⚠️ gitignored
│   └── config.js           # Extended config (languages, rate limits) ⚠️ gitignored
│
└── assets/
    └── logo.png            # App logo / favicon
```

> ⚠️ **`api.js` and `config.js` are excluded from this repo** — they contain Firebase credentials. See [Firebase Setup](#-firebase-setup) to create your own.

---

## 🔥 Firebase Setup

CREA uses Firebase for user authentication and cloud data storage. Follow these steps to connect your own Firebase project:

### Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it (e.g. `crea-app`)
3. Enable Google Analytics (optional)

### Step 2 — Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password** provider
3. Optionally enable **Google** provider

### Step 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Production mode**
3. Select your region → Done

### Step 4 — Set Security Rules

In Firestore → **Rules**, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

This ensures every user can only access their **own** data.

### Step 5 — Create `js/api.js`

Create this file locally (do **not** commit it to GitHub):

```javascript
// js/api.js — ⚠️ Add to .gitignore, never push to GitHub
const CREA_API = {
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  FREE_TIER_LIMIT: 3,
  PLANS: {
    monthly:  { inr: 200,  usd: 2,  trial: 14, label: 'Monthly',  period: '/month' },
    yearly:   { inr: 2400, usd: 24, trial: 0,  label: 'Yearly',   period: '/year'  },
    lifetime: { inr: 4500, usd: 45, trial: 0,  label: 'Lifetime', period: 'once'   }
  }
};
```

Find your Firebase config at: **Firebase Console → Project Settings → Your apps → SDK setup**

### Step 6 — Add to `.gitignore`

```
js/api.js
js/config.js
```

---

## 🔒 Security

CREA includes a dedicated security layer (`js/security.js`) with:

| Feature | Details |
|---------|---------|
| **XSS Prevention** | All user input is sanitized — strips `<script>`, `on*=` handlers, iframes, SVG injection |
| **SQL-style Injection Guard** | Filters `DROP`, `DELETE`, `UNION`, `--` patterns |
| **HTML Encoding** | Encodes `<`, `>`, `"`, `'`, `&` before rendering to DOM |
| **Rate Limiting** | Auth: 5 attempts / 5 min · AI: 5 calls / min · Add items: 30 / min |
| **Input Length Cap** | All inputs capped at 500 characters (configurable) |
| **Firebase Rules** | Server-side rules prevent unauthorized reads/writes |

---

## 🌐 Deployment

### GitHub Pages (Free)

1. Push your code to a GitHub repository
2. Go to **Settings → Pages**
3. Source: **Deploy from branch → main → / (root)**
4. Your site will be live at `https://yourusername.github.io/crea-app`

### Netlify (Easiest — Drag & Drop)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag your project folder onto the page
3. Live in 30 seconds at `https://yoursite.netlify.app`

### Vercel

```bash
npm install -g vercel
vercel --prod
```

> 📌 **Remember:** When deploying publicly, ensure `api.js` and `config.js` are excluded from your repository via `.gitignore`. For production, consider proxying Firebase calls through a backend server.

---

## 💻 Desktop App

CREA is also available as a **Windows desktop application** built with Electron.

- No browser needed — runs as a native `.exe`
- Data stored on your local disk (`%APPDATA%\crea-desktop\`)
- No login required — all features unlocked
- Export / Import data as JSON
- Works 100% offline

**To build the desktop app:**

```bash
cd crea-desktop
npm install
npm start          # Run in development
npm run build      # Build Windows installer (.exe)
```

See [`crea-desktop/README.md`](crea-desktop/README.md) for full instructions.

---

## 🗺 Roadmap

- [ ] Mobile PWA support (installable on Android/iOS)
- [ ] AI-powered study plan generator
- [ ] Calendar view with Google Calendar sync
- [ ] Collaborative shared study sessions
- [ ] Export data to PDF report
- [ ] Email reminders for deadlines
- [ ] More language translations

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please make sure to:
- Keep code clean and commented
- Test in both dark and light themes
- Never commit `api.js` or `config.js`

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by **Avinash Kumar**

⭐ Star this repo if you find it useful!

[![GitHub stars](https://img.shields.io/github/stars/yourusername/crea-app?style=social)](https://github.com/yourusername/crea-app)

</div>
