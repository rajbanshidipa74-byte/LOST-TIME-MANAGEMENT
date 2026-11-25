// Lost Time Management Web Application (Group C — SRS v1.0 + Hybrid AI Coach + Notifications)

const STORAGE_KEYS = {
  USERS: 'lt_users',
  CURRENT_USER: 'lt_current_user',
  ACTIVITIES: 'lt_activities',
  PLANS: 'lt_plans',
  ACTIVE_TIMER: 'lt_active_timer',
  SETTINGS: 'lt_settings',
  NOTIFICATIONS: 'lt_notifications',
  GEMINI_KEY: 'lt_gemini_api_key'
};

let timerInterval = null;
let scheduleWatcherInterval = null;
let statsPeriod = 'day';
let pieChartInstance = null;
let barChartInstance = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('selected-date').value = today;

  const currentUser = getCurrentUser();
  if (currentUser) {
    showApp(currentUser);
  }
});

// ================= AUTHENTICATION (SR-01 to SR-06) =================
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;

  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  if (users.some(u => u.email === email)) {
    document.getElementById('reg-error').textContent = 'An account with this email already exists.';
    return;
  }

  const newUser = { id: 'u_' + Date.now(), name, email, password };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
  showApp(newUser);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    document.getElementById('login-error').textContent = 'Invalid email or password.';
    return;
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  showApp(user);
}

function loginAsDemo() {
  const demoUser = {
    id: 'demo_group_c',
    name: 'Group C Evaluator',
    email: 'groupc@dongshin.ac.kr'
  };
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
  seedDemoDataIfEmpty(demoUser.id);
  showApp(demoUser);
}

function handleLogout() {
  clearInterval(timerInterval);
  clearInterval(scheduleWatcherInterval);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
}

function showApp(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('sidebar-username').textContent = user.name;
  document.getElementById('sidebar-email').textContent = user.email;
  document.getElementById('prof-name').value = user.name;
  document.getElementById('prof-email').value = user.email;

  updateAiBadge();
  loadUserSettings();
  restoreTimerState();
  startScheduleWatcher();
  refreshAllViews();
  renderNotifications();
}

// ================= NAVIGATION =================
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');

  const titles = {
    dashboard: ['Dashboard', 'Overview of your daily productivity and lost time'],
    tracker: ['Activity Tracker', 'Start, pause, resume, and record your activities'],
    planner: ['Daily Planner', 'Schedule activities and compare planned vs. actual time'],
    statistics: ['Statistics & Lost-Time Analysis', 'Visual reports and top sources of lost time'],
    aicoach: ['AI Time Coach', 'Smart pattern diagnostics and personalized schedule optimization'],
    profile: ['Profile & Goals', 'Manage personal targets and alert thresholds']
  };
  document.getElementById('page-title').textContent = titles[page][0];
  document.getElementById('page-subtitle').textContent = titles[page][1];

  if (page === 'statistics') renderCharts();
}

// ================= NOTIFICATIONS & ALERTS ENGINE (SR-46, SR-47) =================
function pushNotification(title, message, type = 'warning', uniqueKey = null) {
  const user = getCurrentUser();
  if (!user) return;

  const settings = getUserSettings();
  if (!settings.alertsEnabled) return;

  const allNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');

  // Avoid duplicate alerts for the same event key
  if (uniqueKey && allNotifs.some(n => n.userId === user.id && n.uniqueKey === uniqueKey)) {
    return;
  }

  const newNotif = {
    id: 'notif_' + Date.now(),
    userId: user.id,
    title,
    message,
    type,
    uniqueKey,
    read: false,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  allNotifs.unshift(newNotif);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs.slice(0, 30)));

  showToast(`${title}: ${message}`, type);
  playAlertBeep();
  sendBrowserPush(title, message);
  renderNotifications();
}

