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
  if(btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
initTheme();

// ─── FIREBASE ────────────────────────────────────────────
// Config is loaded from api.js (CREA_API) — keep api.js out of git!
let db, auth, currentUser = null;
try {
  firebase.initializeApp(CREA_API.firebase);
  db = firebase.firestore();
  auth = firebase.auth();
  
  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      document.getElementById('auth-overlay').style.display='none';
      const btn = document.getElementById('auth-btn');
      if(btn) { btn.title='Logout'; btn.textContent='🚪'; }
      loadStateFromFirebase();
    } else {
      document.getElementById('auth-overlay').style.display='none';
      const btn = document.getElementById('auth-btn');
      if(btn) { btn.title='Login'; btn.textContent='👤'; }
      state = {
        tasks: [], courses: [], sessions: [], habits: [],
        notes: [], transactions: [], pomoDone: 0, pomoTotal: 0
      };
      if (typeof renderDashboard === 'function') renderDashboard();
      const activeEl = document.querySelector('.page.active');
      if (activeEl && typeof showPage === 'function') {
        const activePage = activeEl.id.replace('page-','');
        showPage(activePage);
      }
    }
  });
} catch (e) { console.warn("Firebase not properly configured."); }

function authLogin() {
  if (!RL.auth.guard()) return;
  const e = document.getElementById('auth-email').value.trim();
  const p = document.getElementById('auth-pass').value;
  if (!e || !p) return;
  if(auth) auth.signInWithEmailAndPassword(e,p).catch(err=>document.getElementById('auth-error').textContent=err.message);
}
function authSignup() {
  if (!RL.auth.guard()) return;
  const e = document.getElementById('auth-email').value.trim();
  const p = document.getElementById('auth-pass').value;
  if (!e || !p || p.length < 6) { document.getElementById('auth-error').textContent = 'Password must be at least 6 characters.'; return; }
  if(auth) auth.createUserWithEmailAndPassword(e,p).catch(err=>document.getElementById('auth-error').textContent=err.message);
}
function authLogout() { if(auth) auth.signOut(); }

function handleAuthBtn() {
  if(currentUser) { authLogout(); }
  else { document.getElementById('auth-overlay').style.display='flex'; }
}

