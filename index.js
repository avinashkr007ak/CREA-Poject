// ─── THEME ───────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('sp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('sp_theme', newTheme);
  updateThemeIcon(newTheme);
}
function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}
initTheme();

// ─── FIREBASE ────────────────────────────────────────────
// Config is loaded from api.js (CREA_API) — keep api.js out of git!
let db, auth, currentUser = null, isAdmin = false;
try {
  firebase.initializeApp(CREA_API.firebase);
  db = firebase.firestore();
  auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      // ADMIN FALLBACK: Check email directly if Firestore role isn't set yet
      isAdmin = (user.email === 'avinashkr84060@gmail.com');
      updateAuthUI(user);
      loadStateFromFirebase(); 
    } else {
      currentUser = null;
      isAdmin = false;
      updateAuthUI(null);
    }
  });
} catch (e) { console.warn("Firebase not properly configured."); }

function updateAuthUI(user) {
  if (user) {
    document.getElementById('auth-overlay').style.display = 'none';
    const btn = document.getElementById('auth-btn');
    if (btn) {
      btn.title = isAdmin ? 'Admin Account' : 'Account Settings';
      btn.innerHTML = isAdmin
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"></path></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }
    loadStateFromFirebase();
  } else {
    document.getElementById('auth-overlay').style.display = 'none';
    const btn = document.getElementById('auth-btn');
    if (btn) {
      btn.title = 'Login';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }
    if (typeof renderDashboard === 'function') renderDashboard();
    const activeEl = document.querySelector('.page.active');
    if (activeEl && typeof showPage === 'function') {
      const activePage = activeEl.id.replace('page-', '');
      showPage(activePage);
    }
  }
}

async function authLogin() {
  if (!RL.auth.guard()) return;
  const e = document.getElementById('auth-email').value.trim();
  const p = document.getElementById('auth-pass').value;
  if (!e || !p) return;

  const btn = document.querySelector('#auth-overlay .btn-primary');
  const originalText = btn.textContent;
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(e, p);
    showToast('Access granted ✓', 'success');
  } catch (error) {
    console.error("Login failed:", error);
    let msg = 'Invalid credentials. Access restricted.';
    if (error.code === 'auth/user-not-found') msg = 'No such user found.';
    if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
    
    showToast(msg, 'error');
    document.getElementById('auth-error').textContent = msg;
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function authSignup() {
  if (!RL.auth.guard()) return;
  const e = document.getElementById('auth-email').value.trim();
  const p = document.getElementById('auth-pass').value;
  if (!e || !p) { showToast('Please enter email and password', 'warn'); return; }

  try {
    await auth.createUserWithEmailAndPassword(e, p);
    showToast('Account created successfully! ✓', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    document.getElementById('auth-error').textContent = error.message;
  }
}

function authLogout() {
  if (auth) {
    auth.signOut().then(() => {
      showToast('Logged out successfully', 'info');
    });
  }
}

function handleAuthBtn() {
  if (currentUser) {
    showPage('settings');
    switchSettings('account', document.querySelector('.s-nav-item[onclick*="account"]'));
  }
  else { document.getElementById('auth-overlay').style.display = 'flex'; }
}

function checkLogin(type) {
  if (isAdmin) return true;
  if (!currentUser) {
    const limit = (typeof CREA_API !== 'undefined') ? CREA_API.FREE_TIER_LIMIT : 3;
    if (!type) { document.getElementById('auth-overlay').style.display = 'flex'; return false; }
    const countMap = {
      task: state.tasks.length, course: state.courses.length,
      session: state.sessions.length, habit: state.habits.length,
      note: state.notes.length, transaction: state.transactions.length
    };
    if ((countMap[type] || 0) >= limit) {
      document.getElementById('auth-overlay').style.display = 'flex';
      return false;
    }
    return true; // guest can add up to FREE_TIER_LIMIT items
  }
  return true;
}

// ─── STATE ───────────────────────────────────────────────
let state = {
  tasks: [], courses: [], sessions: [], habits: [],
  notes: [], transactions: [], pomoDone: 0, pomoTotal: 0
};

// Try to load from LocalStorage immediately
const savedData = localStorage.getItem('sp_data');
if (savedData) {
  try {
    state = JSON.parse(savedData);
  } catch (e) { console.error("Error parsing saved data", e); }
}

let editState = { task: null, course: null, habit: null, note: null, session: null, budget: null };

async function loadStateFromFirebase() {
  if (!currentUser || !db) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
      const data = doc.data();
      state = { ...state, ...data };
      
      // SECURE ADMIN CHECK: Look for role in database instead of hardcoding email
      isAdmin = (data.role === 'admin');
    }
    
    updateAuthUI(currentUser); // Refresh UI with admin status
    renderDashboard();
    const activePage = document.querySelector('.page.active').id.replace('page-', '');
    showPage(activePage);
  } catch (e) { console.error("Error loading data:", e); }
}

function save() {
  const dataStr = JSON.stringify(state);
  localStorage.setItem('sp_data', dataStr);

  if (currentUser && db) {
    db.collection('users').doc(currentUser.uid).set(state)
      .catch(err => console.error("Cloud sync failed:", err));
  }
}

// ─── NAVIGATION ──────────────────────────────────────────
function toggleSidebarState() {
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('open');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}

const pages = {
  dashboard: 'Dashboard', assignments: 'Assignments & Exams',
  courses: 'Course Manager', study: 'Study Planner',
  timer: 'Timer', habits: 'Habit Tracker',
  knowledge: 'Knowledge Hub', budget: 'Budget Tracker',
  settings: 'Settings', draw: 'Canvas'
};

function showPage(id) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('open');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const navItem = document.querySelector(`.nav-item[onclick="showPage('${id}')"]`);
  if (navItem) navItem.classList.add('active');
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = pages[id];
  if (id === 'dashboard') renderDashboard();
  if (id === 'assignments') renderTasks();
  if (id === 'courses') renderCourses();
  if (id === 'study') renderSchedule();
  if (id === 'habits') renderHabits();
  if (id === 'knowledge') renderNotes();
  if (id === 'budget') renderBudget();
  if (id === 'draw' && typeof resizeCanvas === 'function') setTimeout(resizeCanvas, 50);
}