function showToast(text, type = 'warning') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'warning' ? 'danger' : type}`;
  toast.textContent = text;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 6000);
}

function toggleNotifPanel() {
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('hidden');

  if (!dropdown.classList.contains('hidden')) {
    const user = getCurrentUser();
    const allNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    allNotifs.forEach(n => {
      if (n.userId === user.id) n.read = true;
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
    renderNotifications();
  }
}

function clearAllNotifications() {
  const user = getCurrentUser();
  let allNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
  allNotifs = allNotifs.filter(n => n.userId !== user.id);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(allNotifs));
  renderNotifications();
}

function renderNotifications() {
  const user = getCurrentUser();
  if (!user) return;
  const userNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]')
    .filter(n => n.userId === user.id);

  const unreadCount = userNotifs.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  const listEl = document.getElementById('notif-list');
  listEl.innerHTML = userNotifs.length === 0
    ? '<p class="info-text" style="padding: 14px;">No notifications yet.</p>'
    : userNotifs.map(n => `
        <div class="notif-item ${n.type}">
          <strong>${n.title}</strong>
          <div>${n.message}</div>
          <small>${n.timestamp}</small>
        </div>
      `).join('');
}

function requestBrowserPushPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notifications.');
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      pushNotification('Desktop Alerts Enabled', 'You will now receive browser push alerts when lost time exceeds your limit.', 'success');
    } else {
      alert('Notification permission was denied in browser settings.');
    }
  });
}

function sendBrowserPush(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏱️ Lost Time — ${title}`, { body });
  }
}

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 580;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    // AudioContext blocked before user gesture
  }
}

function sendTestNotification() {
  pushNotification(
    '⚠️ Lost Time Threshold Alert',
    'Demo Warning: Your unproductive/lost time has reached your daily alert threshold!',
    'warning'
  );
}

// Watches planned activities every 30s to alert when a scheduled task starts
function startScheduleWatcher() {
  clearInterval(scheduleWatcherInterval);
  scheduleWatcherInterval = setInterval(() => {
    const user = getCurrentUser();
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const nowHHMM = new Date().toTimeString().slice(0, 5);

    const plans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]')
      .filter(p => p.userId === user.id && p.date === today);

    plans.forEach(p => {
      if (p.startTime === nowHHMM) {
        pushNotification(
          '📅 Scheduled Activity Starting',
          `It is ${p.startTime}! Time to start "${p.activityName}" (${p.priority} Priority).`,
          'success',
          `plan_start_${p.id}_${today}`
        );
      }
    });
  }, 30000);
}

// ================= ACTIVITY TIMER (SR-14 to SR-22, Appendix B.3 & B.8) =================
function getTimerState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER) || 'null');
}

function saveTimerState(state) {
  if (state) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
  }
}

function startTimer() {
  const nameInput = document.getElementById('timer-activity-name').value.trim();
  if (!nameInput) {
    alert('Please enter an activity name before starting the timer.');
    return;
  }
  const [category, classification, isLostStr] = document.getElementById('timer-category').value.split('|');

  const timerState = {
    userId: getCurrentUser().id,
    activityName: nameInput,
    category,
    classification,
    isLostTime: isLostStr === 'true',
    status: 'Running',
    startTime: Date.now(),
    lastPausedAt: null,
    totalPausedMs: 0,
    liveAlertTriggered: false
  };

  saveTimerState(timerState);
  restoreTimerState();
}

function pauseTimer() {
  const state = getTimerState();
  if (!state || state.status !== 'Running') return;
  state.status = 'Paused';
  state.lastPausedAt = Date.now();
  saveTimerState(state);
  restoreTimerState();
}

function resumeTimer() {
  const state = getTimerState();
  if (!state || state.status !== 'Paused') return;
  state.totalPausedMs += Date.now() - state.lastPausedAt;
  state.lastPausedAt = null;
  state.status = 'Running';
  saveTimerState(state);
  restoreTimerState();
}

