// ─── CREA API CONFIG ─────────────────────────────────────
// ⚠️  Add this file to .gitignore — never expose in public repos.
// For production: proxy all calls through a backend server.

const CREA_API = {
  firebase: {
    apiKey: "AIzaSyD2r4WMXclHsayF2YV61fYo-asUi5i402I",
    authDomain: "planner-98be8.firebaseapp.com",
    projectId: "planner-98be8",
    storageBucket: "planner-98be8.firebasestorage.app",
    messagingSenderId: "1042455479006",
    appId: "1:1042455479006:web:c2e8f7a85170a7be21384f",
    measurementId: "G-WC565R2215"
  },
  FREE_TIER_LIMIT: 3,   // items per category without login
  PLANS: {
    monthly:  { inr: 200,  usd: 2,  trial: 14, label: 'Monthly',  period: '/month' },
    yearly:   { inr: 2400, usd: 24, trial: 0,  label: 'Yearly',   period: '/year'  },
    lifetime: { inr: 4500, usd: 45, trial: 0,  label: 'Lifetime', period: 'once'   }
  }
};
