// منطق رابط کاربری برنامه جدول تناوبی

const CUSTOM_WORDS_KEY = "jadval_custom_words";
const OPTIONS_KEY = "jadval_puzzle_options";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[d]);
}

function toEnDigits(value) {
  return String(value).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d));
}

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
    const countInput = document.getElementById("wordCountInput");
    const blackCheck = document.getElementById("showBlackCellsCheck");
    const printCheck = document.getElementById("printAnswersCheck");

    const opts = {
      gridShape: shapeSel ? shapeSel.value : "sq-9",
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

  const countInput = document.getElementById("wordCountInput");
  if (countInput && saved.wordCount !== undefined) countInput.value = saved.wordCount;

  const blackCheck = document.getElementById("showBlackCellsCheck");
  if (blackCheck && saved.showBlackCells !== undefined) blackCheck.checked = saved.showBlackCells;

  const printCheck = document.getElementById("printAnswersCheck");
  if (printCheck && saved.printAnswers !== undefined) printCheck.checked = saved.printAnswers;
}

let currentPuzzle = null; // { grid, rows, cols, words }
let activeDir = "across";
let activeCellKey = null;
const cellInputs = new Map(); // "r,c" -> input element
const cellWordMembership = new Map(); // "r,c" -> { across: wordObj|null, down: wordObj|null }

// ---------- بانک کلمات ----------

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

function addCustomWord(word, clue) {
  const custom = loadCustomWords();
  custom.unshift({ word: word.trim(), clue: clue.trim(), custom: true });
  saveCustomWords(custom);
}

function removeCustomWord(word) {
  const custom = loadCustomWords().filter((w) => w.word !== word);
  saveCustomWords(custom);
}

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

// ---------- رندر بانک کلمات ----------

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

document.getElementById("searchInput").addEventListener("input", renderWordBank);

document.getElementById("addWordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const wordInput = document.getElementById("newWordInput");
  const clueInput = document.getElementById("newClueInput");
  const word = wordInput.value.replace(/\s+/g, "");
  const clue = clueInput.value.trim();
  if (!word || !clue) return;
  addCustomWord(word, clue);
  wordInput.value = "";
  clueInput.value = "";
  renderWordBank();
});

// ---------- تولید و رندر جدول ----------

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
        const membership = cellWordMembership.get(k) || {};
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
    // toggle direction if both available
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
  if (val) moveToNextCell(r, c);
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
  } else if (selVal === "sq-auto") {
    return { gridShape: "square", squareSize: "auto" };
  } else if (selVal.startsWith("sq-")) {
    const size = parseInt(selVal.split("-")[1], 10);
    return { gridShape: "square", squareSize: size };
  }
  return { gridShape: "square", squareSize: "auto" };
}

function generateNewPuzzle() {
  const raw = parseInt(toEnDigits(document.getElementById("wordCountInput").value), 10);
  const count = Math.min(30, Math.max(4, isNaN(raw) ? 12 : raw));
  const opts = { maxWords: count, attempts: 16, ...getGridOptions() };
  const all = getAllWords();
  const puzzle = generateCrossword(all, opts);
  currentPuzzle = puzzle;
  buildCellWordMembership(puzzle);
  renderGrid(puzzle);
  renderClues(puzzle);
  const shapeDesc = puzzle.isSquare ? `کلاسیک متقاطع ${toFaDigits(puzzle.rows)}×${toFaDigits(puzzle.cols)}` : `آزاد ${toFaDigits(puzzle.rows)}×${toFaDigits(puzzle.cols)}`;
  setStatus(`جدول جدید (${shapeDesc}) با ${toFaDigits(puzzle.words.length)} کلمه متقاطع ساخته شد.`, "");
}

document.getElementById("newPuzzleBtn").addEventListener("click", generateNewPuzzle);

const shapeSel = document.getElementById("gridShapeSelect");
if (shapeSel) {
  shapeSel.addEventListener("change", () => {
    savePuzzleOptions();
    generateNewPuzzle();
  });
}

