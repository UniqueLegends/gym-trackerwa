// --------------------
// ROUTINE & CONFIG
// --------------------
const routine = {
  Monday: { name: "Chest + Triceps", exercises: ["ramp-up sets - Incline DB Press", "Decline DB Press", "Pec Deck Flies", "Push Downs", "One arm dumbell tricep extension", "CardioMon"] },
  Tuesday: { name: "Back + Biceps", exercises: ["Lat Pulldown", "Seated Rows", "Bicep Curl", "Hammer Curl", "CardioTue"] },
  Wednesday: { name: "Shoulders", exercises: ["Overhead Press", "Lateral Raise", "Shrugs", "Pec Deck Rear-Delt Laterals", "CardioWed"] },
  Thursday: { name: "Lower Body", exercises: ["Squat", "Lunges", "Leg Curl", "Leg Press", "Leg Extension", "Calf Raise", "CardioThurs"] },
  Friday: { name: "Abs + Cardio", exercises: ["SitUps", "Crunches", "Leg Raises", "Core Twist", "Planks", "CardioFri"] },
  Saturday: { name: "Full Body (Light)", exercises: ["Mobility", "Weak Point Training", "Light Compound Practice", "Stretching"] },
  Sunday: { name: "Rest", exercises: [] }
};


// --------------------
// STATE
// --------------------
let currentContext = { date: null, exercise: null };

// --------------------
// DOM ELEMENTS
// --------------------
const els = {
  date: document.getElementById("workoutDate"),
  weight: document.getElementById("bodyWeight"),
  gymCheck: document.getElementById("gymCheck"),
  container: document.getElementById("exerciseContainer"),
  streak: document.getElementById("streakCount"),
  modal: document.getElementById("addSetModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalInputs: {
    w: document.getElementById("modalWeight"),
    r: document.getElementById("modalReps"),
    s: document.getElementById("modalSets")
  }
};

const getData = () => JSON.parse(localStorage.getItem("gymData")) || { streak: 0 };
const saveData = (d) => localStorage.setItem("gymData", JSON.stringify(d));

// Helper: debounce to avoid excessive writes
function debounce(fn, wait = 600) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Small transient toast for unobtrusive feedback
function showToast(msg = "Saved") {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: '8px',
    zIndex: 9999,
    fontSize: '14px'
  });
  document.body.appendChild(t);
  // Try a small haptic/vibration if supported (iPhone may ignore this but it's harmless)
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(() => t.remove(), 1500);
}

// Debounced auto-save wrapper
const autoSave = debounce(() => saveWorkout(true), 800);

// Create a safe slug/id from an exercise name
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanum with '-'
    .replace(/^-+|-+$/g, ''); // trim leading/trailing '-'
}

// Generate a DOM-safe id for an exercise (prefix with 'ex-')
function exerciseId(name) {
  return 'ex-' + slugify(name);
}

// --------------------
// INITIALIZATION
// --------------------
window.onload = () => {
  const d = new Date();
  els.date.value = d.toISOString().split('T')[0]; // Safe ISO date
  renderStreak();

  // Auto-load today's workout to reduce clicks
  loadWorkout();

  // Auto-load when date changes or Enter pressed
  els.date.addEventListener('change', loadWorkout);
  els.date.addEventListener('keydown', e => { if (e.key === 'Enter') loadWorkout(); });

  // Auto-save when weight input changes (debounced)
  els.weight.addEventListener('input', () => autoSave());
  // Save immediately on gym checkbox change
  els.gymCheck.addEventListener('change', () => saveWorkout(true));

  // Modal keyboard actions: Enter to confirm, Escape to close
  Object.values(els.modalInputs).forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmAddSet();
      if (e.key === 'Escape') closeModal();
    });
  });

  // iOS-only: remove desktop keyboard shortcuts (not needed on iPhone)
  // Add a swipe-right gesture on the workout screen to go back (common iOS gesture)
  (function setupTouchNavigation() {
    let startX = 0, startY = 0;
    const el = document.getElementById('workout');
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Detect a right swipe with minimal vertical movement
      if (dx > 60 && Math.abs(dy) < 40) goHome();
    });
  })();

  // Register a minimal service worker to enable install & offline cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('Service Worker registered:', reg.scope);
    }).catch(err => console.warn('SW registration failed:', err));
  }

  // Keep a reference to the beforeinstallprompt event (Android/Chrome)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showToast('Install available — tap the share menu to add to Home Screen');
    // You could show a custom Install UI here and call deferredPrompt.prompt() when user taps it.
  });
};

