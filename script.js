// ================== ELEMENTS ==================
const dateInput = document.getElementById("dateInput");
const diaryText = document.getElementById("diaryText");
const dateDisplay = document.getElementById("dateDisplay");
// lock button remains for later if desired
const lockBtn = document.getElementById("lockBtn");
// concepts view elements
const conceptBtn = document.getElementById("conceptBtn");
const conceptView = document.getElementById("conceptView");
const backToDiary = document.getElementById("backToDiary");
const conceptName = document.getElementById("conceptName");
const conceptText = document.getElementById("conceptText");
const saveConcept = document.getElementById("saveConcept");
const conceptListEl = document.getElementById("conceptList");
const showConceptsBtn = document.getElementById("showConcepts");
const hideConceptsBtn = document.getElementById("hideConcepts");
// container reference used for toggling
const container = document.querySelector('.container');
const writingArea = document.getElementById('writingArea');


// ================== DIARY ==================

// Use a single key in localStorage to hold all entries as an object
function getDiaryEntries() {
    return JSON.parse(localStorage.getItem('diaryEntries')) || {};
}

function saveDiaryEntries(entries) {
    localStorage.setItem('diaryEntries', JSON.stringify(entries));
}

// cache in-memory for efficiency
let diaryEntries = getDiaryEntries();

function loadEntryForDate(date) {
    diaryText.value = diaryEntries[date] || "";
}

function persistCurrentEntry() {
    const date = dateInput.value;
    if (!date) return;
    const value = diaryText.value;
    if (value) {
        diaryEntries[date] = value;
    } else {
        delete diaryEntries[date];
    }
    saveDiaryEntries(diaryEntries);
}

// manual save removed; auto‑save handles everything silently


// respond whenever the date input changes – use our helper to update display
// and load the entry immediately
const dateHandler = () => {
    const date = dateInput.value;
    if (!date) return;
    updateDate(date);
};

// ---------- concepts data and rendering ----------
function getConcepts() {
    return JSON.parse(localStorage.getItem('concepts')) || [];
}
function saveConcepts(c) {
    localStorage.setItem('concepts', JSON.stringify(c));
}

let concepts = getConcepts();

function renderConcepts() {
    if (!conceptListEl) return;
    conceptListEl.innerHTML = '';
    concepts.forEach((c, idx) => {
        const row = document.createElement('div');
        row.className = 'concept-row';
        row.innerHTML = `
            <h3>${c.name}</h3>
            <p>${c.text}</p>
            <button class="concept-delete" data-index="${idx}" title="Delete">×</button>
        `;
        // delete handler
        row.querySelector('.concept-delete').addEventListener('click', () => {
            concepts.splice(idx,1);
            saveConcepts(concepts);
            renderConcepts();
        });
        conceptListEl.appendChild(row);
    });
}




// attach input auto-resize and auto-save for concept fields

if (conceptName) {
    conceptName.addEventListener('input', function () {
        scheduleConceptSave();
    });
}

let conceptSaveTimer;
function scheduleConceptSave() {
    clearTimeout(conceptSaveTimer);
    conceptSaveTimer = setTimeout(attemptSaveConcept, 500);
}

function attemptSaveConcept() {
    const name = conceptName.value.trim();
    const text = conceptText.value.trim();
    if (!name && !text) return;
    const idx = concepts.findIndex(c => c.name === name);
    if (idx >= 0) {
        // update existing concept text
        concepts[idx].text = text;
    } else if (name && text) {
        // new entry – add and clear inputs
        concepts.push({name, text});
        conceptName.value = '';
        conceptText.value = '';
    }
    saveConcepts(concepts);
    // only refresh the visible list if the user has explicitly shown it
    if (conceptListEl && conceptListEl.style.display !== 'none') {
        renderConcepts();
    }
}

dateInput.addEventListener("input", dateHandler);
dateInput.addEventListener("change", dateHandler);

