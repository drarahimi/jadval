// منطق رابط کاربری برنامه جدول تناوبی

const CUSTOM_WORDS_KEY = "jadval_custom_words";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[d]);
}

function toEnDigits(value) {
  return String(value).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d));
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

function generateNewPuzzle() {
  const raw = parseInt(toEnDigits(document.getElementById("wordCountInput").value), 10);
  const count = Math.min(30, Math.max(4, isNaN(raw) ? 12 : raw));
  const all = getAllWords();
  const puzzle = generateCrossword(all, { maxWords: count, attempts: 10 });
  currentPuzzle = puzzle;
  buildCellWordMembership(puzzle);
  renderGrid(puzzle);
  renderClues(puzzle);
  setStatus(`جدول جدید با ${toFaDigits(puzzle.words.length)} کلمه ساخته شد.`, "");
}

document.getElementById("newPuzzleBtn").addEventListener("click", generateNewPuzzle);

document.getElementById("wordCountInput").addEventListener("input", (e) => {
  const digitsOnly = toEnDigits(e.target.value).replace(/[^0-9]/g, "");
  e.target.value = digitsOnly ? toFaDigits(digitsOnly) : "";
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

function buildPrintView(puzzle, includeAnswers) {
  const printGrid = document.getElementById("printGrid");
  printGrid.innerHTML = "";
  if (!puzzle || puzzle.rows === 0) return;

  const maxWidthMm = 180;
  const maxHeightMm = 240;
  const byWidth = Math.floor((maxWidthMm / puzzle.cols) * 10) / 10;
  const byHeight = Math.floor((maxHeightMm / puzzle.rows) * 10) / 10;
  const cellSize = Math.max(3.5, Math.min(9, byWidth, byHeight));
  printGrid.style.gridTemplateColumns = `repeat(${puzzle.cols}, ${cellSize}mm)`;
  printGrid.style.gridTemplateRows = `repeat(${puzzle.rows}, ${cellSize}mm)`;
  printGrid.style.setProperty("--print-cell", cellSize + "mm");

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
        if (includeAnswers) {
          div.appendChild(document.createTextNode(letter));
        }
      }
      printGrid.appendChild(div);
    }
  }

  const across = puzzle.words.filter((p) => p.dir === "across").sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((p) => p.dir === "down").sort((a, b) => a.number - b.number);

  const printAcross = document.getElementById("printAcross");
  const printDown = document.getElementById("printDown");
  printAcross.innerHTML = "";
  printDown.innerHTML = "";
  across.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    printAcross.appendChild(li);
  });
  down.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${toFaDigits(p.number)}.</b> ${escapeHtml(p.clue)}`;
    printDown.appendChild(li);
  });

  document.getElementById("printMeta").textContent = `جدول کلمات متقاطع • ${toFaDigits(puzzle.words.length)} کلمه`;
}

document.getElementById("printBtn").addEventListener("click", () => {
  if (!currentPuzzle) return;
  const includeAnswers = document.getElementById("printAnswersCheck").checked;
  buildPrintView(currentPuzzle, includeAnswers);
  window.print();
});

// شروع اولیه
generateNewPuzzle();
renderWordBank();