function checkLogin(type) {
  if (!currentUser) {
    const limit = (typeof CREA_API !== 'undefined') ? CREA_API.FREE_TIER_LIMIT : 3;
    if (!type) { document.getElementById('auth-overlay').style.display='flex'; return false; }
    const countMap = {
      task: state.tasks.length, course: state.courses.length,
      session: state.sessions.length, habit: state.habits.length,
      note: state.notes.length, transaction: state.transactions.length
    };
    if ((countMap[type] || 0) >= limit) {
      document.getElementById('auth-overlay').style.display='flex';
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

async function loadStateFromFirebase() {
  if (!currentUser || !db) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) state = { ...state, ...doc.data() };
    renderDashboard();
    const activePage = document.querySelector('.page.active').id.replace('page-','');
    showPage(activePage);
  } catch(e) { console.error("Error loading data:", e); }
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
const pages = {
  dashboard:'Dashboard', assignments:'Assignments & Exams',
  courses:'Course Manager', study:'Study Planner',
  pomodoro:'Pomodoro Timer', habits:'Habit Tracker',
  knowledge:'Knowledge Hub', budget:'Budget Tracker',
  settings:'Settings'
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelector(`.nav-item[onclick="showPage('${id}')"]`).classList.add('active');
  document.getElementById('topbar-title').textContent = pages[id];
  const actions = {
    assignments:`<button class="btn btn-primary btn-sm" onclick="document.getElementById('task-title').focus();showPage('assignments')">+ New Task</button>`,
    courses:`<button class="btn btn-primary btn-sm" onclick="document.getElementById('course-name').focus()">+ New Course</button>`,
    habits:`<button class="btn btn-primary btn-sm" onclick="document.getElementById('habit-name').focus()">+ New Habit</button>`,
  };
  document.getElementById('topbar-action').innerHTML = actions[id]||'';
  if(id==='dashboard') renderDashboard();
  if(id==='assignments') renderTasks();
  if(id==='courses') renderCourses();
  if(id==='study') renderSchedule();
  if(id==='habits') renderHabits();
  if(id==='knowledge') renderNotes();
  if(id==='budget') renderBudget();
}

// ─── CLOCK ───────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const d = now.toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'});
  document.getElementById('clock-sidebar').textContent = t;
  document.getElementById('date-sidebar').textContent = d;
}
updateClock(); setInterval(updateClock, 1000);

// ─── HELPERS ─────────────────────────────────────────────
function priorityTag(p) {
  const map = {Urgent:'tag-red',High:'tag-yellow',Medium:'tag-blue',Low:'tag-gray'};
  return `<span class="tag ${map[p]||'tag-gray'}">${p}</span>`;
}
function catColors() {
  return ['#3b9a6e','#4a90d9','#d4a017','#e05555','#9b59b6','#e67e22','#1abc9c','#e74c3c','#95a5a6'];
}
function daysLeft(due) {
  if(!due) return '';
  const diff = Math.ceil((new Date(due)-new Date())/(1000*60*60*24));
  if(diff<0) return `<span class="tag tag-red">${Math.abs(diff)}d overdue</span>`;
  if(diff===0) return `<span class="tag tag-red">Due today</span>`;
  if(diff<=3) return `<span class="tag tag-yellow">${diff}d left</span>`;
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
  if(!title) return;
  state.tasks.push({
    id: Date.now(), title,
    course: sanitize(document.getElementById('task-course').value, 100) || 'General',
    due: document.getElementById('task-due').value,
    type: document.getElementById('task-type').value,
    priority: document.getElementById('task-priority').value,
    done: false
  });
  ['task-title','task-course','task-due'].forEach(id=>document.getElementById(id).value='');
  save(); renderTasks(); renderDashboard();
  showToast('Task added ✓', 'success');
}
function toggleTask(id) {
  if (!checkLogin()) return;
  const t = state.tasks.find(t=>t.id===id);
  if(t) { t.done=!t.done; save(); renderTasks(); renderDashboard(); }
}
function deleteTask(id) {
  if (!checkLogin()) return;
  state.tasks = state.tasks.filter(t=>t.id!==id);
  save(); renderTasks(); renderDashboard();
}
function renderTasks() {
  const fs = document.getElementById('filter-status').value;
  const fp = document.getElementById('filter-priority').value;
  let tasks = state.tasks.filter(t=>
    (!fs || (fs==='pending'?!t.done:t.done)) &&
    (!fp || t.priority===fp)
  ).sort((a,b)=>{
    const po={Urgent:0,High:1,Medium:2,Low:3};
    return (po[a.priority]||3)-(po[b.priority]||3);
  });
  const el = document.getElementById('tasks-list');
  if(!tasks.length) { el.innerHTML=`<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No tasks found</div></div>`; return; }
  el.innerHTML = tasks.map(t=>`
    <div class="task-item">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div>
      <div style="flex:1">
        <div class="task-name ${t.done?'done':''}">${t.title}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${t.course} · ${t.type}</div>
      </div>
      <div class="task-meta">
        ${priorityTag(t.priority)}
        ${daysLeft(t.due)}
        <button class="task-del" onclick="deleteTask(${t.id})">🗑</button>
      </div>
    </div>`).join('');
}

// ─── COURSES ─────────────────────────────────────────────
function addCourse() {
  if (!checkLogin('course')) return;
  if (!RL.addItem.guard()) return;
  const name = sanitize(document.getElementById('course-name').value, 150);
  if(!name) return;
  state.courses.push({
    id:Date.now(), name,
    teacher: sanitize(document.getElementById('course-teacher').value, 100),
    schedule: sanitize(document.getElementById('course-schedule').value, 100)
  });
  ['course-name','course-teacher','course-schedule'].forEach(id=>document.getElementById(id).value='');
  save(); renderCourses();
  showToast('Course added ✓', 'success');
}
function deleteCourse(id) {
  if (!checkLogin()) return;
  state.courses = state.courses.filter(c=>c.id!==id);
  save(); renderCourses();
}
function renderCourses() {
  const el = document.getElementById('courses-list');
  if(!state.courses.length) { el.innerHTML=`<div class="empty"><div class="empty-icon">🎓</div><div class="empty-text">No courses yet</div></div>`; return; }
  const colors = catColors();
  el.innerHTML = state.courses.map((c,i)=>{
    const tasks = state.tasks.filter(t=>t.course.toLowerCase()===c.name.toLowerCase());
    const done = tasks.filter(t=>t.done).length;
    const pct = tasks.length ? Math.round(done/tasks.length*100):0;
    return `<div class="course-item">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <div class="course-name">${c.name}</div>
          <div class="course-meta">${c.teacher?'👤 '+c.teacher:''}${c.schedule?' · 🕐 '+c.schedule:''}</div>
        </div>
        <button class="task-del" onclick="deleteCourse(${c.id})">🗑</button>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${tasks.length} tasks</span><span style="color:${colors[i%colors.length]}">${pct}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
      </div>
    </div>`;
  }).join('');
}

// ─── STUDY SESSIONS ──────────────────────────────────────
function addSession() {
  if (!checkLogin('session')) return;
  if (!RL.addItem.guard()) return;
  const subject = sanitize(document.getElementById('session-subject').value, 150);
  if(!subject) return;
  state.sessions.push({
    id:Date.now(),
    day: document.getElementById('session-day').value,
    subject,
    start: document.getElementById('session-start').value,
    end: document.getElementById('session-end').value,
    topic: sanitize(document.getElementById('session-topic').value, 200)
  });
  ['session-subject','session-topic'].forEach(id=>document.getElementById(id).value='');
  save(); renderSchedule();
  showToast('Study session added ✓', 'success');
}
function deleteSession(id) {
  if (!checkLogin()) return;
  state.sessions = state.sessions.filter(s=>s.id!==id);
  save(); renderSchedule();
}
function renderSchedule() {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const el = document.getElementById('schedule-by-day');
  let html = '';
  days.forEach(day=>{
    const sess = state.sessions.filter(s=>s.day===day).sort((a,b)=>a.start.localeCompare(b.start));
    if(!sess.length) return;
    html += `<div class="card"><div class="card-title" style="margin-bottom:12px">📅 ${day}</div>`;
    html += sess.map(s=>`
      <div class="schedule-slot">
        <div class="slot-time">${s.start} – ${s.end}</div>
        <div class="slot-block">
          <div class="slot-title">${s.subject}</div>
          ${s.topic?`<div class="slot-sub">${s.topic}</div>`:''}
        </div>
        <button class="task-del" onclick="deleteSession(${s.id})" style="margin-left:8px">🗑</button>
      </div>`).join('');
    html += '</div>';
  });
  el.innerHTML = html || `<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">No sessions planned. Add one above!</div></div>`;
}

// ─── POMODORO ────────────────────────────────────────────
let pomoTimer=null, pomoSeconds=25*60, pomoTotalSeconds=25*60, pomoRunning=false;
let pomoMode='work', pomoSession=0, pomoLog=[], pomoDailyCount=0, pomoDailyMin=0;

function setMode(mode, min) {
  clearInterval(pomoTimer); pomoRunning=false;
  document.getElementById('pomo-start-btn').textContent='▶';
  pomoMode=mode; pomoSeconds=min*60; pomoTotalSeconds=min*60;
  document.getElementById('pomo-display').textContent=formatTime(pomoSeconds);
  document.getElementById('pomo-label').textContent={work:'Ready to focus?',short:'Time for a short break!',long:'Time for a long break!'}[mode];
  document.getElementById('pomo-prog').style.width='0%';
  document.querySelectorAll('.pomo-tab').forEach(t=>t.classList.remove('active'));
  event.target.classList.add('active');
}
function formatTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function togglePomo() {
  if(pomoRunning) {
    clearInterval(pomoTimer); pomoRunning=false;
    document.getElementById('pomo-start-btn').textContent='▶';
    document.getElementById('pomo-label').textContent='Paused';
  } else {
    pomoRunning=true;
    document.getElementById('pomo-start-btn').textContent='⏸';
    document.getElementById('pomo-label').textContent = pomoMode==='work'?'Focusing...':'On break...';
    pomoTimer = setInterval(()=>{
      pomoSeconds--;
      const pct = (1-pomoSeconds/pomoTotalSeconds)*100;
      document.getElementById('pomo-display').textContent=formatTime(pomoSeconds);
      document.getElementById('pomo-prog').style.width=pct+'%';
      if(pomoSeconds<=0) { clearInterval(pomoTimer); pomoRunning=false; pomoComplete(); }
    },1000);
  }
}
function pomoComplete() {
  if(pomoMode==='work') {
    pomoSession++; pomoDailyCount++; pomoDailyMin+=25;
    const task = document.getElementById('pomo-task-input').value||'Focus session';
    pomoLog.push({task,time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})});
    document.getElementById('pomo-count').textContent=`${pomoDailyCount} / 4`;
    document.getElementById('pomo-total-time').textContent=`${pomoDailyMin} min`;
    renderPomoLog();
    renderPomoDots();
  }
  document.getElementById('pomo-start-btn').textContent='▶';
  document.getElementById('pomo-label').textContent = pomoMode==='work'?'Session complete! 🎉':'Break over!';
  try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA').play(); } catch(e){}
}
function resetPomo() {
  clearInterval(pomoTimer); pomoRunning=false;
  pomoSeconds=pomoTotalSeconds;
  document.getElementById('pomo-display').textContent=formatTime(pomoSeconds);
  document.getElementById('pomo-prog').style.width='0%';
  document.getElementById('pomo-start-btn').textContent='▶';
  document.getElementById('pomo-label').textContent='Ready to focus?';
}
function skipPomo() { clearInterval(pomoTimer); pomoSeconds=0; pomoComplete(); }
function renderPomoLog() {
  const el = document.getElementById('pomo-log');
  if(!pomoLog.length) return;
  el.innerHTML = pomoLog.slice(-5).reverse().map(l=>`
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${l.task}</span><span style="color:var(--muted)">${l.time}</span>
    </div>`).join('');
}
function renderPomoDots() {
  const el = document.getElementById('pomo-dots');
  el.innerHTML = Array.from({length:4},(_,i)=>`<div class="pomo-dot ${i<pomoSession%4?'done':''}"></div>`).join('');
}
renderPomoDots();