// ─── CLOCK ───────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const d = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('clock-sidebar').textContent = t;
  document.getElementById('date-sidebar').textContent = d;
}
updateClock(); setInterval(updateClock, 1000);

// ─── HELPERS ─────────────────────────────────────────────
function priorityTag(p) {
  const map = { Urgent: 'tag-red', High: 'tag-yellow', Medium: 'tag-blue', Low: 'tag-gray' };
  return `<span class="tag ${map[p] || 'tag-gray'}">${p}</span>`;
}
function catColors() {
  return ['#3b9a6e', '#4a90d9', '#d4a017', '#e05555', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c', '#95a5a6'];
}
function daysLeft(due) {
  if (!due) return '';
  const diff = Math.ceil((new Date(due) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `<span class="tag tag-red">${Math.abs(diff)}d overdue</span>`;
  if (diff === 0) return `<span class="tag tag-red">Due today</span>`;
  if (diff <= 3) return `<span class="tag tag-yellow">${diff}d left</span>`;
  return `<span class="tag tag-gray">${diff}d left</span>`;
}
function modal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

// ─── TASKS ───────────────────────────────────────────────
function addTask() {
  if (!checkLogin('task')) return;
  if (!RL.addItem.guard()) return;
  const title = sanitize(document.getElementById('task-title').value, 200);
  if (!title) return;

  const taskData = {
    title,
    course: sanitize(document.getElementById('task-course').value, 100) || 'General',
    due: document.getElementById('task-due').value,
    type: document.getElementById('task-type').value,
    priority: document.getElementById('task-priority').value,
  };

  if (editState.task) {
    const idx = state.tasks.findIndex(t => t.id === editState.task);
    if (idx !== -1) {
      state.tasks[idx] = { ...state.tasks[idx], ...taskData };
      showToast('Task updated ✓', 'success');
    }
    editState.task = null;
    const addBtn = document.querySelector('#page-assignments .btn-primary');
    if (addBtn) addBtn.textContent = '+ Add Task';
  } else {
    state.tasks.push({
      id: Date.now(),
      ...taskData,
      done: false
    });
    showToast('Task added ✓', 'success');
  }

  ['task-title', 'task-course', 'task-due'].forEach(id => document.getElementById(id).value = '');
  save(); renderTasks(); renderDashboard();
}

function editTask(id) {
  const t = state.tasks.find(task => task.id === id);
  if (!t) return;
  editState.task = id;
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-course').value = t.course;
  document.getElementById('task-due').value = t.due;
  document.getElementById('task-type').value = t.type;
  document.getElementById('task-priority').value = t.priority;

  const addBtn = document.querySelector('#page-assignments .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Task';

  document.getElementById('task-title').focus();
}
function toggleTask(id) {
  if (!checkLogin()) return;
  const t = state.tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); renderTasks(); renderDashboard(); }
}
function deleteTask(id) {
  if (!checkLogin()) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  save(); renderTasks(); renderDashboard();
}
function renderTasks() {
  const fs = document.getElementById('filter-status').value;
  const fp = document.getElementById('filter-priority').value;
  let tasks = state.tasks.filter(t =>
    (!fs || (fs === 'pending' ? !t.done : t.done)) &&
    (!fp || t.priority === fp)
  ).sort((a, b) => {
    const po = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    return (po[a.priority] || 3) - (po[b.priority] || 3);
  });
  const el = document.getElementById('tasks-list');
  if (!tasks.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No tasks found</div></div>`; return; }
  el.innerHTML = tasks.map(t => `
    <div class="task-item">
      <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask(${t.id})"></div>
      <div style="flex:1">
        <div class="task-name ${t.done ? 'done' : ''}">${t.title}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${t.course} · ${t.type}</div>
      </div>
      <div class="task-meta">
        ${priorityTag(t.priority)}
        ${daysLeft(t.due)}
        <button class="task-del" onclick="editTask(${t.id})" title="Edit">✏️</button>
        <button class="task-del" onclick="deleteTask(${t.id})" title="Delete">🗑</button>
      </div>
    </div>`).join('');
}

// ─── COURSES ─────────────────────────────────────────────
function addCourse() {
  if (!checkLogin('course')) return;
  if (!RL.addItem.guard()) return;
  const name = sanitize(document.getElementById('course-name').value, 150);
  if (!name) return;

  const courseData = {
    name,
    teacher: sanitize(document.getElementById('course-teacher').value, 100),
    schedule: sanitize(document.getElementById('course-schedule').value, 100)
  };

  if (editState.course) {
    const idx = state.courses.findIndex(c => c.id === editState.course);
    if (idx !== -1) {
      state.courses[idx] = { ...state.courses[idx], ...courseData };
      showToast('Course updated ✓', 'success');
    }
    editState.course = null;
    const addBtn = document.querySelector('#page-courses .btn-primary');
    if (addBtn) addBtn.textContent = '+ Add Course';
  } else {
    state.courses.push({
      id: Date.now(),
      ...courseData
    });
    showToast('Course added ✓', 'success');
  }

  ['course-name', 'course-teacher', 'course-schedule'].forEach(id => document.getElementById(id).value = '');
  save(); renderCourses();
}

function editCourse(id) {
  const c = state.courses.find(course => course.id === id);
  if (!c) return;
  editState.course = id;
  document.getElementById('course-name').value = c.name;
  document.getElementById('course-teacher').value = c.teacher;
  document.getElementById('course-schedule').value = c.schedule;

  const addBtn = document.querySelector('#page-courses .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Course';

  document.getElementById('course-name').focus();
}
function deleteCourse(id) {
  if (!checkLogin()) return;
  state.courses = state.courses.filter(c => c.id !== id);
  save(); renderCourses();
}
function renderCourses() {
  const el = document.getElementById('courses-list');
  if (!state.courses.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">🎓</div><div class="empty-text">No courses yet</div></div>`; return; }
  const colors = catColors();
  el.innerHTML = state.courses.map((c, i) => {
    const tasks = state.tasks.filter(t => t.course.toLowerCase() === c.name.toLowerCase());
    const done = tasks.filter(t => t.done).length;
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    return `<div class="course-item">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <div class="course-name" style="word-break:break-word">${c.name}</div>
          <div class="course-meta" style="word-break:break-word">${c.teacher ? '👤 ' + c.teacher : ''}${c.schedule ? ' · 🕐 ' + c.schedule : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="task-del" onclick="editCourse(${c.id})" title="Edit">✏️</button>
          <button class="task-del" onclick="deleteCourse(${c.id})" title="Delete">🗑</button>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${tasks.length} tasks</span><span style="color:${colors[i % colors.length]}">${pct}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div></div>
      </div>
    </div>`;
  }).join('');
}

// ─── STUDY SESSIONS ──────────────────────────────────────
function addSession() {
  if (!checkLogin('session')) return;
  if (!RL.addItem.guard()) return;
  const subject = sanitize(document.getElementById('session-subject').value, 150);
  if (!subject) return;

  const sessionData = {
    day: document.getElementById('session-day').value,
    subject,
    start: document.getElementById('session-start').value,
    end: document.getElementById('session-end').value,
    topic: sanitize(document.getElementById('session-topic').value, 200)
  };

  if (editState.session) {
    const idx = state.sessions.findIndex(s => s.id === editState.session);
    if (idx !== -1) {
      state.sessions[idx] = { ...state.sessions[idx], ...sessionData };
      showToast('Session updated ✓', 'success');
    }
    editState.session = null;
    const addBtn = document.querySelector('#page-study .btn-primary');
    if (addBtn) addBtn.textContent = '+ Add Session';
  } else {
    state.sessions.push({
      id: Date.now(),
      ...sessionData
    });
    showToast('Study session added ✓', 'success');
  }

  ['session-subject', 'session-topic'].forEach(id => document.getElementById(id).value = '');
  save(); renderSchedule();
}

function editSession(id) {
  const s = state.sessions.find(session => session.id === id);
  if (!s) return;
  editState.session = id;
  document.getElementById('session-day').value = s.day;
  document.getElementById('session-subject').value = s.subject;
  document.getElementById('session-start').value = s.start;
  document.getElementById('session-end').value = s.end;
  document.getElementById('session-topic').value = s.topic;

  const addBtn = document.querySelector('#page-study .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Session';

  document.getElementById('session-subject').focus();
}
function deleteSession(id) {
  if (!checkLogin()) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  save(); renderSchedule();
}
function renderSchedule() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const el = document.getElementById('schedule-by-day');
  let html = '';
  days.forEach(day => {
    const sess = state.sessions.filter(s => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
    if (!sess.length) return;
    html += `<div class="card"><div class="card-title" style="margin-bottom:12px">📅 ${day}</div>`;
    html += sess.map(s => `
      <div class="schedule-slot">
        <div class="slot-time">${s.start} – ${s.end}</div>
        <div class="slot-block">
          <div class="slot-title">${s.subject}</div>
          ${s.topic ? `<div class="slot-sub">${s.topic}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px">
          <button class="task-del" onclick="editSession(${s.id})" title="Edit">✏️</button>
          <button class="task-del" onclick="deleteSession(${s.id})" title="Delete">🗑</button>
        </div>
      </div>`).join('');
    html += '</div>';
  });
  el.innerHTML = html || `<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">No sessions planned. Add one above!</div></div>`;
}

// ─── FOCUS SESSIONS (POMODORO) ───────────────────────────
let focusSetupMins = 30;
let focusTimer = null;
let focusSecondsLeft = 0;
let focusTotalSeconds = 0;
let focusRunning = false;
let focusIsBreak = false;
let focusPeriods = [];
let focusCurrentPeriodIdx = 0;
let pomoLog = [], pomoDailyCount = 0, pomoDailyMin = 0;

function updateBreakInfo() {
  const skip = document.getElementById('pomo-skip-breaks').checked;
  const breaks = skip ? 0 : Math.floor(focusSetupMins / 30);
  const infoEl = document.getElementById('pomo-break-info');
  if (breaks === 0) {
    infoEl.textContent = "You'll have no breaks.";
  } else if (breaks === 1) {
    infoEl.textContent = "You'll have 1 break.";
  } else {
    infoEl.textContent = `You'll have ${breaks} breaks.`;
  }
}

function adjustPomoTime(delta) {
  focusSetupMins += delta;
  if (focusSetupMins < 15) focusSetupMins = 15;
  if (focusSetupMins > 240) focusSetupMins = 240;
  document.getElementById('pomo-setup-time').textContent = focusSetupMins;
  updateBreakInfo();
}

function startFocusSession() {
  const skip = document.getElementById('pomo-skip-breaks').checked;
  const numBreaks = skip ? 0 : Math.floor(focusSetupMins / 30);

  focusPeriods = [];
  if (numBreaks === 0) {
    focusPeriods.push({ type: 'focus', mins: focusSetupMins });
  } else {
    const focusMinsTotal = focusSetupMins - (numBreaks * 5);
    const numFocusPeriods = numBreaks + 1;
    const minsPerFocus = Math.round(focusMinsTotal / numFocusPeriods);

    for (let i = 0; i < numFocusPeriods; i++) {
      let m = minsPerFocus;
      if (i === numFocusPeriods - 1) m = focusMinsTotal - (minsPerFocus * (numFocusPeriods - 1)); // remainder
      focusPeriods.push({ type: 'focus', mins: m });
      if (i < numFocusPeriods - 1) {
        focusPeriods.push({ type: 'break', mins: 5 });
      }
    }
  }

  focusCurrentPeriodIdx = 0;

  document.getElementById('pomo-setup-view').style.display = 'none';
  document.getElementById('pomo-running-view').style.display = 'flex';

  startCurrentPeriod();
}

function startCurrentPeriod() {
  const period = focusPeriods[focusCurrentPeriodIdx];
  focusIsBreak = period.type === 'break';
  focusTotalSeconds = period.mins * 60;
  focusSecondsLeft = focusTotalSeconds;
  focusRunning = true;

  const focusCount = focusPeriods.filter(p => p.type === 'focus').length;
  const currentFocusNum = focusPeriods.slice(0, focusCurrentPeriodIdx + 1).filter(p => p.type === 'focus').length;

  const titleEl = document.getElementById('pomo-period-info');
  if (focusIsBreak) {
    titleEl.textContent = `Break time`;
  } else {
    titleEl.textContent = focusCount > 1 ? `Focus period (${currentFocusNum} of ${focusCount})` : 'Focus period';
  }

  const nextPeriod = focusPeriods[focusCurrentPeriodIdx + 1];
  const upNextEl = document.getElementById('pomo-up-next');
  if (nextPeriod) {
    upNextEl.innerHTML = `Up next: <span style="font-weight:600;color:var(--text)">${nextPeriod.mins} min ${nextPeriod.type}</span>`;
  } else {
    upNextEl.innerHTML = `<span style="color:var(--muted)">Session completes after this.</span>`;
  }

  document.getElementById('pomo-pause-btn').textContent = '⏸';

  updateTimerUI();

  clearInterval(focusTimer);
  focusTimer = setInterval(timerTick, 1000);
}

function timerTick() {
  focusSecondsLeft--;
  updateTimerUI();

  if (focusSecondsLeft <= 0) {
    clearInterval(focusTimer);

    try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA').play(); } catch (e) { }

    if (!focusIsBreak) {
      const minsCompleted = focusPeriods[focusCurrentPeriodIdx].mins;
      pomoDailyCount++;
      pomoDailyMin += minsCompleted;
      const taskInput = document.getElementById('pomo-task-input');
      const task = (taskInput && taskInput.value) ? taskInput.value : `Session (${minsCompleted}m)`;
      pomoLog.push({ task, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
      document.getElementById('pomo-count').textContent = `${pomoDailyCount} / 4`;
      document.getElementById('pomo-total-time').textContent = `${pomoDailyMin} min`;
      renderPomoLog();
    }

    focusCurrentPeriodIdx++;
    if (focusCurrentPeriodIdx < focusPeriods.length) {
      startCurrentPeriod();
    } else {
      stopFocusSession();
      showToast('Focus session complete! 🎉', 'success');
    }
  }
}

function updateTimerUI() {
  let displayVal = Math.ceil(focusSecondsLeft / 60);
  let unit = 'min';

  if (focusSecondsLeft < 60 && focusSecondsLeft > 0) {
    displayVal = focusSecondsLeft;
    unit = 'sec';
  } else if (focusSecondsLeft === 0) {
    displayVal = 0;
  }

  document.getElementById('pomo-run-time').textContent = displayVal;
  document.getElementById('pomo-run-unit').textContent = unit;

  const pct = 1 - (focusSecondsLeft / focusTotalSeconds);
  // circumference is 628 for r=100
  const offset = 628 * (1 - pct);
  document.getElementById('pomo-circle-prog').style.strokeDashoffset = offset;
}

function toggleFocusSession() {
  if (focusRunning) {
    clearInterval(focusTimer);
    focusRunning = false;
    document.getElementById('pomo-pause-btn').textContent = '▶';
  } else {
    focusRunning = true;
    document.getElementById('pomo-pause-btn').textContent = '⏸';
    focusTimer = setInterval(timerTick, 1000);
  }
}

function stopFocusSession() {
  clearInterval(focusTimer);
  focusRunning = false;
  document.getElementById('pomo-running-view').style.display = 'none';
  document.getElementById('pomo-setup-view').style.display = 'block';
  document.getElementById('pomo-circle-prog').style.strokeDashoffset = 0;
}

function renderPomoLog() {
  const el = document.getElementById('pomo-log');
  if (!pomoLog.length) return;
  el.innerHTML = pomoLog.slice(-5).reverse().map(l => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${l.task}</span><span style="color:var(--muted)">${l.time}</span>
    </div>`).join('');
}


// ─── HABITS ──────────────────────────────────────────────
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function addHabit() {
  if (!checkLogin('habit')) return;
  if (!RL.addItem.guard()) return;
  const name = sanitize(document.getElementById('habit-name').value, 150);
  if (!name) return;

  const habitData = {
    name,
    cat: document.getElementById('habit-cat').value,
  };

  if (editState.habit) {
    const idx = state.habits.findIndex(h => h.id === editState.habit);
    if (idx !== -1) {
      state.habits[idx] = { ...state.habits[idx], ...habitData };
      showToast('Habit updated ✓', 'success');
    }
    editState.habit = null;
    const addBtn = document.querySelector('#page-habits .btn-primary');
    if (addBtn) addBtn.textContent = '+ Add Habit';
  } else {
    state.habits.push({
      id: Date.now(),
      ...habitData,
      streak: 0,
      completedDates: []
    });
    showToast('Habit added ✓', 'success');
  }

  document.getElementById('habit-name').value = '';
  save(); renderHabits();
}

function editHabit(id) {
  const h = state.habits.find(habit => habit.id === id);
  if (!h) return;
  editState.habit = id;
  document.getElementById('habit-name').value = h.name;
  document.getElementById('habit-cat').value = h.cat;

  const addBtn = document.querySelector('#page-habits .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Habit';

  document.getElementById('habit-name').focus();
}
function toggleHabit(id) {
  if (!checkLogin()) return;
  const h = state.habits.find(h => h.id === id);
  if (!h) return;
  const today = getTodayKey();
  if (h.completedDates.includes(today)) {
    h.completedDates = h.completedDates.filter(d => d !== today);
    h.streak = Math.max(0, h.streak - 1);
  } else {
    h.completedDates.push(today);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yk = yesterday.toISOString().split('T')[0];
    h.streak = h.completedDates.includes(yk) ? h.streak + 1 : 1;
  }
  save(); renderHabits(); renderDashboard();
}
function deleteHabit(id) { if (!checkLogin()) return; state.habits = state.habits.filter(h => h.id !== id); save(); renderHabits(); }
function renderHabits() {
  const today = getTodayKey();
  const total = state.habits.length;
  const done = state.habits.filter(h => h.completedDates.includes(today)).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('habits-pct').textContent = pct + '%';
  document.getElementById('habits-bar').style.width = pct + '%';
  const el = document.getElementById('habits-list');
  if (!total) { el.innerHTML = `<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">No habits yet</div></div>`; }
  else el.innerHTML = state.habits.map(h => {
    const isDone = h.completedDates.includes(today);
    return `<div class="habit-item">
      <div class="habit-toggle ${isDone ? 'done' : ''}" onclick="toggleHabit(${h.id})">${isDone ? '✓' : ''}</div>
      <div style="flex:1">
        <div class="habit-name" style="${isDone ? 'text-decoration:line-through;color:var(--muted)' : ''}">${h.name}</div>
        <div style="font-size:11px;color:var(--muted)">${h.cat}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="habit-streak">🔥 ${h.streak}</div>
        <button class="task-del" onclick="editHabit(${h.id})" title="Edit">✏️</button>
        <button class="task-del" onclick="deleteHabit(${h.id})" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('');
  const sel = document.getElementById('habits-stats');
  if (!total) { sel.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">No habits yet</div></div>`; return; }
  const best = [...state.habits].sort((a, b) => b.streak - a.streak)[0];
  sel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="stat-card"><div class="stat-num">${done}/${total}</div><div class="stat-label">Completed today</div></div>
      <div class="stat-card"><div class="stat-num">${best ? best.streak : 0}🔥</div><div class="stat-label">Best streak: ${best ? best.name : '-'}</div></div>
      <div class="stat-card"><div class="stat-num">${state.habits.reduce((a, h) => a + h.completedDates.length, 0)}</div><div class="stat-label">Total check-ins</div></div>
    </div>`;
}

// ─── NOTES ───────────────────────────────────────────────
function addNote() {
  if (!checkLogin('note')) return;
  if (!RL.addItem.guard()) return;
  const title = sanitize(document.getElementById('note-title').value, 200);
  if (!title) return;

  const noteData = {
    title,
    content: sanitize(document.getElementById('note-content').value, 2000),
    tag: sanitize(document.getElementById('note-tag').value, 80),
    type: document.getElementById('note-type').value,
  };

  if (editState.note) {
    const idx = state.notes.findIndex(n => n.id === editState.note);
    if (idx !== -1) {
      state.notes[idx] = { ...state.notes[idx], ...noteData };
      showToast('Note updated ✓', 'success');
    }
    editState.note = null;
    const addBtn = document.querySelector('#page-knowledge .btn-primary');
    if (addBtn) addBtn.textContent = '+ Save Note';
  } else {
    state.notes.push({
      id: Date.now(),
      ...noteData,
      date: new Date().toLocaleDateString('en-IN')
    });
    showToast('Note added ✓', 'success');
  }

  ['note-title', 'note-content', 'note-tag'].forEach(id => document.getElementById(id).value = '');
  save(); renderNotes();
}

function editNote(id) {
  const n = state.notes.find(note => note.id === id);
  if (!n) return;
  editState.note = id;
  document.getElementById('note-title').value = n.title;
  document.getElementById('note-content').value = n.content;
  document.getElementById('note-tag').value = n.tag;
  document.getElementById('note-type').value = n.type;

  const addBtn = document.querySelector('#page-knowledge .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Note';

  document.getElementById('note-title').focus();
}
function deleteNote(id) { if (!checkLogin()) return; state.notes = state.notes.filter(n => n.id !== id); save(); renderNotes(); }
function renderNotes() {
  const q = (document.getElementById('note-search') || {}).value?.toLowerCase() || '';
  const filtered = state.notes.filter(n => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tag.toLowerCase().includes(q));
  const el = document.getElementById('notes-list');
  if (!filtered.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">🗒️</div><div class="empty-text">No notes yet</div></div>`; return; }
  el.innerHTML = filtered.slice().reverse().map(n => `
    <div class="card" style="margin-bottom:10px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
        <div>
          <div style="font-family:var(--font-head);font-weight:700;font-size:14px;word-break:break-word">${n.title}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${n.date}${n.tag ? ' · ' + n.tag : ''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="tag tag-green">${n.type}</span>
          <button class="task-del" onclick="editNote(${n.id})" title="Edit">✏️</button>
          <button class="task-del" onclick="deleteNote(${n.id})" title="Delete">🗑</button>
        </div>
      </div>
      ${n.content ? `<div style="font-size:13px;color:var(--muted);line-height:1.6;white-space:pre-wrap;word-break:break-word">${n.content}</div>` : ''}
    </div>`).join('');
}

// ─── BUDGET ──────────────────────────────────────────────
function addTransaction() {
  if (!checkLogin('transaction')) return;
  if (!RL.addItem.guard()) return;
  const desc = sanitize(document.getElementById('txn-desc').value, 200);
  const amount = safeAmount(document.getElementById('txn-amount').value);
  if (!desc || !amount) { showToast('Please enter a valid description and amount.', 'warn'); return; }

  const txnData = {
    desc, amount,
    cat: document.getElementById('txn-cat').value,
    type: document.getElementById('txn-type').value,
    date: document.getElementById('txn-date').value || new Date().toISOString().split('T')[0]
  };

  if (editState.budget) {
    const idx = state.transactions.findIndex(t => t.id === editState.budget);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], ...txnData };
      showToast('Transaction updated ✓', 'success');
    }
    editState.budget = null;
    const addBtn = document.querySelector('#page-budget .btn-primary');
    if (addBtn) addBtn.textContent = '+ Add Transaction';
  } else {
    state.transactions.push({
      id: Date.now(),
      ...txnData
    });
    showToast('Transaction added ✓', 'success');
  }

  ['txn-desc', 'txn-amount'].forEach(id => document.getElementById(id).value = '');
  save(); renderBudget();
}

function editTransaction(id) {
  const t = state.transactions.find(txn => txn.id === id);
  if (!t) return;
  editState.budget = id;
  document.getElementById('txn-desc').value = t.desc;
  document.getElementById('txn-amount').value = t.amount;
  document.getElementById('txn-cat').value = t.cat;
  document.getElementById('txn-type').value = t.type;
  document.getElementById('txn-date').value = t.date;

  const addBtn = document.querySelector('#page-budget .btn-primary');
  if (addBtn) addBtn.textContent = 'Update Transaction';

  document.getElementById('txn-desc').focus();
}
function deleteTransaction(id) { if (!checkLogin()) return; state.transactions = state.transactions.filter(t => t.id !== id); save(); renderBudget(); }
function renderBudget() {
  const income = state.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = state.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;
  document.getElementById('b-income').textContent = '₹' + income.toLocaleString('en-IN');
  document.getElementById('b-expense').textContent = '₹' + expense.toLocaleString('en-IN');
  const bel = document.getElementById('b-balance');
  bel.textContent = '₹' + balance.toLocaleString('en-IN');
  bel.className = 'budget-amount ' + (balance >= 0 ? 'income' : 'expense');
  // categories
  const cats = {};
  state.transactions.filter(t => t.type === 'expense').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  const colors = catColors();
  const catEl = document.getElementById('budget-categories');
  if (!Object.keys(cats).length) { catEl.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">No expenses yet</div></div>`; }
  else {
    const maxVal = Math.max(...Object.values(cats));
    catEl.innerHTML = Object.entries(cats).map(([cat, amt], i) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${colors[i % colors.length]};display:inline-block"></span>${cat}</span>
          <span>₹${amt.toLocaleString('en-IN')}</span>
        </div>
        <div class="progress-bg"><div class="progress-fill" style="width:${Math.round(amt / maxVal * 100)}%;background:${colors[i % colors.length]}"></div></div>
      </div>`).join('');
  }
  // transactions list
  const tEl = document.getElementById('budget-list');
  const sorted = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) { tEl.innerHTML = `<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">No transactions yet</div></div>`; return; }
  tEl.innerHTML = sorted.slice(0, 20).map(t => `
    <div class="expense-item">
      <div class="expense-cat">
        <span class="cat-dot" style="background:${t.type === 'income' ? 'var(--green-light)' : 'var(--red)'}"></span>
        <div>
          <div style="font-size:13px">${t.desc}</div>
          <div style="font-size:11px;color:var(--muted)">${t.cat} · ${t.date}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:500;color:${t.type === 'income' ? 'var(--green-light)' : 'var(--red)'}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}</span>
        <button class="task-del" onclick="editTransaction(${t.id})" title="Edit">✏️</button>
        <button class="task-del" onclick="deleteTransaction(${t.id})" title="Delete">🗑</button>
      </div>
    </div>`).join('');
}

// ─── DASHBOARD ───────────────────────────────────────────
function renderDashboard() {
  const today = getTodayKey();
  const pending = state.tasks.filter(t => !t.done).length;
  const total = state.habits.length;
  const done = state.habits.filter(h => h.completedDates.includes(today)).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const income = state.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = state.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  document.getElementById('stat-tasks').textContent = pending;
  document.getElementById('stat-habits').textContent = pct + '%';
  document.getElementById('stat-courses').textContent = state.courses.length;
  const bal = income - expense; document.getElementById('stat-balance').textContent = (bal >= 0 ? '₹' : '-₹') + Math.abs(bal).toLocaleString('en-IN');
  // due soon
  const upcoming = state.tasks.filter(t => !t.done && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const dtEl = document.getElementById('dash-tasks');
  dtEl.innerHTML = upcoming.length ? upcoming.map(t => `
    <div class="task-item">
      <div class="task-check ${t.done ? 'done' : ''}" onclick="toggleTask(${t.id})"></div>
      <div style="flex:1"><div class="task-name">${t.title}</div><div style="font-size:11px;color:var(--muted)">${t.course}</div></div>
      <div class="task-meta">${priorityTag(t.priority)}${daysLeft(t.due)}</div>
    </div>`).join('') : `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No upcoming tasks</div></div>`;
  // habits
  const dhEl = document.getElementById('dash-habits');
  dhEl.innerHTML = state.habits.length ? state.habits.slice(0, 6).map(h => {
    const isDone = h.completedDates.includes(today);
    return `<div class="habit-item"><div class="habit-toggle ${isDone ? 'done' : ''}" onclick="toggleHabit(${h.id})">${isDone ? '✓' : ''}</div><div class="habit-name" style="${isDone ? 'text-decoration:line-through;color:var(--muted)' : ''}">${h.name}</div><div class="habit-streak">🔥 ${h.streak}</div></div>`;
  }).join('') : `<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">No habits yet</div></div>`;
  // today sessions
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySess = state.sessions.filter(s => s.day === todayDay).sort((a, b) => a.start.localeCompare(b.start));
  const dsEl = document.getElementById('dash-sessions');
  dsEl.innerHTML = todaySess.length ? todaySess.map(s => `
    <div class="schedule-slot">
      <div class="slot-time">${s.start} – ${s.end}</div>
      <div class="slot-block"><div class="slot-title">${s.subject}</div>${s.topic ? `<div class="slot-sub">${s.topic}</div>` : ''}</div>
    </div>`).join('') : `<div class="empty"><div class="empty-icon">📖</div><div class="empty-text">No sessions for today</div></div>`;
}

// ─── INIT ─────────────────────────────────────────────────
document.getElementById('txn-date').valueAsDate = new Date();
document.getElementById('task-due').valueAsDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
renderDashboard();

// close modal on overlay click
document.getElementById('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

// keyboard shortcut
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeUpgradeModal(); } });

// ─── GOOGLE AUTH ──────────────────────────────────────────
async function authWithGoogle() {
  if (!RL.auth.guard()) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    showToast('Signed in with Google ✓', 'success');
  } catch (error) {
    console.error("Google login failed:", error);
    showToast('Google login failed. Check your Firebase settings.', 'error');
  }
}

// ─── UPGRADE MODAL ────────────────────────────────────────
let selectedPlan = null;

const PLANS = {
  monthly: { inr: 200, usd: 2, label: 'Monthly', desc: '₹200/month ($2) · 14-day free trial included' },
  yearly: { inr: 2400, usd: 24, label: 'Yearly', desc: '₹2,400/year ($24) · Best value — save 17%' },
  lifetime: { inr: 4500, usd: 45, label: 'Lifetime', desc: '₹4,500 one-time ($45) · Pay once, keep forever' }
};

function openUpgradeModal() {
  document.getElementById('upgrade-modal').classList.add('open');
}
function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.remove('open');
  // reset selection
  document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
  selectedPlan = null;
  document.getElementById('upgrade-total').textContent = 'Select a plan above to continue';
  document.getElementById('upgrade-total').classList.remove('has-plan');
  document.getElementById('btn-subscribe').disabled = true;
}

function selectPlan(plan) {
  selectedPlan = plan;
  document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('plan-' + plan).classList.add('selected');
  const info = PLANS[plan];
  const totalEl = document.getElementById('upgrade-total');
  totalEl.textContent = '✓ Selected: ' + info.label + ' — ' + info.desc;
  totalEl.classList.add('has-plan');
  const btn = document.getElementById('btn-subscribe');
  btn.disabled = false;
  btn.textContent = 'Get ' + info.label + ' — ₹' + info.inr.toLocaleString('en-IN');
}

function subscribePlan() {
  if (!selectedPlan) return;
  if (!currentUser) {
    closeUpgradeModal();
    document.getElementById('auth-overlay').style.display = 'flex';
    return;
  }
  const info = PLANS[selectedPlan];
  // TODO: integrate Razorpay/Stripe here
  modal('🎉 Premium Coming Soon', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:48px;margin-bottom:16px">🚀</div>
      <div style="font-family:var(--font-head);font-size:18px;font-weight:700;margin-bottom:8px">
        ${info.label} Plan Selected!
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7">
        Payment gateway integration coming soon.<br>
        You selected <strong>${info.label}</strong> at <strong>₹${info.inr.toLocaleString('en-IN')}</strong> ($${info.usd}).<br><br>
        We'll notify you at <strong>${currentUser.email}</strong> when checkout is live.
      </div>
    </div>`);
  closeUpgradeModal();
}


// close upgrade modal on overlay click
document.getElementById('upgrade-modal').addEventListener('click', function (e) { if (e.target === this) closeUpgradeModal(); });

// ─── FOOTER MODAL ──────────────────────────────────────
function openFooterModal() {
  document.getElementById('footer-modal').style.display = 'flex';
}
function closeFooterModal() {
  document.getElementById('footer-modal').style.display = 'none';
}
// close footer modal on overlay click
document.getElementById('footer-modal').addEventListener('click', function (e) { if (e.target === this) closeFooterModal(); });


// ─── SETTINGS ────────────────────────────────────────────

function switchSettings(section, el) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.s-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('ss-' + section).classList.add('active');
  if (el) el.classList.add('active');
  if (section === 'account') updateSettingsAccountUI();
}

function applyTheme(theme, el) {
  let actual = theme;
  if (theme === 'system') {
    actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', actual);
  localStorage.setItem('sp_theme', theme === 'system' ? 'system' : actual);
  updateThemeIcon(actual);
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  else { const t = document.getElementById('tc-' + theme); if (t) t.classList.add('selected'); }
}

function applyAccent(accent, el) {
  if (accent === 'default') document.documentElement.removeAttribute('data-accent');
  else document.documentElement.setAttribute('data-accent', accent);
  localStorage.setItem('sp_accent', accent);
  document.querySelectorAll('.accent-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.combo-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function applyCombo(theme, accent, el) {
  applyTheme(theme, null);
  applyAccent(accent, null);
  document.querySelectorAll('.theme-card,.accent-card,.combo-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const tc = document.getElementById('tc-' + theme); if (tc) tc.classList.add('selected');
}

function applySidebarLayout(layout, el) {
  document.body.classList.remove('sidebar-hover', 'sidebar-collapsed');
  document.body.setAttribute('data-layout', layout);
  if (layout === 'hover') document.body.classList.add('sidebar-hover');
  if (layout === 'collapsed') document.body.classList.add('sidebar-collapsed');
  localStorage.setItem('sp_layout', layout);
  document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  else { const lc = document.getElementById('lc-' + layout); if (lc) lc.classList.add('selected'); }
}

// Duplicate save removed for stability

function applyLanguage(lang) {
  localStorage.setItem('sp_lang', lang);
  const el = document.getElementById('lang-select');
  if (el) el.value = lang;
}

function updateSettingsAccountUI() {
  const el = document.getElementById('s-account-display');
  const subEl = document.getElementById('s-subscription-card');
  if (!el) return;

  if (currentUser) {
    const initial = (currentUser.displayName || currentUser.email || '?')[0].toUpperCase();
    const tierLabel = isAdmin ? 'Admin Plan' : 'Free Plan';

    el.innerHTML = `
      <div class="account-info-row">
        <div class="account-avatar">${currentUser.photoURL
        ? `<img src="${currentUser.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
        : initial}</div>
        <div>
          <div style="font-weight:700;font-size:16px">${currentUser.displayName || 'Crea User'}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:2px">${currentUser.email}</div>
          <span class="tier-badge ${isAdmin ? 'tier-premium' : 'tier-free'}" style="margin-top:6px">${tierLabel}</span>
        </div>
      </div>`;

    if (subEl) {
      if (isAdmin) {
        subEl.innerHTML = `
          <div class="settings-group-title">Subscription</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:600">Lifetime Plan</div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px">Admin status active · All features unlocked forever</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="tag tag-green">ACTIVE</span>
            </div>
          </div>`;
      } else {
        subEl.innerHTML = `
          <div class="settings-group-title">Subscription</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:600">Free Plan</div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px">3 items per category · Upgrade for unlimited</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openUpgradeModal()">⭐ Upgrade</button>
          </div>`;
      }
    }
  } else {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Not signed in — <a href="#" onclick="document.getElementById('auth-overlay').style.display='flex'" style="color:var(--green-light)">Sign in</a></div></div>`;
    if (subEl) subEl.style.display = 'none';
  }
}

// ─── CANVAS DRAWING ─────────────────────────────────────────
let canvas, ctx;
let drawing = false;
let currentTool = 'pen';
let currentColor = '#000000';
let currentLineWidth = 2;
let paths = [];
let redoPaths = [];
let currentPath = null;

function initCanvas() {
  canvas = document.getElementById('drawing-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseout', endDraw);

  canvas.addEventListener('touchstart', handleTouch);
  canvas.addEventListener('touchmove', handleTouch);
  canvas.addEventListener('touchend', endDraw);

  window.addEventListener('resize', () => {
    if (document.getElementById('page-draw').classList.contains('active')) {
      resizeCanvas();
    }
  });
}

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

function resizeCanvas() {
  if (!canvas) return;
  const container = document.getElementById('canvas-container');
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  if (canvas.width > 0 && canvas.height > 0) {
    tempCtx.drawImage(canvas, 0, 0);
  }

  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  redrawCanvas();
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function updateCanvasSize(val) {
  currentLineWidth = parseInt(val);
}

function insertCanvasImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let maxW = canvas.width * 0.8;
      let maxH = canvas.height * 0.8;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h *= maxW / w; w = maxW; }
      if (h > maxH) { w *= maxH / h; h = maxH; }

      paths.push({
        type: 'image',
        img: img,
        x: (canvas.width - w) / 2,
        y: (canvas.height - h) / 2,
        w: w,
        h: h
      });
      redoPaths = [];
      redrawCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function startDraw(e) {
  drawing = true;
  const pos = getMousePos(e);
  currentPath = {
    tool: currentTool,
    color: currentColor,
    width: currentLineWidth,
    points: [pos]
  };
  redoPaths = [];
}

function draw(e) {
  if (!drawing) return;
  const pos = getMousePos(e);
  currentPath.points.push(pos);

  // Draw the current line segment immediately for responsiveness
  ctx.beginPath();
  const prevPos = currentPath.points[currentPath.points.length - 2];
  ctx.moveTo(prevPos.x, prevPos.y);
  ctx.lineTo(pos.x, pos.y);

  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = currentLineWidth;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentTool === 'highlighter' ? hexToRgba(currentColor, 0.4) : currentColor;
    ctx.lineWidth = currentLineWidth;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  if (currentPath && currentPath.points.length > 0) {
    paths.push(currentPath);
  }
  currentPath = null;
  redrawCanvas(); // Redraw everything to ensure proper layering (especially for highlighters)
}

function redrawCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const path of paths) {
    if (path.type === 'image') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(path.img, path.x, path.y, path.w, path.h);
      continue;
    }

    if (path.points.length < 2) continue;

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }

    if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.tool === 'highlighter' ? hexToRgba(path.color, 0.4) : path.color;
    }

    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over'; // reset
}

function hexToRgba(hex, alpha) {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setCanvasTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.canvas-tool').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-' + tool).classList.add('active');

  const colorsEl = document.getElementById('canvas-colors');
  if (tool === 'eraser') {
    canvas.style.cursor = 'cell';
    if (colorsEl) colorsEl.style.opacity = '0.3';
    document.getElementById('canvas-size').value = currentLineWidth = 20;
  } else if (tool === 'highlighter') {
    canvas.style.cursor = 'crosshair';
    if (colorsEl) colorsEl.style.opacity = '1';
    document.getElementById('canvas-size').value = currentLineWidth = 15;
  } else {
    canvas.style.cursor = 'crosshair';
    if (colorsEl) colorsEl.style.opacity = '1';
    document.getElementById('canvas-size').value = currentLineWidth = 2;
  }
}

function setCanvasColor(color, el) {
  currentColor = color;
  if (currentTool === 'eraser') setCanvasTool('pen');
  document.querySelectorAll('.canvas-color').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.canvas-color').forEach(b => b.style.boxShadow = '0 0 0 1px var(--border)');
  if (el) {
    el.classList.add('active');
    el.style.boxShadow = '0 0 0 1px var(--green)';
  }
}

function canvasUndo() {
  if (paths.length > 0) {
    redoPaths.push(paths.pop());
    redrawCanvas();
  }
}

function canvasRedo() {
  if (redoPaths.length > 0) {
    paths.push(redoPaths.pop());
    redrawCanvas();
  }
}

function clearCanvas() {
  paths = [];
  redoPaths = [];
  redrawCanvas();
}

function saveCanvas() {
  if (!canvas) return;
  // Create a temporary canvas to draw the white background and the drawing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tCtx = tempCanvas.getContext('2d');

  // Fill with white background
  tCtx.fillStyle = '#ffffff';
  tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Draw the actual canvas on top
  tCtx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = `crea-note-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
  showToast('Note saved ✓', 'success');
}

// Initialize on load
setTimeout(initCanvas, 500);

// ─── INIT SETTINGS PREFERENCES ───────────────────────────
function initSettings() {
  // restore accent
  const accent = localStorage.getItem('sp_accent') || 'default';
  if (accent !== 'default') document.documentElement.setAttribute('data-accent', accent);
  const ac = document.getElementById('ac-' + accent);
  if (ac) { document.querySelectorAll('.accent-card').forEach(c => c.classList.remove('selected')); ac.classList.add('selected'); }

  // restore theme card selection
  const savedTheme = localStorage.getItem('sp_theme') || 'light';
  const tcKey = savedTheme === 'system' ? 'system' : savedTheme;
  const tc = document.getElementById('tc-' + tcKey);
  if (tc) { document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected')); tc.classList.add('selected'); }

  // restore layout
  const layout = localStorage.getItem('sp_layout') || 'fixed';
  applySidebarLayout(layout, null);

  // restore language
  const lang = localStorage.getItem('sp_lang') || 'en';
  applyLanguage(lang);
}
initSettings();
renderDashboard();