const blackCheck = document.getElementById("showBlackCellsCheck");
if (blackCheck) {
  blackCheck.addEventListener("change", (e) => {
    savePuzzleOptions();
    const gridEl = document.getElementById("grid");
    const isChecked = e.target.checked ? "true" : "false";
    if (gridEl) gridEl.dataset.showBlackCells = isChecked;
    document.querySelectorAll(".print-grid").forEach((pg) => (pg.dataset.showBlackCells = isChecked));
  });
}

const printCheck = document.getElementById("printAnswersCheck");
if (printCheck) {
  printCheck.addEventListener("change", () => {
    savePuzzleOptions();
  });
}

document.getElementById("wordCountInput").addEventListener("input", (e) => {
  const digitsOnly = toEnDigits(e.target.value).replace(/[^0-9]/g, "");
  e.target.value = digitsOnly ? toFaDigits(digitsOnly) : "";
  savePuzzleOptions();
});

document.getElementById("checkBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  let allFilled = true;
  let allCorrect = true;
  for (let r = 0; r < currentPuzzle.rows; r++) {
    for (let c = 0; c < currentPuzzle.cols; c++) {
      const letter = currentPuzzle.grid[r][c];
      if (letter == null) continue;
      const input = cellInputs.get(r + "," + c);
      const cellDiv = input.parentElement;
      cellDiv.classList.remove("correct", "incorrect");
      if (!input.value) {
        allFilled = false;
        continue;
      }
      if (input.value === letter) {
        cellDiv.classList.add("correct");
      } else {
        cellDiv.classList.add("incorrect");
        allCorrect = false;
      }
    }
  }
  if (!allFilled) setStatus("هنوز همه خانه‌ها پر نشده‌اند.", "err");
  else if (allCorrect) setStatus("آفرین! همه پاسخ‌ها درست است. 🎉", "ok");
  else setStatus("برخی پاسخ‌ها اشتباه است.", "err");
});

document.getElementById("revealBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  for (let r = 0; r < currentPuzzle.rows; r++) {
    for (let c = 0; c < currentPuzzle.cols; c++) {
      const letter = currentPuzzle.grid[r][c];
      if (letter == null) continue;
      const input = cellInputs.get(r + "," + c);
      input.value = letter;
      input.parentElement.classList.remove("incorrect");
      input.parentElement.classList.add("correct");
    }
  }
  setStatus("پاسخ‌ها نمایش داده شد.", "");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  cellInputs.forEach((input) => {
    input.value = "";
    input.parentElement.classList.remove("correct", "incorrect");
  });
  clearHighlights();
  setStatus("", "");
});

// ---------- چاپ ----------

// ---------- چاپ ----------