// ─── HABITS ──────────────────────────────────────────────
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function addHabit() {
  if (!checkLogin('habit')) return;
  if (!RL.addItem.guard()) return;
  const name = sanitize(document.getElementById('habit-name').value, 150);
  if(!name) return;
  state.habits.push({ id:Date.now(), name, cat:document.getElementById('habit-cat').value, streak:0, completedDates:[] });
  document.getElementById('habit-name').value='';
  save(); renderHabits();
  showToast('Habit added ✓', 'success');
}
function toggleHabit(id) {
  if (!checkLogin()) return;
  const h = state.habits.find(h=>h.id===id);
  if(!h) return;
  const today = getTodayKey();
  if(h.completedDates.includes(today)) {
    h.completedDates = h.completedDates.filter(d=>d!==today);
    h.streak = Math.max(0,h.streak-1);
  } else {
    h.completedDates.push(today);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yk = yesterday.toISOString().split('T')[0];
    h.streak = h.completedDates.includes(yk) ? h.streak+1 : 1;
  }
  save(); renderHabits(); renderDashboard();
}
function deleteHabit(id) { if (!checkLogin()) return; state.habits=state.habits.filter(h=>h.id!==id); save(); renderHabits(); }
function renderHabits() {
  const today = getTodayKey();
  const total = state.habits.length;
  const done = state.habits.filter(h=>h.completedDates.includes(today)).length;
  const pct = total?Math.round(done/total*100):0;
  document.getElementById('habits-pct').textContent=pct+'%';
  document.getElementById('habits-bar').style.width=pct+'%';
  const el = document.getElementById('habits-list');
  if(!total) { el.innerHTML=`<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">No habits yet</div></div>`; }
  else el.innerHTML = state.habits.map(h=>{
    const isDone = h.completedDates.includes(today);
    return `<div class="habit-item">
      <div class="habit-toggle ${isDone?'done':''}" onclick="toggleHabit(${h.id})">${isDone?'✓':''}</div>
      <div style="flex:1">
        <div class="habit-name" style="${isDone?'text-decoration:line-through;color:var(--muted)':''}">${h.name}</div>
        <div style="font-size:11px;color:var(--muted)">${h.cat}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="habit-streak">🔥 ${h.streak}</div>
        <button class="task-del" onclick="deleteHabit(${h.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
  const sel = document.getElementById('habits-stats');
  if(!total) { sel.innerHTML=`<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">No habits yet</div></div>`; return; }
  const best = [...state.habits].sort((a,b)=>b.streak-a.streak)[0];
  sel.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="stat-card"><div class="stat-num">${done}/${total}</div><div class="stat-label">Completed today</div></div>
      <div class="stat-card"><div class="stat-num">${best?best.streak:0}🔥</div><div class="stat-label">Best streak: ${best?best.name:'-'}</div></div>
      <div class="stat-card"><div class="stat-num">${state.habits.reduce((a,h)=>a+h.completedDates.length,0)}</div><div class="stat-label">Total check-ins</div></div>
    </div>`;
}

// ─── NOTES ───────────────────────────────────────────────
function addNote() {
  if (!checkLogin('note')) return;
  if (!RL.addItem.guard()) return;
  const title = sanitize(document.getElementById('note-title').value, 200);
  if(!title) return;
  state.notes.push({
    id:Date.now(), title,
    content: sanitize(document.getElementById('note-content').value, 2000),
    tag: sanitize(document.getElementById('note-tag').value, 80),
    type: document.getElementById('note-type').value,
    date: new Date().toLocaleDateString('en-IN')
  });
  ['note-title','note-content','note-tag'].forEach(id=>document.getElementById(id).value='');
  save(); renderNotes();
  showToast('Note saved ✓', 'success');
}
function deleteNote(id) { if (!checkLogin()) return; state.notes=state.notes.filter(n=>n.id!==id); save(); renderNotes(); }
function renderNotes() {
  const q = (document.getElementById('note-search')||{}).value?.toLowerCase()||'';
  const filtered = state.notes.filter(n=>!q||n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q)||n.tag.toLowerCase().includes(q));
  const el = document.getElementById('notes-list');
  if(!filtered.length) { el.innerHTML=`<div class="empty"><div class="empty-icon">🗒️</div><div class="empty-text">No notes yet</div></div>`; return; }
  el.innerHTML = filtered.slice().reverse().map(n=>`
    <div class="card" style="margin-bottom:10px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
        <div>
          <div style="font-family:var(--font-head);font-weight:700;font-size:14px">${n.title}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${n.date}${n.tag?' · '+n.tag:''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="tag tag-green">${n.type}</span>
          <button class="task-del" onclick="deleteNote(${n.id})">🗑</button>
        </div>
      </div>
      ${n.content?`<div style="font-size:13px;color:var(--muted);line-height:1.6;white-space:pre-wrap">${n.content}</div>`:''}
    </div>`).join('');
}

// ─── BUDGET ──────────────────────────────────────────────
function addTransaction() {
  if (!checkLogin('transaction')) return;
  if (!RL.addItem.guard()) return;
  const desc = sanitize(document.getElementById('txn-desc').value, 200);
  const amount = safeAmount(document.getElementById('txn-amount').value);
  if(!desc || !amount) { showToast('Please enter a valid description and amount.', 'warn'); return; }
  state.transactions.push({
    id:Date.now(), desc, amount,
    cat: document.getElementById('txn-cat').value,
    type: document.getElementById('txn-type').value,
    date: document.getElementById('txn-date').value || new Date().toISOString().split('T')[0]
  });
  ['txn-desc','txn-amount'].forEach(id=>document.getElementById(id).value='');
  save(); renderBudget();
  showToast('Transaction added ✓', 'success');
}
function deleteTransaction(id) { if (!checkLogin()) return; state.transactions=state.transactions.filter(t=>t.id!==id); save(); renderBudget(); }
function renderBudget() {
  const income = state.transactions.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const expense = state.transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  const balance = income-expense;
  document.getElementById('b-income').textContent='₹'+income.toLocaleString('en-IN');
  document.getElementById('b-expense').textContent='₹'+expense.toLocaleString('en-IN');
  const bel = document.getElementById('b-balance');
  bel.textContent='₹'+balance.toLocaleString('en-IN');
  bel.className='budget-amount '+(balance>=0?'income':'expense');
  // categories
  const cats = {};
  state.transactions.filter(t=>t.type==='expense').forEach(t=>{ cats[t.cat]=(cats[t.cat]||0)+t.amount; });
  const colors = catColors();
  const catEl = document.getElementById('budget-categories');
  if(!Object.keys(cats).length) { catEl.innerHTML=`<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">No expenses yet</div></div>`; }
  else {
    const maxVal = Math.max(...Object.values(cats));
    catEl.innerHTML = Object.entries(cats).map(([cat,amt],i)=>`
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${colors[i%colors.length]};display:inline-block"></span>${cat}</span>
          <span>₹${amt.toLocaleString('en-IN')}</span>
        </div>
        <div class="progress-bg"><div class="progress-fill" style="width:${Math.round(amt/maxVal*100)}%;background:${colors[i%colors.length]}"></div></div>
      </div>`).join('');
  }
  // transactions list
  const tEl = document.getElementById('budget-list');
  const sorted = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(!sorted.length) { tEl.innerHTML=`<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">No transactions yet</div></div>`; return; }
  tEl.innerHTML = sorted.slice(0,20).map(t=>`
    <div class="expense-item">
      <div class="expense-cat">
        <span class="cat-dot" style="background:${t.type==='income'?'var(--green-light)':'var(--red)'}"></span>
        <div>
          <div style="font-size:13px">${t.desc}</div>
          <div style="font-size:11px;color:var(--muted)">${t.cat} · ${t.date}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:500;color:${t.type==='income'?'var(--green-light)':'var(--red)'}">${t.type==='income'?'+':'-'}₹${t.amount.toLocaleString('en-IN')}</span>
        <button class="task-del" onclick="deleteTransaction(${t.id})">🗑</button>
      </div>
    </div>`).join('');
}

// ─── DASHBOARD ───────────────────────────────────────────
function renderDashboard() {
  const today = getTodayKey();
  const pending = state.tasks.filter(t=>!t.done).length;
  const total = state.habits.length;
  const done = state.habits.filter(h=>h.completedDates.includes(today)).length;
  const pct = total?Math.round(done/total*100):0;
  const income = state.transactions.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const expense = state.transactions.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  document.getElementById('stat-tasks').textContent=pending;
  document.getElementById('stat-habits').textContent=pct+'%';
  document.getElementById('stat-courses').textContent=state.courses.length;
  const bal=income-expense; document.getElementById('stat-balance').textContent=(bal>=0?'₹':'-₹')+Math.abs(bal).toLocaleString('en-IN');
  // due soon
  const upcoming = state.tasks.filter(t=>!t.done&&t.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5);
  const dtEl = document.getElementById('dash-tasks');
  dtEl.innerHTML = upcoming.length ? upcoming.map(t=>`
    <div class="task-item">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTask(${t.id})"></div>
      <div style="flex:1"><div class="task-name">${t.title}</div><div style="font-size:11px;color:var(--muted)">${t.course}</div></div>
      <div class="task-meta">${priorityTag(t.priority)}${daysLeft(t.due)}</div>
    </div>`).join('') : `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No upcoming tasks</div></div>`;
  // habits
  const dhEl = document.getElementById('dash-habits');
  dhEl.innerHTML = state.habits.length ? state.habits.slice(0,6).map(h=>{
    const isDone=h.completedDates.includes(today);
    return `<div class="habit-item"><div class="habit-toggle ${isDone?'done':''}" onclick="toggleHabit(${h.id})">${isDone?'✓':''}</div><div class="habit-name" style="${isDone?'text-decoration:line-through;color:var(--muted)':''}">${h.name}</div><div class="habit-streak">🔥 ${h.streak}</div></div>`;
  }).join('') : `<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">No habits yet</div></div>`;
  // today sessions
  const todayDay = new Date().toLocaleDateString('en-US',{weekday:'long'});
  const todaySess = state.sessions.filter(s=>s.day===todayDay).sort((a,b)=>a.start.localeCompare(b.start));
  const dsEl = document.getElementById('dash-sessions');
  dsEl.innerHTML = todaySess.length ? todaySess.map(s=>`
    <div class="schedule-slot">
      <div class="slot-time">${s.start} – ${s.end}</div>
      <div class="slot-block"><div class="slot-title">${s.subject}</div>${s.topic?`<div class="slot-sub">${s.topic}</div>`:''}</div>
    </div>`).join('') : `<div class="empty"><div class="empty-icon">📖</div><div class="empty-text">No sessions for today</div></div>`;
}

// ─── INIT ─────────────────────────────────────────────────
document.getElementById('txn-date').valueAsDate = new Date();
document.getElementById('task-due').valueAsDate = new Date(Date.now()+7*24*60*60*1000);
renderDashboard();

// close modal on overlay click
document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)closeModal();});