function stopTimer() {
  const state = getTimerState();
  if (!state) return;

  const endTime = Date.now();
  let totalPausedMs = state.totalPausedMs;
  if (state.status === 'Paused' && state.lastPausedAt) {
    totalPausedMs += endTime - state.lastPausedAt;
  }

  // Formula (Appendix B.8): Active Duration = (End - Start) - Total Paused Time
  const activeMs = Math.max(0, (endTime - state.startTime) - totalPausedMs);
  const durationMinutes = Number((activeMs / 60000).toFixed(2));
  const pausedMinutes = Number((totalPausedMs / 60000).toFixed(2));

  const startDateObj = new Date(state.startTime);
  const record = {
    id: 'act_' + Date.now(),
    userId: state.userId,
    date: startDateObj.toISOString().split('T')[0],
    activityName: state.activityName,
    category: state.category,
    classification: state.classification,
    isLostTime: state.isLostTime,
    startFormatted: formatClockTime(state.startTime),
    endFormatted: formatClockTime(endTime),
    pausedMinutes,
    durationMinutes: durationMinutes < 0.1 ? 1 : durationMinutes
  };

  const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  activities.unshift(record);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));

  saveTimerState(null);
  document.getElementById('timer-activity-name').value = '';
  restoreTimerState();
  refreshAllViews();
}

function restoreTimerState() {
  clearInterval(timerInterval);
  const state = getTimerState();
  const badge = document.getElementById('timer-status-badge');
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnStop = document.getElementById('btn-stop');

  if (!state || state.userId !== getCurrentUser()?.id) {
    badge.textContent = 'IDLE';
    badge.className = 'status-pill idle';
    document.getElementById('timer-display').textContent = '00:00:00';
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnResume.disabled = true;
    btnStop.disabled = true;
    return;
  }

  document.getElementById('timer-activity-name').value = state.activityName;
  badge.textContent = state.status.toUpperCase();
  badge.className = `status-pill ${state.status.toLowerCase()}`;

  btnStart.disabled = true;
  btnPause.disabled = state.status !== 'Running';
  btnResume.disabled = state.status !== 'Paused';
  btnStop.disabled = false;

  const updateDisplay = () => {
    const now = state.status === 'Paused' ? state.lastPausedAt : Date.now();
    const elapsedMs = Math.max(0, (now - state.startTime) - state.totalPausedMs);
    document.getElementById('timer-display').textContent = formatDurationHHMMSS(elapsedMs);

    // Real-time Lost-Time Limit Alert while timer is actively running (SR-47)
    if (state.status === 'Running' && state.isLostTime && !state.liveAlertTriggered) {
      const settings = getUserSettings();
      const today = new Date().toISOString().split('T')[0];
      const existingLostToday = sumMinutes(
        JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]')
          .filter(a => a.userId === state.userId && a.date === today && a.isLostTime)
      );
      const liveMinutes = elapsedMs / 60000;

      if (existingLostToday + liveMinutes >= settings.lostLimit) {
        state.liveAlertTriggered = true;
        saveTimerState(state);
        pushNotification(
          '⚠️ Live Lost-Time Warning',
          `You have reached your ${settings.lostLimit}m daily lost-time limit while on "${state.activityName}"!`,
          'warning'
        );
      }
    }
  };

  updateDisplay();
  if (state.status === 'Running') {
    timerInterval = setInterval(updateDisplay, 1000);
  }
}

function deleteActivity(id) {
  let activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  activities = activities.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  refreshAllViews();
}

// ================= DAILY PLANNER (SR-23 to SR-29) =================
function addPlannedActivity(e) {
  e.preventDefault();
  const name = document.getElementById('plan-name').value.trim();
  const start = document.getElementById('plan-start').value;
  const end = document.getElementById('plan-end').value;
  const priority = document.getElementById('plan-priority').value;
  const date = document.getElementById('selected-date').value;
  const errorEl = document.getElementById('plan-error');

  const plannedMinutes = timeStringToMinutes(end) - timeStringToMinutes(start);
  if (plannedMinutes <= 0) {
    errorEl.textContent = 'End time must be later than start time.';
    return;
  }
  errorEl.textContent = '';

  const plans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]');
  plans.push({
    id: 'plan_' + Date.now(),
    userId: getCurrentUser().id,
    date,
    activityName: name,
    startTime: start,
    endTime: end,
    plannedMinutes,
    priority
  });
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));

  document.getElementById('plan-name').value = '';
  refreshAllViews();
}

