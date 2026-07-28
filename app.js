// منطق رابط کاربری برنامه جدولانه — شامل تایمر، راهنمایی هوشمند، حالت شب، جدول روزانه، خروجی عکس و کتابچه
const CUSTOM_WORDS_KEY = "jadval_custom_words";
const OPTIONS_KEY = "jadval_puzzle_options";
const THEME_KEY = "jadval_theme";
const CONTRAST_KEY = "jadval_contrast";
const BEST_TIMES_KEY = "jadval_best_times";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[d]);
}

function toEnDigits(value) {
  return String(value).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = m < 10 ? "0" + m : "" + m;
  const ss = s < 10 ? "0" + s : "" + s;
  return toFaDigits(`${mm}:${ss}`);
}

// ---------- تنظیمات و تم ----------

function initThemeAndContrast() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  const savedContrast = localStorage.getItem(CONTRAST_KEY) || "normal";

  document.documentElement.dataset.theme = savedTheme;
  document.documentElement.dataset.contrast = savedContrast;

  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";

  const contrastBtn = document.getElementById("contrastToggleBtn");
  if (contrastBtn) contrastBtn.textContent = savedContrast === "high" ? "🔍" : "👓";
}

document.getElementById("themeToggleBtn").addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme || "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  document.getElementById("themeToggleBtn").textContent = next === "dark" ? "☀️" : "🌙";
});

document.getElementById("contrastToggleBtn").addEventListener("click", () => {
  const cur = document.documentElement.dataset.contrast || "normal";
  const next = cur === "high" ? "normal" : "high";
  document.documentElement.dataset.contrast = next;
  localStorage.setItem(CONTRAST_KEY, next);
  document.getElementById("contrastToggleBtn").textContent = next === "high" ? "🔍" : "👓";
});

function loadPuzzleOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function savePuzzleOptions() {
  try {
    const shapeSel = document.getElementById("gridShapeSelect");
    const categorySel = document.getElementById("categorySelect");
    const countInput = document.getElementById("wordCountInput");
    const blackCheck = document.getElementById("showBlackCellsCheck");
    const printCheck = document.getElementById("printAnswersCheck");

    const opts = {
      gridShape: shapeSel ? shapeSel.value : "sq-9",
      category: categorySel ? categorySel.value : "all",
      wordCount: countInput ? countInput.value : "۱۲",
      showBlackCells: blackCheck ? blackCheck.checked : true,
      printAnswers: printCheck ? printCheck.checked : true,
    };
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts));
  } catch (e) {}
}

function applySavedPuzzleOptions() {
  const saved = loadPuzzleOptions();
  if (!saved) return;

  const shapeSel = document.getElementById("gridShapeSelect");
  if (shapeSel && saved.gridShape !== undefined) shapeSel.value = saved.gridShape;

  const categorySel = document.getElementById("categorySelect");
  if (categorySel && saved.category !== undefined) categorySel.value = saved.category;

  const countInput = document.getElementById("wordCountInput");
  if (countInput && saved.wordCount !== undefined) countInput.value = saved.wordCount;

  const blackCheck = document.getElementById("showBlackCellsCheck");
  if (blackCheck && saved.showBlackCells !== undefined) blackCheck.checked = saved.showBlackCells;

  const printCheck = document.getElementById("printAnswersCheck");
  if (printCheck && saved.printAnswers !== undefined) printCheck.checked = saved.printAnswers;
}

// ---------- تایمر و رکوردها ----------

let elapsedSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  isTimerRunning = true;
  updateTimerUI();
  timerInterval = setInterval(() => {
    if (isTimerRunning) {
      elapsedSeconds++;
      updateTimerUI();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
}

function updateTimerUI() {
  const el = document.getElementById("timerText");
  if (el) el.textContent = `⏱️ ${formatTime(elapsedSeconds)}`;
}

document.getElementById("timerPauseBtn").addEventListener("click", () => {
  isTimerRunning = !isTimerRunning;
  document.getElementById("timerPauseBtn").textContent = isTimerRunning ? "⏸️" : "▶️";
});

function getBestTimes() {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveBestTime(shapeKey, timeInSeconds) {
  const bests = getBestTimes();
  if (!bests[shapeKey] || timeInSeconds < bests[shapeKey]) {
    bests[shapeKey] = timeInSeconds;
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(bests));
    return true; // New record
  }
  return false;
}

function updateBestTimeUI() {
  const shapeSel = document.getElementById("gridShapeSelect");
  const shapeKey = shapeSel ? shapeSel.value : "sq-9";
  const bests = getBestTimes();
  const textEl = document.getElementById("bestTimeText");
  if (textEl) {
    if (bests[shapeKey]) {
      textEl.textContent = formatTime(bests[shapeKey]);
    } else {
      textEl.textContent = "--:--";
    }
  }
}


// ---------- بانک کلمات ----------

let currentPuzzle = null;
let activeDir = "across";
let activeCellKey = null;
const cellInputs = new Map();
const cellWordMembership = new Map();

function loadCustomWords() {
  try {
    const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomWords(list) {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(list));
}

function getAllWords() {
  const custom = loadCustomWords();
  const seen = new Set();
  const all = [];
  [...custom, ...BUILTIN_WORDS].forEach((w) => {
    if (!seen.has(w.word)) {
      seen.add(w.word);
      all.push(w);
    }
  });
  return all;
}

function getCategoryWords(catKey) {
  const all = getAllWords();
  if (!catKey || catKey === "all") return all;

  const keywords = {
    science: ["علوم", "فناوری", "دستگاه", "دانش", "پزشکی", "دارو", "شیمی", "فیزیک", "رایانه", "میکروسکوپ", "تلسکوپ", "سیستم", "بیوتکنولوژی", "رباتیک", "هوش"],
    geography: ["کوه‌", "رود", "دریا", "اقیانوس", "شهر", "کشور", "جزیره", "تالاب", "کویر", "استان", "طبیعت", "بیابان", "آبشار", "قاره", "ساحل"],
    history: ["شاه", "سلسله", "تاریخ", "کهن", "بنا", "میراث", "باستان", "قرن", "قاجار", "صفوی", "امپراتوری", "هخامنشی", "ساسانی", "اشکانی"],
    culture: ["شاعر", "شعر", "نقاش", "هنر", "موسیقی", "کتاب", "ساز", "دیوان", "فیلم", "تئاتر", "نویسنده", "حافظ", "سعدی", "فردوسی", "مولوی"],
    food: ["غذا", "خورش", "پلو", "شیرینی", "کباب", "آش", "دسر", "میوه", "خوراکی", "میوه", "ادویه", "زعفران", "سوهان", "باقلوا"],
  }[catKey] || [];

  const filtered = all.filter((w) => keywords.some((kw) => w.clue.includes(kw) || w.word.includes(kw)));
  return filtered.length >= 20 ? filtered : all;
}

function addCustomWord(word, clue) {
  const custom = loadCustomWords();
  custom.unshift({ word: word.trim(), clue: clue.trim(), custom: true });
  saveCustomWords(custom);
}

function removeCustomWord(word) {
  const custom = loadCustomWords().filter((w) => w.word !== word);
  saveCustomWords(custom);
}

// Backup JSON Import/Export
document.getElementById("exportWordsBtn").addEventListener("click", () => {
  const custom = loadCustomWords();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(custom, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "jadvalaneh-words-backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

document.getElementById("importWordsInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        const custom = loadCustomWords();
        const seen = new Set(custom.map((w) => w.word));
        let addedCount = 0;
        imported.forEach((w) => {
          if (w.word && w.clue && !seen.has(w.word)) {
            seen.add(w.word);
            custom.push({ word: w.word.trim(), clue: w.clue.trim(), custom: true });
            addedCount++;
          }
        });
        saveCustomWords(custom);
        renderWordBank();
        alert(`تعداد ${toFaDigits(addedCount)} کلمه جدید با موفقیت بارگذاری شد.`);
      }
    } catch (err) {
      alert("خطا در خواندن فایل پشتیبان JSON");
    }
  };
  reader.readAsText(file);
});

// ---------- تب‌ها ----------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = true));
    document.getElementById(btn.dataset.tab).hidden = false;
    if (btn.dataset.tab === "bankTab") renderWordBank();
  });
});