// --------------------
// STREAK
// --------------------
function changeStreak(amt) {
  const data = getData();
  data.streak = Math.max(0, (data.streak || 0) + amt);
  saveData(data);
  renderStreak();
}

function resetStreak() {
  if (confirm("Reset streak?")) {
    const data = getData();
    data.streak = 0;
    saveData(data);
    renderStreak();
  }
}

function renderStreak() {
  els.streak.textContent = getData().streak || 0;
}

// --------------------
// WORKOUT LOGIC
// --------------------
function loadWorkout() {
  const dateVal = els.date.value;
  if (!dateVal) return;

  const [y, m, d] = dateVal.split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  const dayName = localDate.toLocaleDateString("en-US", { weekday: "long" });

  const data = getData();
  data[dateVal] ||= {};

  document.getElementById("home").classList.add("hidden");
  document.getElementById("workout").classList.remove("hidden");

  const exercises = routine[dayName]?.exercises || [];
  document.getElementById("dayTitle").innerText = `${dayName} - ${routine[dayName]?.name || "Rest"} (${exercises.length} exercise${exercises.length === 1 ? '' : 's'})`;
  els.weight.value = data[dateVal].bodyWeight || "";
  els.gymCheck.checked = !!data[dateVal].attendedGym;

  els.container.innerHTML = "";

  // Validate routine sanity (helpful when editing routine in source)
  if (exercises.length > 0) {
    const slugs = exercises.map(s => slugify(s));
    if (new Set(slugs).size !== slugs.length) {
      console.warn('Duplicate exercise names detected for', dayName, exercises);
      showToast('Warning: duplicate exercise names may cause data collisions');
    }
    const nonStrings = exercises.filter(e => typeof e !== 'string');
    if (nonStrings.length > 0) {
      console.warn('Non-string exercise entries detected:', nonStrings);
      showToast('Warning: Some exercises have invalid format');
    }
  }

  if (exercises.length === 0) {
    els.container.innerHTML = "<p style='text-align:center; color:#666;'>No exercises for today.</p>";
  } else {
    exercises.forEach(ex => createExerciseCard(dateVal, ex));
    // sanity check: ensure number of created cards matches exercises
    const created = els.container.children.length;
    if (created !== exercises.length) {
      console.warn(`Expected ${exercises.length} exercise cards, but created ${created}.`, { dayName, exercises });
      showToast('Warning: Some exercises failed to render — check console');
    }
  }
}