function deletePlan(id) {
  let plans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]');
  plans = plans.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  refreshAllViews();
}

// ================= REFRESH ALL VIEWS & DASHBOARD =================
function refreshAllViews() {
  const user = getCurrentUser();
  if (!user) return;
  const selectedDate = document.getElementById('selected-date').value;

  const allActivities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]')
    .filter(a => a.userId === user.id);
  const dayActivities = allActivities.filter(a => a.date === selectedDate);

  const dayPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]')
    .filter(p => p.userId === user.id && p.date === selectedDate);

  const settings = getUserSettings();

  const totalMin = sumMinutes(dayActivities);
  const prodMin = sumMinutes(dayActivities.filter(a => a.classification === 'Productive'));
  const unprodMin = sumMinutes(dayActivities.filter(a => a.classification === 'Unproductive'));
  const lostMin = sumMinutes(dayActivities.filter(a => a.isLostTime));

  document.getElementById('dash-total').textContent = formatMinutes(totalMin);
  document.getElementById('dash-productive').textContent = formatMinutes(prodMin);
  document.getElementById('dash-unproductive').textContent = formatMinutes(unprodMin);
  document.getElementById('dash-lost').textContent = formatMinutes(lostMin);

  document.getElementById('dash-goal-status').textContent =
    `Goal: ${formatMinutes(prodMin)} / ${formatMinutes(settings.productiveGoal)}`;
  document.getElementById('dash-lost-limit').textContent =
    `Limit: ${formatMinutes(lostMin)} / ${formatMinutes(settings.lostLimit)}`;

  // Check Productive Goal Achievement Alert
  if (settings.alertsEnabled && prodMin >= settings.productiveGoal && prodMin > 0) {
    pushNotification(
      '🎉 Daily Productive Goal Reached!',
      `Congratulations! You completed ${formatMinutes(prodMin)} of productive work on ${selectedDate}.`,
      'success',
      `goal_reached_${selectedDate}`
    );
  }

  // Check Lost Time Threshold Alert Banner & Notification (SR-47)
  const banner = document.getElementById('lost-time-banner');
  if (settings.alertsEnabled && lostMin >= settings.lostLimit) {
    banner.classList.remove('hidden');
    banner.textContent = `⚠️ Lost Time Alert: You have spent ${formatMinutes(lostMin)} on unproductive/lost activities on ${selectedDate} (limit: ${formatMinutes(settings.lostLimit)}).`;

    pushNotification(
      '⚠️ Lost Time Limit Exceeded',
      `You spent ${formatMinutes(lostMin)} on distractions on ${selectedDate} (limit: ${formatMinutes(settings.lostLimit)}).`,
      'warning',
      `lost_limit_${selectedDate}_${Math.floor(lostMin)}`
    );
  } else {
    banner.classList.add('hidden');
  }

  const dashActEl = document.getElementById('dash-activities-list');
  dashActEl.innerHTML = dayActivities.length === 0
    ? '<p class="info-text">No activities recorded for this date yet.</p>'
    : dayActivities.map(a => `
        <div class="list-item">
          <div>
            <strong>${a.activityName}</strong><br/>
            <small>${a.category} • ${a.startFormatted} - ${a.endFormatted}</small>
          </div>
          <div>
            <span class="badge badge-${a.classification.toLowerCase()}">${formatMinutes(a.durationMinutes)}</span>
          </div>
        </div>
      `).join('');

  const lostMap = {};
  dayActivities.filter(a => a.isLostTime).forEach(a => {
    lostMap[a.activityName] = (lostMap[a.activityName] || 0) + a.durationMinutes;
  });
  const sortedLost = Object.entries(lostMap).sort((a, b) => b[1] - a[1]);

  const dashLostEl = document.getElementById('dash-lost-sources');
  dashLostEl.innerHTML = sortedLost.length === 0
    ? '<p class="info-text">Zero lost time detected today. Great focus!</p>'
    : sortedLost.map(([name, mins]) => `
        <div class="list-item">
          <strong>${name}</strong>
          <span class="badge badge-lost">${formatMinutes(mins)} lost</span>
        </div>
      `).join('');

  const dashPlanEl = document.getElementById('dash-planned-list');
  dashPlanEl.innerHTML = dayPlans.length === 0
    ? '<p class="info-text">No planned activities for this day.</p>'
    : dayPlans.map(p => `
        <div class="list-item">
          <div>
            <strong>${p.activityName}</strong><br/>
            <small>${p.startTime} – ${p.endTime} (${p.priority})</small>
          </div>
          <span class="badge badge-productive">${formatMinutes(p.plannedMinutes)}</span>
        </div>
      `).join('');

  document.getElementById('activities-table-body').innerHTML = dayActivities.length === 0
    ? '<tr><td colspan="7">No records found for selected date.</td></tr>'
    : dayActivities.map(a => `
        <tr>
          <td><strong>${a.activityName}</strong></td>
          <td>${a.category}</td>
          <td><span class="badge badge-${a.classification.toLowerCase()}">${a.classification}</span></td>
          <td>${a.startFormatted} – ${a.endFormatted}</td>
          <td>${a.pausedMinutes}m</td>
          <td><strong>${formatMinutes(a.durationMinutes)}</strong></td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteActivity('${a.id}')">Delete</button></td>
        </tr>
      `).join('');

  document.getElementById('planner-table-body').innerHTML = dayPlans.length === 0
    ? '<tr><td colspan="7">No planned activities for this date.</td></tr>'
    : dayPlans.map(p => {
        const actualMinutes = sumMinutes(
          dayActivities.filter(a => a.activityName.toLowerCase() === p.activityName.toLowerCase())
        );
        const variance = Number((actualMinutes - p.plannedMinutes).toFixed(1));
        const varianceLabel = actualMinutes === 0
          ? 'Not tracked yet'
          : variance === 0
          ? '0m (On target)'
          : variance > 0
          ? `+${variance}m over plan`
          : `${Math.abs(variance)}m under plan`;

        return `
          <tr>
            <td><strong>${p.activityName}</strong></td>
            <td>${p.startTime} – ${p.endTime}</td>
            <td>${p.priority}</td>
            <td>${formatMinutes(p.plannedMinutes)}</td>
            <td>${formatMinutes(actualMinutes)}</td>
            <td><strong>${varianceLabel}</strong></td>
            <td><button class="btn btn-sm btn-danger" onclick="deletePlan('${p.id}')">Remove</button></td>
          </tr>
        `;
      }).join('');

  if (!document.getElementById('page-statistics').classList.contains('hidden')) {
    renderCharts();
  }
}