function buildPrintPage(puzzle, isAnswerKey, puzzleIndex = null, totalPuzzles = null) {
  const showBlack = document.getElementById("showBlackCellsCheck") ? document.getElementById("showBlackCellsCheck").checked : true;

  const page = document.createElement("div");
  page.className = "print-page";

  const across = puzzle.words.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number);
  const maxColClues = Math.max(across.length, down.length);
  const gridDim = Math.max(puzzle.rows, puzzle.cols);

  // 1. Dynamic Grid Cell Sizing
  const maxWidthMm = 175;
  let targetMaxHeightMm = 95;
  let maxCellCap = 11;

  if (gridDim <= 7) {
    targetMaxHeightMm = 105;
    maxCellCap = 14;
  } else if (gridDim <= 9) {
    targetMaxHeightMm = 98;
    maxCellCap = 11.5;
  } else if (gridDim <= 11) {
    targetMaxHeightMm = 92;
    maxCellCap = 9.2;
  } else {
    targetMaxHeightMm = 85;
    maxCellCap = 7.8;
  }

  const byWidth = Math.floor((maxWidthMm / puzzle.cols) * 10) / 10;
  const byHeight = Math.floor((targetMaxHeightMm / puzzle.rows) * 10) / 10;
  const cellSize = Math.max(5, Math.min(maxCellCap, byWidth, byHeight));

  // 2. Larger Cell Text & Corner Numbers Font Sizes
  const cellFontSize = Math.max(10, Math.round(cellSize * 1.75 * 10) / 10);
  const cellNumSize = Math.max(4.5, Math.round(cellSize * 0.7 * 10) / 10);

  // 3. Larger Clue Font Size & Spacing based on maxColClues
  let clueFontSize = 9.2;
  let clueLineHeight = 1.35;
  let clueMarginBottom = 1.8;
  let h3FontSize = 11;
  let titleFontSize = 15;

  if (maxColClues <= 6) {
    clueFontSize = 13;
    clueLineHeight = 1.55;
    clueMarginBottom = 4;
    h3FontSize = 14;
    titleFontSize = 18;
  } else if (maxColClues <= 9) {
    clueFontSize = 11.5;
    clueLineHeight = 1.45;
    clueMarginBottom = 3;
    h3FontSize = 12.5;
    titleFontSize = 16.5;
  } else if (maxColClues <= 13) {
    clueFontSize = 10.2;
    clueLineHeight = 1.38;
    clueMarginBottom = 2;
    h3FontSize = 11.5;
    titleFontSize = 15;
  } else {
    clueFontSize = 9.2;
    clueLineHeight = 1.3;
    clueMarginBottom = 1.4;
    h3FontSize = 10.5;
    titleFontSize = 14;
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
    metaText = `${toFaDigits(puzzleIndex)} از ${toFaDigits(totalPuzzles)} • ${toFaDigits(puzzle.words.length)} کلمه`;
  }

  header.innerHTML = `
    <span class="print-brand">${brandText}</span>
    <span class="print-sep">•</span>
    <span class="print-meta">${metaText}</span>
    <span class="print-sep">•</span>
    <span class="print-dedication">❤️ تقدیم به پدر عزیزم</span>
  `;
  page.appendChild(header);

  const printGrid = document.createElement("div");
  printGrid.className = "print-grid";
  printGrid.dataset.showBlackCells = showBlack ? "true" : "false";
  printGrid.dataset.isSquare = puzzle.isSquare ? "true" : "false";

  printGrid.style.gridTemplateColumns = `repeat(${puzzle.cols}, ${cellSize}mm)`;
  printGrid.style.gridTemplateRows = `repeat(${puzzle.rows}, ${cellSize}mm)`;

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const div = document.createElement("div");
      const letter = puzzle.grid[r][c];
      if (letter == null) {
        div.className = "print-cell blocked";
      } else {
        div.className = "print-cell";
        const numberKey = puzzle.words.find((p) => p.row === r && p.col === c && p.number);
        if (numberKey) {
          const num = document.createElement("span");
          num.className = "num";
          num.textContent = toFaDigits(numberKey.number);
          div.appendChild(num);
        }
        if (isAnswerKey) {
          div.appendChild(document.createTextNode(letter));
        }
      }
      printGrid.appendChild(div);
    }
  }
  page.appendChild(printGrid);

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
  if (!puzzle || puzzle.rows === 0) return;

  printArea.appendChild(buildPrintPage(puzzle, false));

  if (includeAnswers) {
    printArea.appendChild(buildPrintPage(puzzle, true));
  }
}

function buildBatchPrintView(puzzles, placement) {
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = "";
  const total = puzzles.length;

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
    // none
    puzzles.forEach((puzzle, idx) => {
      printArea.appendChild(buildPrintPage(puzzle, false, idx + 1, total));
    });
  }
}

document.getElementById("printBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  const includeAnswers = document.getElementById("printAnswersCheck") ? document.getElementById("printAnswersCheck").checked : false;
  buildPrintView(currentPuzzle, includeAnswers);
  setTimeout(() => {
    window.print();
  }, 50);
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
  if (batchModal) {
    batchModal.hidden = true;
  }
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

    buildBatchPrintView(puzzles, placement);
    closeBatchModal();

    setTimeout(() => {
      window.print();
    }, 100);
  });
}

// شروع اولیه
applySavedPuzzleOptions();
generateNewPuzzle();
renderWordBank();

// ثبت سرویس‌ورکر (PWA) برای نصب روی گوشی و کارکرد آفلاین
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