// tapping the on‑screen display should show the native picker too
if (dateDisplay) {
    dateDisplay.addEventListener('click', () => {
        if (dateInput) {
            if (typeof dateInput.showPicker === 'function') {
                dateInput.showPicker();
            }
            dateInput.focus();
        }
    });
}

// when the user taps/clicks the field, open the native picker immediately
if (dateInput) {
    dateInput.addEventListener('click', () => {
        if (typeof dateInput.showPicker === 'function') {
            dateInput.showPicker();
        }
        dateInput.focus();
    });
}

// helper to format yyyy-mm-dd to a nice human string
function formatDateForDisplay(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const opts = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
}

// adjust current date by offset days and reload
function changeDate(offset) {
    const cur = new Date(dateInput.value);
    if (isNaN(cur)) return;
    cur.setDate(cur.getDate() + offset);
    const iso = cur.toISOString().split('T')[0];
    dateInput.value = iso;
    updateDate(iso);
}

// update both the display text and load entry
function updateDate(iso) {
    if (!iso) return;
    if (dateDisplay) dateDisplay.textContent = formatDateForDisplay(iso);
    loadEntryForDate(iso);
}

// load today's entry on start
document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    updateDate(today);
    // focus the writing area so the user can start typing immediately
    // do not autofocus the textarea to avoid auto keyboard popup on mobile

    // ensure concepts view is hidden initially; list remains hidden until user requests
    if (conceptView) conceptView.classList.remove('active');
    if (conceptListEl) conceptListEl.style.display = 'none';
    if (showConceptsBtn) showConceptsBtn.style.display = 'inline-block';
    if (hideConceptsBtn) hideConceptsBtn.style.display = 'none';

    // add swipe handlers to container for date navigation
    if (container) {
        let startX;
        container.addEventListener('touchstart', e => {
            if (e.touches.length === 1) startX = e.touches[0].clientX;
        });
        container.addEventListener('touchend', e => {
            if (startX === undefined) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (dx > 50) changeDate(-1);
            else if (dx < -50) changeDate(1);
            startX = undefined;
        });
    }
    // do not programmatically focus here — allow native taps on the textarea
    // to trigger the keyboard (matching the behavior in the Concepts view).

    // show/hide fake cursor based on focus and content
    if (diaryText) {
        diaryText.addEventListener('focus', () => {
            if (writingArea) writingArea.classList.add('writing-focused');
        });
        diaryText.addEventListener('blur', () => {
            if (writingArea) writingArea.classList.remove('writing-focused');
        });
        diaryText.addEventListener('input', () => {
            if (diaryText.value && diaryText.value.length > 0) {
                if (writingArea) writingArea.classList.add('writing-has-text');
            } else {
                if (writingArea) writingArea.classList.remove('writing-has-text');
            }
        });
    }
});



let inputSaveTimer;

diaryText.addEventListener("input", () => {
    clearTimeout(inputSaveTimer);
    inputSaveTimer = setTimeout(() => {
        const date = dateInput.value;
        if (!date) return;

        diaryEntries[date] = diaryText.value;
        saveDiaryEntries(diaryEntries);
    }, 400);
});







// ---------- view toggling ----------
if (conceptBtn && conceptView && container) {
    conceptBtn.addEventListener('click', () => {
        container.style.display = 'none';
        conceptView.classList.add('active');
        // concepts are not shown automatically; user must press Show
    });
}

if (backToDiary && conceptView && container) {
    backToDiary.addEventListener('click', () => {
        conceptView.classList.remove('active');
        container.style.display = 'block';
    });
}

// show / hide controls for concept list (explicit control only)
if (showConceptsBtn && hideConceptsBtn && conceptListEl) {
    showConceptsBtn.addEventListener('click', () => {
        renderConcepts();
        conceptListEl.style.display = 'grid';
        showConceptsBtn.style.display = 'none';
        hideConceptsBtn.style.display = 'inline-block';
    });

    hideConceptsBtn.addEventListener('click', () => {
        conceptListEl.style.display = 'none';
        hideConceptsBtn.style.display = 'none';
        showConceptsBtn.style.display = 'inline-block';
    });
}