// ================= STATISTICS & CHARTS (SR-30 to SR-42) =================
function setStatsPeriod(period) {
  statsPeriod = period;
  ['day', 'week', 'month'].forEach(p => {
    const btn = document.getElementById(`period-${p}`);
    btn.className = p === period ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
  });
  renderCharts();
}

function renderCharts() {
  const user = getCurrentUser();
  const selectedDate = new Date(document.getElementById('selected-date').value);
  const allActivities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]')
    .filter(a => a.userId === user.id);

  const filtered = allActivities.filter(a => {
    const actDate = new Date(a.date);
    const diffDays = (selectedDate - actDate) / (1000 * 60 * 60 * 24);
    if (statsPeriod === 'day') return a.date === document.getElementById('selected-date').value;
    if (statsPeriod === 'week') return diffDays >= 0 && diffDays < 7;
    return diffDays >= 0 && diffDays < 30;
  });

  const prod = sumMinutes(filtered.filter(a => a.classification === 'Productive'));
  const unprod = sumMinutes(filtered.filter(a => a.classification === 'Unproductive'));
  const lost = sumMinutes(filtered.filter(a => a.isLostTime));

  if (pieChartInstance) pieChartInstance.destroy();
  pieChartInstance = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Productive Time', 'Unproductive Time', 'Lost Time'],
      datasets: [{
        data: [prod, unprod, lost],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
      }]
    }
  });

  const catTotals = {};
  filtered.forEach(a => {
    catTotals[a.category] = (catTotals[a.category] || 0) + a.durationMinutes;
  });

  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(catTotals),
      datasets: [{
        label: 'Minutes Spent',
        data: Object.values(catTotals),
        backgroundColor: '#2563eb'
      }]
    }
  });

  const total = prod + unprod + lost;
  const lostPercent = total > 0 ? Math.round((lost / total) * 100) : 0;
  document.getElementById('lost-analysis-report').innerHTML = total === 0
    ? '<p>Insufficient activity data for the selected period. Track some activities first to view lost-time insights.</p>'
    : `<p><strong>Period Summary (${statsPeriod.toUpperCase()}):</strong> You tracked <strong>${formatMinutes(total)}</strong> in total.</p>
       <p>• <strong>Productive Time:</strong> ${formatMinutes(prod)} (${Math.round((prod / total) * 100)}%)</p>
       <p>• <strong>Lost Time:</strong> ${formatMinutes(lost)} (<strong>${lostPercent}%</strong> of your tracked time)</p>
       <p>${lostPercent > 30
         ? '⚠️ <strong>Recommendation:</strong> Lost time exceeds 30%. Consider scheduling strict blocks in the Daily Planner for high-priority tasks.'
         : '✅ <strong>Great job!</strong> Your lost time is under control.'}</p>`;
}

