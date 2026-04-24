// ─── CREA CONFIG ──────────────────────────────────────────
// Keep this file out of public git repos. Add to .gitignore.
// For production: use a backend proxy to avoid exposing keys.

const CREA_CONFIG = {
  firebase: {
    apiKey: "AIzaSyD2r4WMXclHsayF2YV61fYo-asUi5i402I",
    authDomain: "planner-98be8.firebaseapp.com",
    projectId: "planner-98be8",
    storageBucket: "planner-98be8.firebasestorage.app",
    messagingSenderId: "1042455479006",
    appId: "1:1042455479006:web:c2e8f7a85170a7be21384f",
    measurementId: "G-WC565R2215"
  },
  FREE_TIER_LIMIT: 3,
  PLANS: {
    monthly:  { inr: 200,  usd: 2,  trial: 14, label: 'Monthly',  period: '/month',  badge: '14-day free trial' },
    yearly:   { inr: 2400, usd: 24, trial: 0,  label: 'Yearly',   period: '/year',   badge: 'Best Value — Save 17%' },
    lifetime: { inr: 4500, usd: 45, trial: 0,  label: 'Lifetime', period: 'one-time', badge: 'Most Popular' }
  },
  RATE_LIMITS: {
    ai:   { max: 5,  window: 60000  },  // 5 calls / min
    auth: { max: 5,  window: 300000 }   // 5 attempts / 5 min
  },
  LANGUAGES: [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'bn', label: 'বাংলা (Bengali)' }
  ]
};