// keyboard shortcut
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ closeModal(); closeUpgradeModal(); }});

// ─── GOOGLE AUTH ──────────────────────────────────────────
function authWithGoogle() {
  if (!RL.auth.guard()) return;
  if (!auth) { document.getElementById('auth-error').textContent = 'Firebase not configured.'; return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => { document.getElementById('auth-overlay').style.display='none'; showToast('Signed in with Google ✓', 'success'); })
    .catch(err => { document.getElementById('auth-error').textContent = err.message; });
}

// ─── UPGRADE MODAL ────────────────────────────────────────
let selectedPlan = null;

const PLANS = {
  monthly:  { inr: 200,  usd: 2,  label: 'Monthly',  desc: '₹200/month ($2) · 14-day free trial included' },
  yearly:   { inr: 2400, usd: 24, label: 'Yearly',   desc: '₹2,400/year ($24) · Best value — save 17%' },
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
document.getElementById('upgrade-modal').addEventListener('click', function(e){ if(e.target===this) closeUpgradeModal(); });

// ─── FOOTER MODAL ──────────────────────────────────────
function openFooterModal() {
  document.getElementById('footer-modal').style.display = 'flex';
}
function closeFooterModal() {
  document.getElementById('footer-modal').style.display = 'none';
}
// close footer modal on overlay click
document.getElementById('footer-modal').addEventListener('click', function(e){ if(e.target===this) closeFooterModal(); });


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
  else { const t = document.getElementById('tc-' + theme); if(t) t.classList.add('selected'); }
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
  const tc = document.getElementById('tc-' + theme); if(tc) tc.classList.add('selected');
}

