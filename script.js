// --------------------
// ROUTINE
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
// ELEMENTS
// --------------------
const dateInput = document.getElementById("workoutDate");
const bodyWeightInput = document.getElementById("bodyWeight");
const dayTitle = document.getElementById("dayTitle");
const container = document.getElementById("exerciseContainer");
const home = document.getElementById("home");
const workout = document.getElementById("workout");
const streakCountEl = document.getElementById("streakCount");
const gymCheckbox = document.getElementById("gymCheck");

// --------------------
// STORAGE
// --------------------
const getData = () => {
  const data = JSON.parse(localStorage.getItem("gymData")) || {};
  if (typeof data.streak === 'undefined') data.streak = 0; 
  return data;
};
const saveData = d => localStorage.setItem("gymData", JSON.stringify(d));

// --------------------
// STREAK LOGIC (MANUAL)
// --------------------
function changeStreak(amt) {
  const data = getData();
  data.streak = Math.max(0, (data.streak || 0) + amt);
  saveData(data);
  renderStreak();
}

function resetStreak() {
  if (confirm("Reset streak to 0?")) {
    const data = getData();
    data.streak = 0;
    saveData(data);
    renderStreak();
  }
}

function renderStreak() {
  const data = getData();
  streakCountEl.textContent = data.streak || 0;
}

// --------------------
// LOAD WORKOUT
// --------------------
function loadWorkout() {
  const dateValue = dateInput.value; 
  if (!dateValue) return;

  // 1. Safe Date Parsing (Prevents Timezone "Rest Day" bugs)
  const [year, month, day] = dateValue.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  const data = getData();
  data[dateValue] ||= {}; 
  saveData(data); // SAVE after initializing the date

  home.classList.add("hidden");
  workout.classList.remove("hidden");
  container.innerHTML = "";

  bodyWeightInput.value = data[dateValue].bodyWeight || "";
  gymCheckbox.checked = !!data[dateValue].attendedGym;

  const dayName = localDate.toLocaleDateString("en-US", { weekday: "long" });
  const todayRoutine = routine[dayName];

  if (!todayRoutine || todayRoutine.exercises.length === 0) {
    dayTitle.textContent = `${dayName} – Rest Day 💤`;
  } else {
    dayTitle.textContent = `${dayName} – ${todayRoutine.name}`;
    todayRoutine.exercises.forEach(ex => createExerciseBlock(dateValue, ex));
  }
}

// --------------------
// EXERCISE BLOCK (FIXED)
// --------------------
function createExerciseBlock(date, exercise) {
  // Ensure the current date's array exists immediately
  const data = getData();
  data[date][exercise] ||= [];
  saveData(data);

  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <h3>${exercise}</h3>
    <table>
      <thead>
        <tr><th>#</th><th>Date</th><th>Weight</th><th>Reps</th><th>Sets</th><th></th></tr>
      </thead>
      <tbody></tbody>
    </table>
    <button class="add-btn">Add Set +</button>
  `;

  const tbody = div.querySelector("tbody");
  const addBtn = div.querySelector(".add-btn");

  function render() {
    tbody.innerHTML = "";
    const allData = getData();
    const days = Object.keys(allData).sort();

    let index = 1;
    days.forEach(d => {
      // SKIP non-date keys like 'streak' or 'settings'
      if (d === 'streak' || d === 'settings') return;

      // YOUR FIX: Check if it is actually an array
      if (!allData[d] || !Array.isArray(allData[d][exercise])) return;

      allData[d][exercise].forEach((e, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index++}</td>
          <td>${d}</td>
          <td>${e.weight}</td>
          <td>${e.reps}</td>
          <td>${e.sets}</td>
          <td>${d === date ? `<button class="danger" style="padding:4px 8px; margin:0;">✕</button>` : ""}</td>
        `;

        if (d === date) {
          tr.querySelector("button").onclick = () => {
            allData[d][exercise].splice(i, 1);
            saveData(allData);
            render();
          };
        }
        tbody.appendChild(tr);
      });
    });
  }

  addBtn.onclick = () => {
    const weight = prompt("Weight (kg):");
    if (!weight || isNaN(weight) || parseFloat(weight) <= 0) {
      alert("Please enter a valid weight.");
      return;
    }
    
    const reps = prompt("Reps:");
    if (!reps || isNaN(reps) || parseInt(reps) <= 0) {
      alert("Please enter valid reps.");
      return;
    }
    
    const sets = prompt("Sets:");
    if (!sets || isNaN(sets) || parseInt(sets) <= 0) {
      alert("Please enter valid sets.");
      return;
    }

    const currentData = getData();
    currentData[date][exercise].push({ weight, reps, sets });
    saveData(currentData);
    render();
  };

  render();
  container.appendChild(div);
}

// --------------------
// SAVE / NAVIGATION
// --------------------
function saveWorkout() {
  const date = dateInput.value;
  if (!date) {
    alert("Please select a date first.");
    return;
  }

  const data = getData();
  data[date] ||= {};
  data[date].bodyWeight = bodyWeightInput.value;
  data[date].attendedGym = gymCheckbox.checked;
  saveData(data);

  // Visual Feedback
  const btn = document.querySelector('button[onclick="saveWorkout()"]');
  const originalText = btn.textContent;
  btn.textContent = "Saved! ✓";
  setTimeout(() => btn.textContent = originalText, 1500);
}

function goHome() {
  workout.classList.add("hidden");
  home.classList.remove("hidden");
  renderStreak(); 
}

// --------------------
// EXPORT
// --------------------
function exportWeightCSV() {
  const data = getData();
  let csv = "Date,BodyWeight\n";
  Object.keys(data).sort().forEach(d => {
    if (d !== 'streak' && d !== 'settings' && data[d].bodyWeight) {
      csv += `${d},${data[d].bodyWeight}\n`;
    }
  });
  download(csv, "weight.csv");
}

function exportGymCSV() {
  const data = getData();
  let csv = "Date,WentToGym,Exercise,Weight,Reps,Sets\n";
  
  Object.keys(data).sort().forEach(d => {
    if (d === 'streak' || d === 'settings') return;
    
    const attended = data[d].attendedGym ? "YES" : "NO";
    let hasExercises = false;

    Object.keys(data[d]).forEach(k => {
      // Check if value is an array (an exercise)
      if (Array.isArray(data[d][k])) {
        hasExercises = true;
        data[d][k].forEach(s => {
          csv += `${d},${attended},${k},${s.weight},${s.reps},${s.sets}\n`;
        });
      }
    });
    
    if (!hasExercises && data[d].attendedGym) {
      csv += `${d},YES,None,0,0,0\n`;
    }
  });
  download(csv, "gym_data.csv");
}

function download(text, name) {
  const blob = new Blob([text], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

// --------------------
// INITIALIZATION
// --------------------
window.onload = () => {
  renderStreak();
  // Set date picker to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
};