function renderWordBank() {
  const search = document.getElementById("searchInput").value.trim();
  const all = getAllWords();
  const customWords = new Set(loadCustomWords().map((w) => w.word));
  const filtered = search
    ? all.filter((w) => w.word.includes(search) || w.clue.includes(search))
    : all;

  document.getElementById("wordCount").textContent = `${toFaDigits(all.length)} کلمه`;

  const tbody = document.getElementById("wordTableBody");
  tbody.innerHTML = "";
  filtered.forEach((w) => {
    const tr = document.createElement("tr");
    const isCustom = customWords.has(w.word);
    tr.innerHTML = `
      <td>${escapeHtml(w.word)}${isCustom ? '<span class="custom-tag">افزوده‌شده</span>' : ""}</td>
      <td>${escapeHtml(w.clue)}</td>
      <td>${isCustom ? `<button class="del-btn" data-word="${escapeHtml(w.word)}">حذف</button>` : ""}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeCustomWord(btn.dataset.word);
      renderWordBank();
    });
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- رندر گرید پازل ----------

function buildCellWordMembership(puzzle) {
  cellWordMembership.clear();
  puzzle.words.forEach((p) => {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.dir === "down" ? p.row + i : p.row;
      const c = p.dir === "across" ? p.col + i : p.col;
      const k = r + "," + c;
      if (!cellWordMembership.has(k)) cellWordMembership.set(k, { across: null, down: null });
      cellWordMembership.get(k)[p.dir] = p;
    }
  });
}

function renderGrid(puzzle) {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";
  cellInputs.clear();

  if (puzzle.rows === 0) {
    gridEl.textContent = "امکان ساخت جدول با تنظیمات فعلی نبود. دوباره تلاش کنید.";
    return;
  }

  gridEl.dataset.isSquare = puzzle.isSquare ? "true" : "false";
  const showBlack = document.getElementById("showBlackCellsCheck") ? document.getElementById("showBlackCellsCheck").checked : true;
  gridEl.dataset.showBlackCells = showBlack ? "true" : "false";

  gridEl.style.gridTemplateColumns = `repeat(${puzzle.cols}, 36px)`;
  gridEl.style.gridTemplateRows = `repeat(${puzzle.rows}, 36px)`;

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cellDiv = document.createElement("div");
      const letter = puzzle.grid[r][c];
      const k = r + "," + c;
      if (letter == null) {
        cellDiv.className = "cell blocked";
      } else {
        cellDiv.className = "cell filled";
        const numberKey = puzzle.words.find((p) => p.row === r && p.col === c && p.number);
        if (numberKey) {
          const num = document.createElement("span");
          num.className = "cell-number";
          num.textContent = toFaDigits(numberKey.number);
          cellDiv.appendChild(num);
        }
        const input = document.createElement("input");
        input.maxLength = 1;
        input.dataset.row = r;
        input.dataset.col = c;
        input.autocomplete = "off";
        input.addEventListener("focus", () => onCellFocus(r, c));
        input.addEventListener("click", () => onCellClick(r, c));
        input.addEventListener("keydown", (e) => onCellKeydown(e, r, c));
        input.addEventListener("input", (e) => onCellInput(e, r, c));
        cellDiv.appendChild(input);
        cellInputs.set(k, input);
      }
      gridEl.appendChild(cellDiv);
    }
  }
}

function getWordAt(r, c, dir) {
  const membership = cellWordMembership.get(r + "," + c);
  return membership ? membership[dir] : null;
}

function wordCells(p) {
  const cells = [];
  for (let i = 0; i < p.word.length; i++) {
    const r = p.dir === "down" ? p.row + i : p.row;
    const c = p.dir === "across" ? p.col + i : p.col;
    cells.push([r, c]);
  }
  return cells;
}

function clearHighlights() {
  document.querySelectorAll(".cell.highlight").forEach((el) => el.classList.remove("highlight"));
  document.querySelectorAll(".clue-col li.active").forEach((el) => el.classList.remove("active"));
}

function highlightWord(p) {
  clearHighlights();
  if (!p) return;
  wordCells(p).forEach(([r, c]) => {
    const input = cellInputs.get(r + "," + c);
    if (input) input.parentElement.classList.add("highlight");
  });
  const li = document.querySelector(`li[data-dir="${p.dir}"][data-num="${p.number}"]`);
  if (li) li.classList.add("active");
}

function onCellFocus(r, c) {
  const membership = cellWordMembership.get(r + "," + c) || {};
  if (!membership[activeDir]) {
    activeDir = membership.across ? "across" : "down";
  }
  activeCellKey = r + "," + c;
  highlightWord(membership[activeDir]);
}

function onCellClick(r, c) {
  const membership = cellWordMembership.get(r + "," + c) || {};
  if (activeCellKey === r + "," + c) {
    if (membership.across && membership.down) {
      activeDir = activeDir === "across" ? "down" : "across";
    }
  } else {
    activeDir = membership[activeDir] ? activeDir : membership.across ? "across" : "down";
  }
  activeCellKey = r + "," + c;
  highlightWord(membership[activeDir]);
}

function onCellInput(e, r, c) {
  const val = e.target.value;
  e.target.value = val.slice(-1);
  e.target.parentElement.classList.remove("correct", "incorrect");
  e.target.classList.remove("wrong-cell");
  if (val) moveToNextCell(r, c);
  checkFullSolutionAuto();
}

function onCellKeydown(e, r, c) {
  if (e.key === "Backspace" && !e.target.value) {
    moveToPrevCell(r, c);
  } else if (e.key === "ArrowRight") {
    focusCell(r, c - 1 >= 0 ? c - 1 : c);
  } else if (e.key === "ArrowLeft") {
    focusCell(r, c + 1);
  } else if (e.key === "ArrowDown") {
    focusCell(r + 1, c);
  } else if (e.key === "ArrowUp") {
    focusCell(r - 1, c);
  }
}

function focusCell(r, c) {
  const input = cellInputs.get(r + "," + c);
  if (input) input.focus();
}

function moveToNextCell(r, c) {
  const p = getWordAt(r, c, activeDir);
  if (!p) return;
  const nr = activeDir === "down" ? r + 1 : r;
  const nc = activeDir === "across" ? c + 1 : c;
  const cells = wordCells(p);
  if (cells.some(([cr, cc]) => cr === nr && cc === nc)) {
    focusCell(nr, nc);
  }
}

function moveToPrevCell(r, c) {
  const p = getWordAt(r, c, activeDir);
  if (!p) return;
  const pr = activeDir === "down" ? r - 1 : r;
  const pc = activeDir === "across" ? c - 1 : c;
  const cells = wordCells(p);
  if (cells.some(([cr, cc]) => cr === pr && cc === pc)) {
    const input = cellInputs.get(pr + "," + pc);
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

function renderClues(puzzle) {
  const acrossList = document.getElementById("acrossList");
  const downList = document.getElementById("downList");
  acrossList.innerHTML = "";
  downList.innerHTML = "";

  const across = puzzle.words.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number);

  across.forEach((p) => {
    const li = document.createElement("li");
    li.dataset.dir = "across";
    li.dataset.num = p.number;
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    li.addEventListener("click", () => {
      activeDir = "across";
      focusCell(p.row, p.col);
      highlightWord(p);
    });
    acrossList.appendChild(li);
  });

  down.forEach((p) => {
    const li = document.createElement("li");
    li.dataset.dir = "down";
    li.dataset.num = p.number;
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    li.addEventListener("click", () => {
      activeDir = "down";
      focusCell(p.row, p.col);
      highlightWord(p);
    });
    downList.appendChild(li);
  });
}

function setStatus(msg, kind) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = "status-msg" + (kind ? " " + kind : "");
}

function getGridOptions() {
  const sel = document.getElementById("gridShapeSelect");
  const selVal = sel ? sel.value : "sq-auto";
  if (selVal === "free") {
    return { gridShape: "free" };
  } else if (selVal.startsWith("sq-")) {
    const size = parseInt(selVal.split("-")[1], 10);
    return { gridShape: "square", squareSize: size };
  }
  return { gridShape: "square", squareSize: "auto" };
}

function generateNewPuzzle() {
  const raw = parseInt(toEnDigits(document.getElementById("wordCountInput").value), 10);
  const count = Math.min(30, Math.max(4, isNaN(raw) ? 12 : raw));
  const categorySel = document.getElementById("categorySelect");
  const categoryKey = categorySel ? categorySel.value : "all";

  const opts = { maxWords: count, attempts: 16, ...getGridOptions() };
  const words = getCategoryWords(categoryKey);

  const puzzle = generateCrossword(words, opts);
  currentPuzzle = puzzle;
  buildCellWordMembership(puzzle);
  renderGrid(puzzle);
  renderClues(puzzle);
  startTimer();
  updateBestTimeUI();

  const shapeDesc = puzzle.isSquare ? `کلاسیک متقاطع ${toFaDigits(puzzle.rows)}×${toFaDigits(puzzle.cols)}` : `آزاد ${toFaDigits(puzzle.rows)}×${toFaDigits(puzzle.cols)}`;
  setStatus(`جدول جدید (${shapeDesc}) با ${toFaDigits(puzzle.words.length)} کلمه متقاطع ساخته شد.`, "");
}

// ---------- جدول روزانه (Daily Puzzle) ----------

function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededPRNG(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDailyPuzzle() {
  const seed = getTodaySeed();
  const rng = seededPRNG(seed);

  // Deterministic shuffle of words
  const allWords = getAllWords().slice();
  for (let i = allWords.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
  }

  const gridOpts = getGridOptions();
  const opts = { maxWords: 12, attempts: 20, ...gridOpts };
  const puzzle = generateCrossword(allWords, opts);

  currentPuzzle = puzzle;
  buildCellWordMembership(puzzle);
  renderGrid(puzzle);
  renderClues(puzzle);
  startTimer();
  updateBestTimeUI();

  const d = new Date();
  const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  const dateStr = `${toFaDigits(d.getDate())} ${months[d.getMonth()]}`;

  setStatus(`📅 جدول اختصاصی امروز (${dateStr}) با ${toFaDigits(puzzle.words.length)} کلمه آماده شد.`, "");
}

document.getElementById("dailyPuzzleBtn").addEventListener("click", generateDailyPuzzle);
document.getElementById("newPuzzleBtn").addEventListener("click", generateNewPuzzle);

const shapeSel = document.getElementById("gridShapeSelect");
if (shapeSel) {
  shapeSel.addEventListener("change", () => {
    savePuzzleOptions();
    generateNewPuzzle();
  });
}

const categorySel = document.getElementById("categorySelect");
if (categorySel) {
  categorySel.addEventListener("change", () => {
    savePuzzleOptions();
    generateNewPuzzle();
  });
}

// ---------- سیستم راهنمایی (Smart Hints) ----------

document.getElementById("hintLetterBtn").addEventListener("click", () => {
  if (!currentPuzzle || !activeCellKey) return;
  const [r, c] = activeCellKey.split(",").map(Number);
  const correctLetter = currentPuzzle.grid[r][c];
  const input = cellInputs.get(activeCellKey);
  if (input && correctLetter) {
    input.value = correctLetter;
    input.parentElement.classList.remove("incorrect");
    input.parentElement.classList.add("correct");
    checkFullSolutionAuto();
  }
});

document.getElementById("hintWordBtn").addEventListener("click", () => {
  if (!currentPuzzle || !activeCellKey) return;
  const [r, c] = activeCellKey.split(",").map(Number);
  const p = getWordAt(r, c, activeDir);
  if (!p) return;
  wordCells(p).forEach(([cr, cc]) => {
    const correctLetter = currentPuzzle.grid[cr][cc];
    const input = cellInputs.get(cr + "," + cc);
    if (input && correctLetter) {
      input.value = correctLetter;
      input.parentElement.classList.remove("incorrect");
      input.parentElement.classList.add("correct");
    }
  });
  checkFullSolutionAuto();
});

document.getElementById("checkErrorsBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  let hasError = false;
  cellInputs.forEach((input, key) => {
    const [r, c] = key.split(",").map(Number);
    const correctLetter = currentPuzzle.grid[r][c];
    if (input.value && input.value !== correctLetter) {
      input.classList.add("wrong-cell");
      hasError = true;
      setTimeout(() => input.classList.remove("wrong-cell"), 3000);
    }
  });
  if (hasError) {
    setStatus("حروف اشتباه به مدت ۳ ثانیه با رنگ قرمز مشخص شدند.", "err");
  } else {
    setStatus("تاکنون هیچ حرف اشتباهی وارد نشده است! باریکلا!", "ok");
  }
});

// ---------- بررسی کامل و حل پازل ----------

function checkFullSolutionAuto() {
  if (!currentPuzzle) return;
  let allFilled = true;
  let allCorrect = true;

  for (let r = 0; r < currentPuzzle.rows; r++) {
    for (let c = 0; c < currentPuzzle.cols; c++) {
      const letter = currentPuzzle.grid[r][c];
      if (letter != null) {
        const input = cellInputs.get(r + "," + c);
        const val = input ? input.value : "";
        if (!val) allFilled = false;
        if (val !== letter) allCorrect = false;
      }
    }
  }

  if (allFilled && allCorrect) {
    stopTimer();
    const shapeSel = document.getElementById("gridShapeSelect");
    const shapeKey = shapeSel ? shapeSel.value : "sq-9";
    const isRecord = saveBestTime(shapeKey, elapsedSeconds);
    updateBestTimeUI();

    document.getElementById("completedTimeText").textContent = formatTime(elapsedSeconds);
    const recEl = document.getElementById("newRecordText");
    if (recEl) recEl.hidden = !isRecord;

    document.getElementById("completionModal").hidden = false;
    launchConfetti();
  }
}

document.getElementById("checkBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  let allFilled = true;
  let allCorrect = true;
  for (let r = 0; r < currentPuzzle.rows; r++) {
    for (let c = 0; c < currentPuzzle.cols; c++) {
      const letter = currentPuzzle.grid[r][c];
      if (letter != null) {
        const input = cellInputs.get(r + "," + c);
        const val = input ? input.value : "";
        if (!val) allFilled = false;
        if (val !== letter) {
          allCorrect = false;
          if (input) input.parentElement.classList.add("incorrect");
        } else {
          if (input) input.parentElement.classList.add("correct");
        }
      }
    }
  }
  if (!allFilled) {
    setStatus("جدول کامل نشده است. خانه‌های خالی را پر کنید.", "err");
  } else if (allCorrect) {
    checkFullSolutionAuto();
  } else {
    setStatus("برخی از خانه‌ها نادرست هستند. موارد قرمز را اصلاح کنید.", "err");
  }
});

document.getElementById("revealBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  stopTimer();
  for (let r = 0; r < currentPuzzle.rows; r++) {
    for (let c = 0; c < currentPuzzle.cols; c++) {
      const letter = currentPuzzle.grid[r][c];
      if (letter != null) {
        const input = cellInputs.get(r + "," + c);
        if (input) {
          input.value = letter;
          input.parentElement.classList.remove("incorrect");
          input.parentElement.classList.add("correct");
        }
      }
    }
  }
  setStatus("پاسخ کامل جدول نمایش داده شد.", "ok");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  cellInputs.forEach((input) => {
    input.value = "";
    input.parentElement.classList.remove("correct", "incorrect", "wrong-cell");
  });
  startTimer();
  setStatus("جدول پاک شد.", "");
});

document.getElementById("closeCompletionModalBtn").addEventListener("click", () => {
  document.getElementById("completionModal").hidden = true;
  generateNewPuzzle();
});

// ---------- خروجی عکس PNG ----------

document.getElementById("exportPngBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const rows = currentPuzzle.rows;
  const cols = currentPuzzle.cols;
  const cellSize = 42;
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  canvas.width = gridW + 40;
  canvas.height = gridH + 120;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "#1f2430";
  ctx.font = "bold 20px Vazirmatn, sans-serif";
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillText("جدولانه — جدول کلمات متقاطع", canvas.width / 2, 35);

  // Subtitle
  ctx.fillStyle = "#e11d48";
  ctx.font = "bold 13px Vazirmatn, sans-serif";
  ctx.fillText("❤️ تقدیم به پدر عزیزم", canvas.width / 2, 55);

  // Draw Grid
  const startX = 20;
  const startY = 75;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      const letter = currentPuzzle.grid[r][c];

      if (letter == null) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, cellSize, cellSize);
      } else {
        ctx.strokeStyle = "#2a2540";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Number
        const numObj = currentPuzzle.words.find((p) => p.row === r && p.col === c && p.number);
        if (numObj) {
          ctx.fillStyle = "#000000";
          ctx.font = "bold 11px Vazirmatn, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(toFaDigits(numObj.number), x + cellSize - 4, y + 14);
        }

        // Filled value or clear
        const input = cellInputs.get(r + "," + c);
        if (input && input.value) {
          ctx.fillStyle = "#1f2430";
          ctx.font = "bold 20px Vazirmatn, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(input.value, x + cellSize / 2, y + cellSize / 2 + 7);
        }
      }
    }
  }

  const link = document.createElement("a");
  link.download = "jadvalaneh-puzzle.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// ---------- خروجی چاپ و کتابچه ----------

function buildPrintPage(puzzle, isAnswerKey, puzzleIndex = null, totalPuzzles = null) {
  const showBlack = document.getElementById("showBlackCellsCheck") ? document.getElementById("showBlackCellsCheck").checked : true;
  const page = document.createElement("div");
  page.className = "print-page";

  const across = puzzle.words.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number);
  const maxColClues = Math.max(across.length, down.length);
  const gridDim = Math.max(puzzle.rows, puzzle.cols);

  // 1. Dynamic Grid Cell Sizing based on grid dimension & total clue count
  const maxWidthMm = 180;
  let targetMaxHeightMm = 95;
  let maxCellCap = 11;

  if (gridDim <= 7) {
    targetMaxHeightMm = 108;
    maxCellCap = 14;
  } else if (gridDim <= 9) {
    targetMaxHeightMm = 100;
    maxCellCap = 12;
  } else if (gridDim <= 11) {
    targetMaxHeightMm = maxColClues > 20 ? 82 : 92;
    maxCellCap = maxColClues > 20 ? 8.4 : 9.4;
  } else {
    targetMaxHeightMm = maxColClues > 20 ? 74 : 84;
    maxCellCap = maxColClues > 20 ? 7.4 : 8.0;
  }

  const byWidth = Math.floor((maxWidthMm / puzzle.cols) * 10) / 10;
  const byHeight = Math.floor((targetMaxHeightMm / puzzle.rows) * 10) / 10;
  const cellSize = Math.max(5.0, Math.min(maxCellCap, byWidth, byHeight));

  // 2. Cell Text & Corner Numbers Font Sizes (Extra Large & Bold)
  const cellFontSize = Math.max(11.0, Math.round(cellSize * 1.95 * 10) / 10);
  const cellNumSize = Math.max(5.5, Math.round(cellSize * 0.78 * 10) / 10);

  // 3. Extra Large Clue Font Sizes & Bold Reading Spacing
  let clueFontSize = 11;
  let clueLineHeight = 1.38;
  let clueMarginBottom = 1.8;
  let h3FontSize = 12.5;
  let titleFontSize = 17;

  if (maxColClues <= 6) {
    clueFontSize = 14.5;
    clueLineHeight = 1.60;
    clueMarginBottom = 4.5;
    h3FontSize = 16;
    titleFontSize = 19.5;
  } else if (maxColClues <= 9) {
    clueFontSize = 13.0;
    clueLineHeight = 1.50;
    clueMarginBottom = 3.5;
    h3FontSize = 14.5;
    titleFontSize = 18;
  } else if (maxColClues <= 13) {
    clueFontSize = 12.0;
    clueLineHeight = 1.44;
    clueMarginBottom = 2.4;
    h3FontSize = 13.5;
    titleFontSize = 16.5;
  } else if (maxColClues <= 20) {
    clueFontSize = 11.0;
    clueLineHeight = 1.35;
    clueMarginBottom = 1.6;
    h3FontSize = 12.5;
    titleFontSize = 15;
  } else {
    clueFontSize = 10.2;
    clueLineHeight = 1.28;
    clueMarginBottom = 1.2;
    h3FontSize = 11.5;
    titleFontSize = 14.5;
  }

  page.style.setProperty("--print-cell", cellSize + "mm");
  page.style.setProperty("--print-cell-font", cellFontSize + "pt");
  page.style.setProperty("--print-num-font", cellNumSize + "pt");
  page.style.setProperty("--print-clue-font", clueFontSize + "pt");
  page.style.setProperty("--print-clue-lh", clueLineHeight);
  page.style.setProperty("--print-clue-mb", clueMarginBottom + "mm");

  page.style.setProperty("--print-h3-font", h3FontSize + "pt");
  page.style.setProperty("--print-header-font", titleFontSize + "pt");


  const header = document.createElement("div");
  header.className = "print-header";
  let brandText = "جدولانه";
  if (isAnswerKey) {
    brandText += puzzleIndex != null ? ` (پاسخ‌نامه شماره ${toFaDigits(puzzleIndex)})` : " (پاسخ‌نامه)";
  } else if (puzzleIndex != null) {
    brandText += ` (جدول شماره ${toFaDigits(puzzleIndex)})`;
  }

  let metaText = `جدول کلمات متقاطع (${toFaDigits(puzzle.words.length)} کلمه)`;
  if (puzzleIndex != null && totalPuzzles != null) {
    metaText = `${toFaDigits(puzzleIndex)} از ${toFaDigits(totalPuzzles)} — ${toFaDigits(puzzle.words.length)} کلمه`;
  }

  header.innerHTML = `
    <span class="print-brand">${brandText}</span>
    <span class="print-sep">—</span>
    <span class="print-meta">${metaText}</span>
    <span class="print-sep">—</span>
    <span class="print-author">کاری از افشین رحیمی</span>
    <span class="print-sep">—</span>
    <span class="print-dedication">❤️ تقدیم به پدر عزیزم</span>
  `;
  page.appendChild(header);

  const gridDiv = document.createElement("div");
  gridDiv.className = "print-grid";
  gridDiv.dataset.showBlackCells = showBlack ? "true" : "false";
  gridDiv.style.gridTemplateColumns = `repeat(${puzzle.cols}, var(--print-cell, 10mm))`;
  gridDiv.style.gridTemplateRows = `repeat(${puzzle.rows}, var(--print-cell, 10mm))`;


  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cell = document.createElement("div");
      const letter = puzzle.grid[r][c];
      if (letter == null) {
        cell.className = "print-cell blocked";
      } else {
        cell.className = "print-cell";
        const numberKey = puzzle.words.find((p) => p.row === r && p.col === c && p.number);
        if (numberKey) {
          const num = document.createElement("span");
          num.className = "num";
          num.textContent = toFaDigits(numberKey.number);
          cell.appendChild(num);
        }
        if (isAnswerKey) {
          cell.appendChild(document.createTextNode(letter));
        }
      }
      gridDiv.appendChild(cell);
    }
  }
  page.appendChild(gridDiv);

  const cluesDiv = document.createElement("div");
  cluesDiv.className = "print-clues";
  const acrossCol = document.createElement("div");
  acrossCol.className = "print-clue-col";
  acrossCol.innerHTML = "<h3>افقی</h3>";
  const acrossUl = document.createElement("ul");
  across.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    acrossUl.appendChild(li);
  });
  acrossCol.appendChild(acrossUl);

  const downCol = document.createElement("div");
  downCol.className = "print-clue-col";
  downCol.innerHTML = "<h3>عمودی</h3>";
  const downUl = document.createElement("ul");
  down.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    downUl.appendChild(li);
  });
  downCol.appendChild(downUl);

  cluesDiv.appendChild(acrossCol);
  cluesDiv.appendChild(downCol);
  page.appendChild(cluesDiv);

  return page;
}

function buildPrintView(puzzle, includeAnswers) {
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = "";
  printArea.appendChild(buildPrintPage(puzzle, false));
  if (includeAnswers) {
    printArea.appendChild(buildPrintPage(puzzle, true));
  }
}

const INSPIRING_QUOTES = [
  { text: "ذهن مانند چتر نجات است؛ فقط زمانی کار می‌کند که باز باشد.", author: "آلبرت اینشتین" },
  { text: "توانا بود هر که دانا بود / ز دانش دل پیر برنا بود", author: "فردوسی" },
  { text: "اندیشه نمودن و حل معما، کلید گشایش پویایی ذهن و سلامت روان است.", author: "ابوعلی سینا" },
  { text: "یادگیری و به چالش کشیدن ذهن، بزرگ‌ترین پادزهر پیری اندیشه است.", author: "سقراط" },
  { text: "لذت کشف پاسخ در معماها، همان شادیِ دستیابی به دانایی است.", author: "دکتر محمود حسابی" },
  { text: "تفکر، ورزش روح است و جدول متقاطع، بهترین میدان این ورزش شاداب.", author: "فرانسیس بیکن" },
  { text: "هیچ‌چیز مانند ورزش فکری و حل جدول، طراوت اندیشه را زنده نگه نمی‌دارد.", author: "مریم میرزاخانی" }
];

function buildBatchPrintView(puzzles, placement, includeCover = true) {
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = "";
  const total = puzzles.length;

  if (includeCover) {
    const cover = document.createElement("div");
    cover.className = "booklet-cover-page";
    const d = new Date();
    const randomQuote = INSPIRING_QUOTES[Math.floor(Math.random() * INSPIRING_QUOTES.length)];
    cover.innerHTML = `
      <h1>کتابچه جدول‌های متقاطع روزنامه‌ای</h1>
      <h2>مجموعه ${toFaDigits(total)} جدول متقاطع روزنامه‌ای با پاسخ‌نامه</h2>
      <div class="cover-dedication">❤️ تقدیم با عشق به پدر عزیزم</div>
      <div class="cover-quote-card">
        <p class="cover-quote-text">${randomQuote.text}</p>
        <p class="cover-quote-author">— ${randomQuote.author}</p>
      </div>
      <div class="cover-footer">
        <div class="cover-meta">طراحی و تولیدشده توسط سامانه جدولانه — ${toFaDigits(d.getFullYear())}</div>
        <div class="cover-author">کاری از افشین رحیمی</div>
      </div>
    `;
    printArea.appendChild(cover);
  }

  if (placement === "interleaved") {
    puzzles.forEach((puzzle, idx) => {
      const num = idx + 1;
      printArea.appendChild(buildPrintPage(puzzle, false, num, total));
      printArea.appendChild(buildPrintPage(puzzle, true, num, total));
    });
  } else if (placement === "end") {
    puzzles.forEach((puzzle, idx) => {
      printArea.appendChild(buildPrintPage(puzzle, false, idx + 1, total));
    });
    puzzles.forEach((puzzle, idx) => {
      printArea.appendChild(buildPrintPage(puzzle, true, idx + 1, total));
    });
  } else {
    puzzles.forEach((puzzle, idx) => {
      printArea.appendChild(buildPrintPage(puzzle, false, idx + 1, total));
    });
  }
}

document.getElementById("printBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  const includeAnswers = document.getElementById("printAnswersCheck") ? document.getElementById("printAnswersCheck").checked : false;
  buildPrintView(currentPuzzle, includeAnswers);
  setTimeout(() => window.print(), 50);
});

// ---------- مدال چاپ گروهی ----------

const batchModal = document.getElementById("batchModal");
const batchPrintBtn = document.getElementById("batchPrintBtn");
const closeBatchModalBtn = document.getElementById("closeBatchModalBtn");
const cancelBatchBtn = document.getElementById("cancelBatchBtn");
const startBatchPrintBtn = document.getElementById("startBatchPrintBtn");
const batchProgress = document.getElementById("batchProgress");
const batchProgressText = document.getElementById("batchProgressText");

function openBatchModal() {
  if (batchModal) {
    batchModal.hidden = false;
    if (batchProgress) batchProgress.hidden = true;
    if (startBatchPrintBtn) startBatchPrintBtn.disabled = false;
  }
}

function closeBatchModal() {
  if (batchModal) batchModal.hidden = true;
}

if (batchPrintBtn) batchPrintBtn.addEventListener("click", openBatchModal);
if (closeBatchModalBtn) closeBatchModalBtn.addEventListener("click", closeBatchModal);
if (cancelBatchBtn) cancelBatchBtn.addEventListener("click", closeBatchModal);

if (batchModal) {
  batchModal.addEventListener("click", (e) => {
    if (e.target === batchModal) closeBatchModal();
  });
}

if (startBatchPrintBtn) {
  startBatchPrintBtn.addEventListener("click", async () => {
    const countInput = document.getElementById("batchCountInput");
    let count = parseInt(countInput ? countInput.value : "5", 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 50) count = 50;

    const placementRadio = document.querySelector('input[name="answerPlacement"]:checked');
    const placement = placementRadio ? placementRadio.value : "interleaved";
    const includeCover = document.getElementById("includeCoverCheck") ? document.getElementById("includeCoverCheck").checked : true;

    batchProgress.hidden = false;
    startBatchPrintBtn.disabled = true;

    const puzzles = [];
    const rawWordCount = parseInt(toEnDigits(document.getElementById("wordCountInput").value), 10);
    const wordCount = Math.min(30, Math.max(4, isNaN(rawWordCount) ? 12 : rawWordCount));
    const gridOpts = getGridOptions();
    const allWords = getAllWords();

    for (let i = 1; i <= count; i++) {
      batchProgressText.textContent = `در حال ساخت جدول ${toFaDigits(i)} از ${toFaDigits(count)}...`;
      await new Promise((resolve) => setTimeout(resolve, 30));

      let puzzle = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const opts = { maxWords: wordCount, attempts: 16, ...gridOpts };
        const candidate = generateCrossword(allWords, opts);
        if (candidate && candidate.rows > 0 && candidate.words && candidate.words.length >= 3) {
          puzzle = candidate;
          break;
        }
      }
      if (!puzzle) {
        const opts = { maxWords: wordCount, attempts: 24, ...gridOpts };
        puzzle = generateCrossword(allWords, opts);
      }
      puzzles.push(puzzle);
    }

    buildBatchPrintView(puzzles, placement, includeCover);
    closeBatchModal();

    setTimeout(() => window.print(), 100);
  });
}

// ---------- انیمیشن نورافشانی و جشن کامل کردن جدول (Confetti) ----------

function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#6d5bf6", "#22c1a2", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6"];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 5 + 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
    });
  }

  let startTime = performance.now();

  function animate(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += 4;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (now - startTime < 4000) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(animate);
}

function initToolbarToggles() {
  const toggleConfigBtn = document.getElementById("toggleConfigBtn");
  const configPanel = document.getElementById("configPanel");

  if (toggleConfigBtn && configPanel) {
    toggleConfigBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = configPanel.hidden;
      configPanel.hidden = !isHidden;
      toggleConfigBtn.classList.toggle("active", isHidden);
    });
  }

  document.querySelectorAll(".dropdown-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const parent = btn.closest(".dropdown");
      const isExpanded = parent.classList.contains("open");

      document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));

      if (!isExpanded) {
        parent.classList.add("open");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
    }
  });

  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".dropdown").forEach((d) => d.classList.remove("open"));
    });
  });
}

// ---------- شروع اولیه ----------
initThemeAndContrast();
applySavedPuzzleOptions();
initToolbarToggles();
generateNewPuzzle();
renderWordBank();

// ثبت و بروزرسانی هوشمند سرویس‌ورکر (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.update();
    }).catch(() => {});
  });
}