function applySidebarLayout(layout, el) {
  document.body.classList.remove('sidebar-hover', 'sidebar-collapsed');
  if (layout === 'hover') document.body.classList.add('sidebar-hover');
  if (layout === 'collapsed') document.body.classList.add('sidebar-collapsed');
  localStorage.setItem('sp_layout', layout);
  document.querySelectorAll('.layout-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  else { const lc = document.getElementById('lc-' + layout); if(lc) lc.classList.add('selected'); }
}

function save() {
  const dataStr = JSON.stringify(state);
  localStorage.setItem('sp_data', dataStr);
  
  // Cloud Sync: If user is logged in, save to Firestore
  if (currentUser && db) {
    db.collection('users').doc(currentUser.uid).set(state)
      .then(() => console.log("Cloud sync successful"))
      .catch(err => console.error("Cloud sync failed:", err));
  }
}

function applyLanguage(lang) {
  localStorage.setItem('sp_lang', lang);
  const el = document.getElementById('lang-select');
  if (el) el.value = lang;
}

function updateSettingsAccountUI() {
  const el = document.getElementById('s-account-display');
  if (!el) return;
  if (currentUser) {
    const initial = (currentUser.displayName || currentUser.email || '?')[0].toUpperCase();
    el.innerHTML = `
      <div class="account-info-row">
        <div class="account-avatar">${currentUser.photoURL
          ? `<img src="${currentUser.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
          : initial}</div>
        <div>
          <div style="font-weight:700;font-size:16px">${currentUser.displayName || 'Crea User'}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:2px">${currentUser.email}</div>
          <span class="tier-badge tier-free" style="margin-top:6px">Free Plan</span>
        </div>
      </div>`;
  } else {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Not signed in — <a href="#" onclick="document.getElementById('auth-overlay').style.display='flex'" style="color:var(--green-light)">Sign in</a></div></div>`;
  }
}

// ─── INIT SETTINGS PREFERENCES ───────────────────────────
function initSettings() {
  // restore accent
  const accent = localStorage.getItem('sp_accent') || 'default';
  if (accent !== 'default') document.documentElement.setAttribute('data-accent', accent);
  const ac = document.getElementById('ac-' + accent);
  if (ac) { document.querySelectorAll('.accent-card').forEach(c=>c.classList.remove('selected')); ac.classList.add('selected'); }

  // restore theme card selection
  const savedTheme = localStorage.getItem('sp_theme') || 'light';
  const tcKey = savedTheme === 'system' ? 'system' : savedTheme;
  const tc = document.getElementById('tc-' + tcKey);
  if (tc) { document.querySelectorAll('.theme-card').forEach(c=>c.classList.remove('selected')); tc.classList.add('selected'); }

  // restore layout
  const layout = localStorage.getItem('sp_layout') || 'fixed';
  applySidebarLayout(layout, null);

  // restore language
  const lang = localStorage.getItem('sp_lang') || 'en';
  applyLanguage(lang);
}
initSettings();