if (saveConcept) {
    saveConcept.addEventListener('click', () => {
        const name = conceptName.value.trim();
        const text = conceptText.value.trim();
        if (!name || !text) return;
        concepts.push({ name, text });
        saveConcepts(concepts);
        conceptName.value = '';
        conceptText.value = '';
        // do not auto-show concepts — only refresh if list is currently visible
        if (conceptListEl && conceptListEl.style.display !== 'none') renderConcepts();
    });
}


// concepts feature removed from main screen; code preserved elsewhere if needed

// ================== DEV TOOL ==================

function clearAllData() {
    if (confirm("Delete everything?")) {
        localStorage.removeItem('diaryEntries');
        // other keys (like manifest info) remain untouched
        location.reload();
    }
}

// ================== SPLASH / SWIPE HANDLER ==================
// Splash shows calculator. Unlock sequence: left → right → left.
// Supports touch and mouse; resets after 3 seconds of inactivity or wrong swipe.

(function () {
    const splash = document.getElementById('splash');
    const container = document.querySelector('.container');
    if (!splash) return;

    // start hidden until we explicitly show on reset
    if (container) container.style.display = 'none';

    let startX = 0;
    let swipeState = 0; // 0=left,1=right,2=left
    const threshold = 50;
    let timer;

    function resetSplash() {
        splash.style.display = 'block';
        if (container) container.style.display = 'none';
        if (conceptView) {
            conceptView.classList.remove('active');
        }
        swipeState = 0;
        clearCalculator();
        resetTimer();
    }

    function resetTimer() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            swipeState = 0;
        }, 3000);
    }

    function handleEnd(dx) {
        if (dx < -threshold) {
            // left swipe
            if (swipeState === 0 || swipeState === 2) {
                swipeState++;
            } else {
                swipeState = 0;
            }
        } else if (dx > threshold) {
            // right swipe
            if (swipeState === 1) {
                swipeState++;
            } else {
                swipeState = 0;
            }
        }

        if (swipeState === 3) {
            // unlocked
            splash.style.display = 'none';
            if (container) container.style.display = 'block';
        }
        resetTimer();
    }

    function startHandler(x) {
        startX = x;
    }

    function endHandler(x) {
        const dx = x - startX;
        handleEnd(dx);
    }

    // touch events
    splash.addEventListener('touchstart', e => {
        if (e.touches.length === 1) startHandler(e.touches[0].clientX);
    });
    splash.addEventListener('touchend', e => {
        endHandler(e.changedTouches[0].clientX);
    });

    // mouse events (desktop/test)
    let mouseDown = false;
    splash.addEventListener('mousedown', e => {
        mouseDown = true;
        startHandler(e.clientX);
    });
    splash.addEventListener('mouseup', e => {
        if (mouseDown) {
            mouseDown = false;
            endHandler(e.clientX);
        }
    });

    // lock button
    const lockBtn = document.getElementById('lockBtn');
    if (lockBtn) lockBtn.addEventListener('click', resetSplash);

    // lock on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetSplash();
        }
    });

    // calculator logic remains unchanged
    const display = document.getElementById('calcDisplay');
    const buttons = splash.querySelectorAll('.calc-buttons button');

    function clearCalculator() {
        if (display) display.value = '0';
    }
    function appendCalc(value) {
        if (!display) return;
        if (display.value === '0' && value !== '.') {
            display.value = value;
        } else {
            display.value += value;
        }
    }
    function evaluateCalc() {
        if (!display) return;
        try {
            const sanitized = display.value.replace(/[^0-9.+\-*/]/g, '');
            const result = Function('return ' + sanitized)();
            display.value = result;
        } catch {
            display.value = 'Error';
        }
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-value');
            if (btn.id === 'calcClear') {
                clearCalculator();
            } else if (btn.id === 'calcEquals') {
                evaluateCalc();
            } else if (val) {
                appendCalc(val);
            }
        });
    });

    // ensure splash starts visible
    resetSplash();
})();