// ================= HYBRID AI TIME COACH =================
function saveGeminiKey() {
  const key = document.getElementById('gemini-api-key').value.trim();
  if (!key) return;
  localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key);
  updateAiBadge();
  alert('Gemini API Key saved locally in your browser!');
}

function clearGeminiKey() {
  localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
  document.getElementById('gemini-api-key').value = '';
  updateAiBadge();
  alert('API Key cleared. Switched back to Smart Built-in AI Mode.');
}

function updateAiBadge() {
  const key = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
  const badge = document.getElementById('ai-mode-badge');
  if (!badge) return;
  if (key) {
    badge.textContent = 'Live Gemini AI Connected';
    badge.className = 'badge badge-productive';
    document.getElementById('gemini-api-key').value = key;
  } else {
    badge.textContent = 'Smart Built-in AI Ready';
    badge.className = 'badge badge-unproductive';
  }
}

async function runAiAnalysis() {
  const user = getCurrentUser();
  const selectedDate = document.getElementById('selected-date').value;
  const outputBox = document.getElementById('ai-output-box');
  const btn = document.getElementById('btn-run-ai');
  const customQuestion = document.getElementById('ai-custom-question').value.trim();

  const dayActivities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]')
    .filter(a => a.userId === user.id && a.date === selectedDate);
  const dayPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]')
    .filter(p => p.userId === user.id && p.date === selectedDate);
  const settings = getUserSettings();

  btn.disabled = true;
  btn.textContent = '⏳ Analyzing...';
  outputBox.innerHTML = '<p>🤖 AI Coach is analyzing your schedule and distraction patterns...</p>';

  const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);

  if (apiKey) {
    try {
      const prompt = `You are an AI Time Management Coach for the "Lost Time" app.
Analyze this user's daily records for ${selectedDate}:
- Daily Productive Goal: ${settings.productiveGoal} minutes
- Max Allowed Lost Time Limit: ${settings.lostLimit} minutes
- Recorded Activities: ${JSON.stringify(dayActivities)}
- Planned Schedule: ${JSON.stringify(dayPlans)}
- User's Custom Question: "${customQuestion || 'Give me a concise diagnostic and 3 actionable recommendations to reduce lost time.'}"

Respond in clean HTML using short bullet points and bold highlights (no markdown backticks).`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        outputBox.innerHTML = `<div class="ai-insight-card"><strong>✨ Live Gemini AI Insights (${selectedDate})</strong></div>${aiText}`;
        btn.disabled = false;
        btn.textContent = '✨ Analyze My Day with AI';
        return;
      }
    } catch (err) {
      console.warn('Gemini API fallback triggered:', err);
    }
  }

  setTimeout(() => {
    outputBox.innerHTML = generateBuiltInAiReport(dayActivities, dayPlans, settings, selectedDate, customQuestion);
    btn.disabled = false;
    btn.textContent = '✨ Analyze My Day with AI';
  }, 400);
}

