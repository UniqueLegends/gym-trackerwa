// --------------------
// ROUTINE & CONFIG
// --------------------
const routine = {
  Monday: { name: "Chest + Triceps", exercises: ["Bench Press", "Incline DB Press", "Tricep Pushdown"] },
  Tuesday: { name: "Back + Biceps", exercises: ["Lat Pulldown", "Barbell Row", "Bicep Curl"] },
  Wednesday: { name: "Shoulders + Abs", exercises: ["Overhead Press", "Lateral Raise", "Plank"] },
  Thursday: { name: "Lower Body", exercises: ["Squat", "Leg Press", "Calf Raise"] },
  Friday: { name: "Abs + Cardio", exercises: ["Crunches", "Leg Raises", "Treadmill"] },
  Saturday: { name: "Full Body", exercises: ["Deadlift", "Push Ups", "Pull Ups"] },
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

// --------------------
// INITIALIZATION
// --------------------
window.onload = () => {
  const d = new Date();
  els.date.value = d.toISOString().split('T')[0]; // Safe ISO date
  renderStreak();
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
  if(confirm("Reset streak?")) {
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
  if(!dateVal) return;

  const [y, m, d] = dateVal.split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  const dayName = localDate.toLocaleDateString("en-US", { weekday: "long" });

  const data = getData();
  data[dateVal] ||= {};

  document.getElementById("home").classList.add("hidden");
  document.getElementById("workout").classList.remove("hidden");
  
  document.getElementById("dayTitle").innerText = `${dayName} - ${routine[dayName]?.name || "Rest"}`;
  els.weight.value = data[dateVal].bodyWeight || "";
  els.gymCheck.checked = !!data[dateVal].attendedGym;
  
  els.container.innerHTML = "";
  
  const exercises = routine[dayName]?.exercises || [];
  if(exercises.length === 0) {
    els.container.innerHTML = "<p style='text-align:center; color:#666;'>No exercises for today.</p>";
  } else {
    exercises.forEach(ex => createExerciseCard(dateVal, ex));
  }
}

function createExerciseCard(date, exercise) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>${exercise}</h3>
    </div>
    <table id="table-${exercise.replace(/\s/g, '')}">
      <thead><tr><th>#</th><th>KG</th><th>REPS</th><th>SETS</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <button onclick="openAddSetModal('${date}', '${exercise}')" class="add-btn">Add Set +</button>
  `;
  els.container.appendChild(div);
  renderTable(date, exercise);
}

function renderTable(date, exercise) {
  const data = getData();
  const list = data[date]?.[exercise];
  if(!list || !Array.isArray(list)) return;

  const tbody = document.getElementById(`table-${exercise.replace(/\s/g, '')}`).querySelector("tbody");
  tbody.innerHTML = "";

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

  if(!w || !r || !s) return;

  const { date, exercise } = currentContext;
  const data = getData();
  
  data[date] ||= {};
  data[date][exercise] ||= [];
  data[date][exercise].push({ weight: w, reps: r, sets: s });
  
  saveData(data);
  renderTable(date, exercise);
  closeModal();
}

function deleteSet(date, exercise, index) {
  const data = getData();
  data[date][exercise].splice(index, 1);
  saveData(data);
  renderTable(date, exercise);
}

// --------------------
// SAVE & EXPORT
// --------------------
function saveWorkout() {
  const date = els.date.value;
  const data = getData();
  data[date] ||= {};
  data[date].bodyWeight = els.weight.value;
  data[date].attendedGym = els.gymCheck.checked;
  saveData(data);
  alert("Workout Saved!");
}

function goHome() {
  document.getElementById("workout").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
  renderStreak();
}

function exportWeightCSV() {
  const data = getData();
  let csv = "Date,Weight\n";
  Object.keys(data).sort().forEach(d => {
    if(data[d].bodyWeight) csv += `${d},${data[d].bodyWeight}\n`;
  });
  download(csv, "weight.csv");
}

function exportGymCSV() {
  const data = getData();
  let csv = "Date,Gym,Exercise,Weight,Reps,Sets\n";
  Object.keys(data).sort().forEach(d => {
     if(d==='streak') return;
     const day = data[d];
     const attended = day.attendedGym ? "Yes" : "No";
     // If no exercises, just log attendance
     csv += `${d},${attended},,,,\n`;
     // Log exercises
     Object.keys(day).forEach(key => {
        if(Array.isArray(day[key])) {
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
  a.href = URL.createObjectURL(new Blob([content], {type: "text/csv"}));
  a.download = name;
  a.click();
}