function createExerciseCard(date, exercise) {
  const div = document.createElement("div");
  div.className = "card";
  const tid = exerciseId(exercise);
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>${exercise}</h3>
    </div>
    <table id="${tid}">
      <thead><tr><th>#</th><th>KG</th><th>REPS</th><th>SETS</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <button class="add-btn">Add Set +</button>
  `;
  els.container.appendChild(div);
  // attach event listener safely to avoid quoting issues in names
  const btn = div.querySelector('.add-btn');
  if (btn) btn.addEventListener('click', () => openAddSetModal(date, exercise));
  renderTable(date, exercise);
}

function renderTable(date, exercise) {
  const data = getData();
  const list = data[date]?.[exercise];

  const tbodyEl = document.getElementById(exerciseId(exercise));
  if (!tbodyEl) return; // safety
  const tbody = tbodyEl.querySelector("tbody");
  tbody.innerHTML = "";

  if (!list || !Array.isArray(list)) return;

  list.forEach((set, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${set.weight}</td>
      <td>${set.reps}</td>
      <td>${set.sets}</td>
      <td><span onclick="deleteSet('${date}', '${exercise}', ${i})" style="color:red; cursor:pointer;">✕</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// --------------------
// MODAL & INPUT HANDLERS
// --------------------
function openAddSetModal(date, exercise) {
  currentContext = { date, exercise };
  els.modalTitle.innerText = `Add: ${exercise}`;

  // Auto-fill previous weight if available
  const data = getData();
  const sets = data[date]?.[exercise] || [];
  const lastSet = sets[sets.length - 1];

  els.modalInputs.w.value = lastSet ? lastSet.weight : "";
  els.modalInputs.r.value = lastSet ? lastSet.reps : "";
  els.modalInputs.s.value = "1";

  els.modal.classList.remove("hidden");
  els.modalInputs.w.focus();
}

function closeModal() {
  els.modal.classList.add("hidden");
}

function confirmAddSet() {
  const w = els.modalInputs.w.value;
  const r = els.modalInputs.r.value;
  const s = els.modalInputs.s.value;

  if (!w || !r || !s) return;

  const { date, exercise } = currentContext;
  const data = getData();

  data[date] ||= {};
  data[date][exercise] ||= [];
  data[date][exercise].push({ weight: w, reps: r, sets: s });
  // Mark gym attended automatically when adding sets and sync UI
  data[date].attendedGym = true;
  els.gymCheck.checked = true;

  saveData(data);
  renderTable(date, exercise);
  closeModal();
  showToast('Set added ✅');
}

function deleteSet(date, exercise, index) {
  const data = getData();
  const list = data[date] && data[date][exercise];
  if (!list || !Array.isArray(list)) return;
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);

  // Remove exercise key if it has no sets left
  if (list.length === 0) {
    delete data[date][exercise];
  }

  // If there are no sets left for any exercise that day, unmark gym attendance
  const hasAnySets = Object.keys(data[date] || {}).some(k => Array.isArray(data[date][k]) && data[date][k].length > 0);
  if (!hasAnySets) {
    data[date].attendedGym = false;
    // If the currently loaded date matches, reflect in the UI
    if (els.date.value === date) els.gymCheck.checked = false;
  }

  saveData(data);
  renderTable(date, exercise);
  showToast('Set removed');
}

// --------------------
// SAVE & EXPORT
// --------------------
function saveWorkout(silent = false) {
  const date = els.date.value;
  if (!date) return;
  const data = getData();
  data[date] ||= {};
  data[date].bodyWeight = els.weight.value;
  data[date].attendedGym = els.gymCheck.checked;
  saveData(data);
  if (!silent) showToast('Workout saved ✅');
}

function goHome() {
  // Auto-save before returning home
  saveWorkout(true);
  document.getElementById("workout").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
  renderStreak();
}

function exportWeightCSV() {
  const data = getData();
  let csv = "Date,Weight\n";
  Object.keys(data).sort().forEach(d => {
    if (data[d].bodyWeight) csv += `${d},${data[d].bodyWeight}\n`;
  });
  download(csv, "weight.csv");
}

function exportGymCSV() {
  const data = getData();
  let csv = "Date,Gym,Exercise,Weight,Reps,Sets\n";
  Object.keys(data).sort().forEach(d => {
    if (d === 'streak') return;
    const day = data[d];
    const attended = day.attendedGym ? "Yes" : "No";
    // If no exercises, just log attendance
    csv += `${d},${attended},,,,\n`;
    // Log exercises
    Object.keys(day).forEach(key => {
      if (Array.isArray(day[key])) {
        day[key].forEach(s => {
          csv += `${d},${attended},${key},${s.weight},${s.reps},${s.sets}\n`;
        });
      }
    });
  });
  download(csv, "gym_data.csv");
}

function download(content, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  a.download = name;
  a.click();
}