function generateBuiltInAiReport(activities, plans, settings, date, question) {
  if (activities.length === 0 && plans.length === 0) {
    return `<div class="ai-insight-card">
      <strong>🤖 Smart AI Diagnostic (${date}):</strong><br/>
      No activities or plans recorded for this date yet. Start tracking at least one session in the <strong>Activity Tracker</strong> or switch to the <strong>Quick Demo Account</strong> to test AI pattern detection.
    </div>`;
  }

  const totalMin = sumMinutes(activities);
  const prodMin = sumMinutes(activities.filter(a => a.classification === 'Productive'));
  const lostActivities = activities.filter(a => a.isLostTime);
  const lostMin = sumMinutes(lostActivities);
  const score = totalMin > 0 ? Math.min(100, Math.round((prodMin / Math.max(totalMin, settings.productiveGoal)) * 100)) : 0;

  let topDistraction = 'None';
  let topDistractionMin = 0;
  lostActivities.forEach(a => {
    if (a.durationMinutes > topDistractionMin) {
      topDistractionMin = a.durationMinutes;
      topDistraction = a.activityName;
    }
  });

  const uncompletedPlans = plans.filter(p =>
    !activities.some(a => a.activityName.toLowerCase() === p.activityName.toLowerCase())
  );

  return `
    <div class="ai-insight-card">
      <strong>📊 Focus Efficiency Score: ${score}/100</strong><br/>
      You logged <strong>${formatMinutes(prodMin)}</strong> of productive work against your daily target of <strong>${formatMinutes(settings.productiveGoal)}</strong>, with <strong>${formatMinutes(lostMin)}</strong> classified as lost time.
    </div>
    <div class="ai-insight-card">
      <strong>🔍 Primary Lost-Time Pattern Detected:</strong><br/>
      ${topDistractionMin > 0
        ? `Your #1 distraction on ${date} was <strong>"${topDistraction}"</strong> (${formatMinutes(topDistractionMin)}). Replacing just 50% of this block with a Pomodoro session saves <strong>${formatMinutes(Math.round(topDistractionMin / 2))}</strong>.`
        : `Zero distraction sessions recorded! Your focus discipline on ${date} is exceptional.`}
    </div>
    <div class="ai-insight-card">
      <strong>📅 Schedule & Action Plan:</strong><br/>
      • ${uncompletedPlans.length > 0
          ? `You have <strong>${uncompletedPlans.length}</strong> planned task(s) not yet tracked (e.g., <em>"${uncompletedPlans[0].activityName}"</em>). Prioritize these first.`
          : `All planned tasks have matching tracked records — great schedule adherence!`}
      <br/>• <strong>AI Tip:</strong> Click <em>"+ Auto-Add AI Focus Block to Planner"</em> above to schedule a 50-minute deep-work session for tomorrow.
      ${question ? `<br/>• <strong>Regarding your question ("${question}"):</strong> Use the Activity Tracker's Pause/Resume button instead of switching apps mid-task to keep active focus blocks intact.` : ''}
    </div>
  `;
}

function applyAiSuggestedPlan() {
  const user = getCurrentUser();
  const date = document.getElementById('selected-date').value;
  const plans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS) || '[]');

  plans.push({
    id: 'plan_ai_' + Date.now(),
    userId: user.id,
    date,
    activityName: 'AI Deep Focus Block (No Social Media)',
    startTime: '16:30',
    endTime: '17:20',
    plannedMinutes: 50,
    priority: 'High'
  });

  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  refreshAllViews();
  pushNotification('📅 AI Plan Added', 'Scheduled "AI Deep Focus Block (50m)" in your Daily Planner.', 'success');
}

// ================= PROFILE & GOALS (SR-43 to SR-47) =================
function getUserSettings() {
  const user = getCurrentUser();
  const allSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
  return allSettings[user.id] || { productiveGoal: 240, lostLimit: 90, alertsEnabled: true };
}

function loadUserSettings() {
  const s = getUserSettings();
  document.getElementById('goal-productive').value = s.productiveGoal;
  document.getElementById('goal-lost').value = s.lostLimit;
  document.getElementById('notif-enabled').checked = s.alertsEnabled;
}

function saveProfile(e) {
  e.preventDefault();
  const user = getCurrentUser();
  user.name = document.getElementById('prof-name').value.trim();
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  document.getElementById('sidebar-username').textContent = user.name;
  showToast('Profile updated successfully!', 'success');
}

function saveGoalsAndNotifications(e) {
  e.preventDefault();
  const user = getCurrentUser();
  const allSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
  allSettings[user.id] = {
    productiveGoal: Number(document.getElementById('goal-productive').value),
    lostLimit: Number(document.getElementById('goal-lost').value),
    alertsEnabled: document.getElementById('notif-enabled').checked
  };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(allSettings));
  refreshAllViews();
  showToast('Daily goals and alert thresholds saved!', 'success');
}

// ================= HELPERS & DEMO SEED =================
function sumMinutes(list) {
  return Number(list.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0).toFixed(1));
}

function formatMinutes(mins) {
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatDurationHHMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatClockTime(timestamp) {
  return new Date(timestamp).toTimeString().slice(0, 5);
}

function timeStringToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function seedDemoDataIfEmpty(userId) {
  const today = new Date().toISOString().split('T')[0];
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  if (existing.some(a => a.userId === userId)) return;

  const sampleActivities = [
    {
      id: 'demo_1', userId, date: today,
      activityName: 'SRS & System Design', category: 'Studying & Research',
      classification: 'Productive', isLostTime: false,
      startFormatted: '09:00', endFormatted: '10:30', pausedMinutes: 5, durationMinutes: 85
    },
    {
      id: 'demo_2', userId, date: today,
      activityName: 'Instagram & Reels', category: 'Social Media & Scrolling',
      classification: 'Lost', isLostTime: true,
      startFormatted: '10:35', endFormatted: '11:20', pausedMinutes: 0, durationMinutes: 45
    },
    {
      id: 'demo_3', userId, date: today,
      activityName: 'Lunch Break', category: 'Rest & Meals',
      classification: 'Unproductive', isLostTime: false,
      startFormatted: '12:00', endFormatted: '12:40', pausedMinutes: 0, durationMinutes: 40
    }
  ];

  const samplePlans = [
    {
      id: 'plan_demo_1', userId, date: today,
      activityName: 'SRS & System Design', startTime: '09:00', endTime: '10:30',
      plannedMinutes: 90, priority: 'High'
    },
    {
      id: 'plan_demo_2', userId, date: today,
      activityName: 'Frontend Implementation', startTime: '14:00', endTime: '16:00',
      plannedMinutes: 120, priority: 'High'
    }
  ];

  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([...sampleActivities, ...existing]));
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(samplePlans));
}
