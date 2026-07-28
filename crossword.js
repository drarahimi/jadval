// موتور قدرتمند تولید جدول کلمات متقاطع کلاسیک با الگوریتم MRV و الگوی تقارن ۱۸۰ درجه

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// الگوهای استاندارد و متقارن ۱۸۰ درجه برای اندازه‌های مختلف (۰ = خانه سفید، ۱ = خانه سیاه)
const CLASSIC_TEMPLATES = {
  7: [
    [
      [0, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [1, 0, 0, 1, 0, 0, 1],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0]
    ],
    [
      [0, 0, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 0]
    ]
  ],
  9: [
    [
      [0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 0, 1, 0],
      [0, 0, 1, 1, 0, 1, 1, 0, 0],
      [0, 1, 0, 0, 1, 0, 0, 0, 1],
      [0, 0, 1, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0]
    ],
    [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 0, 0, 1, 0, 1],
      [0, 0, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0]
    ]
  ],
  11: [
    [
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
      [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    ]
  ],
  13: [
    [
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    ]
  ]
};

// استخراج اسلات‌های افقی و عمودی همراه با شماره‌گذاری استاندارد
function extractSlots(template) {
  const N = template.length;
  const slots = [];
  const numberAt = {};
  let num = 1;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (template[r][c] === 1) continue;
      const startsAcross = (c === 0 || template[r][c - 1] === 1) && c + 1 < N && template[r][c + 1] === 0;
      const startsDown = (r === 0 || template[r - 1][c] === 1) && r + 1 < N && template[r + 1][c] === 0;
      if (startsAcross || startsDown) {
        numberAt[r + "," + c] = num++;
      }
    }
  }

  for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
      if (template[r][c] === 0) {
        let start = c;
        while (c < N && template[r][c] === 0) c++;
        let len = c - start;
        if (len >= 2) {
          slots.push({ id: "A_" + r + "_" + start, dir: "across", row: r, col: start, len, number: numberAt[r + "," + start] });
        }
      } else c++;
    }
  }

  for (let c = 0; c < N; c++) {
    let r = 0;
    while (r < N) {
      if (template[r][c] === 0) {
        let start = r;
        while (r < N && template[r][c] === 0) r++;
        let len = r - start;
        if (len >= 2) {
          slots.push({ id: "D_" + start + "_" + c, dir: "down", row: start, col: c, len, number: numberAt[start + "," + c] });
        }
      } else r++;
    }
  }

  return { slots, numberAt };
}

// موتور حل جدول متقاطع با تکنیک MRV (Minimum Remaining Values)
function solveClassicCrossword(wordList, opts = {}) {
  let N = 9;
  if (typeof opts.squareSize === "number" && opts.squareSize > 0) {
    N = opts.squareSize;
  } else if (opts.maxWords) {
    N = opts.maxWords <= 7 ? 7 : opts.maxWords <= 12 ? 9 : opts.maxWords <= 18 ? 11 : 13;
  }

  const templatePool = CLASSIC_TEMPLATES[N] || CLASSIC_TEMPLATES[9];
  const words = wordList.filter((w) => w.word && !w.word.includes(" "));
  const wordsByLen = {};
  words.forEach((w) => {
    const l = w.word.length;
    if (!wordsByLen[l]) wordsByLen[l] = [];
    wordsByLen[l].push(w);
  });

  const maxAttempts = opts.attempts || 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const template = templatePool[attempt % templatePool.length];
    const { slots } = extractSlots(template);

    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (template[r][c] === 1) grid[r][c] = null;
      }
    }

    const assignedWords = new Set();
    const assignedSlots = new Set();
    const placed = [];

    function getValidCandidates(slot) {
      const list = wordsByLen[slot.len] || [];
      const valid = [];
      for (let wIdx = 0; wIdx < list.length; wIdx++) {
        const w = list[wIdx];
        if (assignedWords.has(w.word)) continue;
        let ok = true;
        for (let i = 0; i < slot.len; i++) {
          const r = slot.dir === "down" ? slot.row + i : slot.row;
          const c = slot.dir === "across" ? slot.col + i : slot.col;
          const cur = grid[r][c];
          if (cur !== null && cur !== w.word[i]) {
            ok = false;
            break;
          }
        }
        if (ok) valid.push(w);
      }
      return valid;
    }

    let steps = 0;

    function backtrack() {
      if (assignedSlots.size === slots.length) return true;
      steps++;
      if (steps > 15000) return false;

      let bestSlot = null;
      let bestCandidates = null;
      let minCount = Infinity;

      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        const slot = slots[sIdx];
        if (assignedSlots.has(slot)) continue;
        const cands = getValidCandidates(slot);
        if (cands.length === 0) return false;
        if (cands.length < minCount) {
          minCount = cands.length;
          bestSlot = slot;
          bestCandidates = cands;
        }
      }

      if (!bestSlot) return false;

      bestCandidates = shuffle(bestCandidates);

      for (let cIdx = 0; cIdx < bestCandidates.length; cIdx++) {
        const cand = bestCandidates[cIdx];
        const changes = [];
        for (let i = 0; i < bestSlot.len; i++) {
          const r = bestSlot.dir === "down" ? bestSlot.row + i : bestSlot.row;
          const c = bestSlot.dir === "across" ? bestSlot.col + i : bestSlot.col;
          if (grid[r][c] === null) {
            grid[r][c] = cand.word[i];
            changes.push([r, c]);
          }
        }
        assignedWords.add(cand.word);
        assignedSlots.add(bestSlot);
        placed.push({ word: cand.word, clue: cand.clue, row: bestSlot.row, col: bestSlot.col, dir: bestSlot.dir, number: bestSlot.number });

        if (backtrack()) return true;

        assignedWords.delete(cand.word);
        assignedSlots.delete(bestSlot);
        placed.pop();
        changes.forEach(([r, c]) => { grid[r][c] = null; });
      }
      return false;
    }

    if (backtrack()) {
      return { grid, rows: N, cols: N, words: placed, isSquare: true };
    }
  }

  // چیدمان پشتیبان
  return tryFreeformGenerate(wordList, opts);
}

// چیدمان آزاد (غیرمربعی)
function tryFreeformGenerate(wordList, opts = {}) {
  const maxWords = opts.maxWords || 12;
  const allValidWords = wordList.filter((w) => w.word && w.word.length >= 2);
  const anchorMinLen = opts.anchorMinWordLength || 0;
  // A hard cap on anchor length even when the caller doesn't set one: without it, a rare
  // 15+ letter compound entry can become the very first anchor and instantly blow past
  // any sane grid bound, locking out every later placement.
  const anchorMaxLen = opts.anchorMaxWordLength || 11;
  const anchorPool = allValidWords.filter((w) => w.word.length >= anchorMinLen && w.word.length <= anchorMaxLen);
  let candidates = shuffle((anchorPool.length > 0 ? anchorPool : allValidWords).slice());
  candidates.sort((a, b) => b.word.length - a.word.length);
  candidates = candidates.slice(0, Math.max(maxWords * 4, 40));

  // Target grid area assumes ~65% fill density once gaps are packed with filler words.
  const anchorLengthSum = candidates.slice(0, maxWords).reduce((s, w) => s + w.word.length, 0);
  const longestCandidate = candidates.reduce((m, w) => Math.max(m, w.word.length), 0);
  const targetArea = Math.max(anchorLengthSum, 30) / 0.75;
  const maxDimension = opts.maxDimension || Math.max(9, longestCandidate + 2, Math.ceil(Math.sqrt(targetArea)));

  const cells = new Map();
  const placed = [];
  const usedWords = new Set();
  const key = (r, c) => r + "," + c;
  let boundsR = { min: 0, max: 0 };
  let boundsC = { min: 0, max: 0 };

  function canPlace(word, row, col, dir) {
    let hasIntersection = false;
    for (let i = 0; i < word.length; i++) {
      const r = dir === "down" ? row + i : row;
      const c = dir === "across" ? col + i : col;
      const existing = cells.get(key(r, c));
      if (existing) {
        if (existing.ch !== word[i]) return false;
        hasIntersection = true;
      } else {
        if (dir === "across") {
          if (cells.has(key(r - 1, c)) || cells.has(key(r + 1, c))) return false;
        } else {
          if (cells.has(key(r, c - 1)) || cells.has(key(r, c + 1))) return false;
        }
      }
    }
    if (dir === "across") {
      if (cells.has(key(row, col - 1)) || cells.has(key(row, col + word.length))) return false;
    } else {
      if (cells.has(key(row - 1, col)) || cells.has(key(row + word.length, col))) return false;
    }
    return hasIntersection;
  }

  function place(word, clue, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = dir === "down" ? row + i : row;
      const c = dir === "across" ? col + i : col;
      cells.set(key(r, c), { ch: word[i] });
    }
    const endR = dir === "down" ? row + word.length - 1 : row;
    const endC = dir === "across" ? col + word.length - 1 : col;
    boundsR = { min: Math.min(boundsR.min, row, endR), max: Math.max(boundsR.max, row, endR) };
    boundsC = { min: Math.min(boundsC.min, col, endC), max: Math.max(boundsC.max, col, endC) };
    placed.push({ word, clue, row, col, dir });
    usedWords.add(word);
  }

  function boundsAfter(word, row, col, dir) {
    const endR = dir === "down" ? row + word.length - 1 : row;
    const endC = dir === "across" ? col + word.length - 1 : col;
    const minR = Math.min(boundsR.min, row, endR);
    const maxR = Math.max(boundsR.max, row, endR);
    const minC = Math.min(boundsC.min, col, endC);
    const maxC = Math.max(boundsC.max, col, endC);
    return { rows: maxR - minR + 1, cols: maxC - minC + 1 };
  }

  if (candidates.length === 0) return { grid: [], rows: 0, cols: 0, words: [], isSquare: false };

  // تلاش برای جای‌دادن یک کلمه در بهترین تقاطع ممکن با خانه‌های موجود
  function tryPlaceWord(cand) {
    const word = cand.word;
    const posOptions = [];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      for (const [k, v] of cells) {
        if (v.ch !== ch) continue;
        const [er, ec] = k.split(",").map(Number);
        posOptions.push({ row: er, col: ec - i, dir: "across" });
        posOptions.push({ row: er - i, col: ec, dir: "down" });
      }
    }
    shuffle(posOptions);

    const withinBounds = posOptions.filter((opt) => {
      const b = boundsAfter(word, opt.row, opt.col, opt.dir);
      return b.rows <= maxDimension && b.cols <= maxDimension;
    });
    withinBounds.sort((a, b) => {
      const ba = boundsAfter(word, a.row, a.col, a.dir);
      const bb = boundsAfter(word, b.row, b.col, b.dir);
      return ba.rows * ba.cols - bb.rows * bb.cols;
    });

    // فقط گزینه‌هایی که اندازه جدول را در محدوده مجاز نگه می‌دارند بررسی می‌شوند؛
    // بدون این قید، یک جای‌گذاری خارج از محدوده باعث بزرگ‌شدن دائمی کادر می‌شود
    // و همه تلاش‌های بعدی را نیز از محدوده خارج می‌کند.
    for (const opt of withinBounds) {
      if (canPlace(word, opt.row, opt.col, opt.dir)) {
        place(word, cand.clue, opt.row, opt.col, opt.dir);
        return true;
      }
    }
    return false;
  }

  // چندین دور تلاش روی چند دسته کلمه، تا کلماتی که در دور اول جا نشدند
  // به‌محض بازشدن فضای جدید در دورهای بعدی دوباره امتحان شوند
  function runPasses(pool, cap) {
    let addedInPass = true;
    while (addedInPass && placed.length < cap) {
      addedInPass = false;
      for (const cand of pool) {
        if (placed.length >= cap) break;
        if (usedWords.has(cand.word)) continue;
        if (tryPlaceWord(cand)) addedInPass = true;
      }
    }
  }

  const first = candidates[0];
  place(first.word, first.clue, 0, 0, "across");

  // مرحله اول: کلمات بلندتر که ستون فقرات جدول را می‌سازند
  runPasses(candidates.slice(1), maxWords);

  // مرحله دوم (چگالش): پرکردن شکاف‌های باقی‌مانده با کلمات کوتاه‌تر تا خانه‌های سیاه کاهش یابد
  const fillerPool = shuffle(allValidWords.filter((w) => !usedWords.has(w.word)));
  fillerPool.sort((a, b) => b.word.length - a.word.length);
  runPasses(fillerPool, maxWords * 8);

  if (placed.length === 0) return { grid: [], rows: 0, cols: 0, words: [], isSquare: false };

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  placed.forEach((p) => {
    const len = p.word.length;
    const endR = p.dir === "down" ? p.row + len - 1 : p.row;
    const endC = p.dir === "across" ? p.col + len - 1 : p.col;
    minR = Math.min(minR, p.row, endR);
    maxR = Math.max(maxR, p.row, endR);
    minC = Math.min(minC, p.col, endC);
    maxC = Math.max(maxC, p.col, endC);
  });
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  placed.forEach((p) => {
    p.row -= minR;
    p.col -= minC;
    for (let i = 0; i < p.word.length; i++) {
      const r = p.dir === "down" ? p.row + i : p.row;
      const c = p.dir === "across" ? p.col + i : p.col;
      grid[r][c] = p.word[i];
    }
  });

  const numberAt = {};
  let num = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] == null) continue;
      const startsAcross = (c === 0 || grid[r][c - 1] == null) && c + 1 < cols && grid[r][c + 1] != null;
      const startsDown = (r === 0 || grid[r - 1][c] == null) && r + 1 < rows && grid[r + 1][c] != null;
      if (startsAcross || startsDown) {
        numberAt[r + "," + c] = num++;
      }
    }
  }

  placed.forEach((p) => {
    p.number = numberAt[p.row + "," + p.col];
  });

  return { grid, rows, cols, words: placed, isSquare: false };
}

function generateCrossword(wordList, opts = {}) {
  if (opts.gridShape === "free") {
    const attempts = Math.min(opts.attempts || 1, 8);
    let best = null;
    let bestFillRatio = -1;
    for (let i = 0; i < attempts; i++) {
      const candidate = tryFreeformGenerate(wordList, opts);
      if (!candidate.rows) continue;
      const area = candidate.rows * candidate.cols;
      const filled = candidate.words.reduce((sum, w) => sum + w.word.length, 0);
      const fillRatio = area > 0 ? filled / area : 0;
      if (fillRatio > bestFillRatio) {
        bestFillRatio = fillRatio;
        best = candidate;
      }
    }
    return best || tryFreeformGenerate(wordList, opts);
  }

  const minLen = opts.minWordLength || 0;
  const maxLen = opts.maxWordLength || Infinity;
  const words = (minLen > 0 || maxLen < Infinity)
    ? wordList.filter((w) => w.word && w.word.length >= minLen && w.word.length <= maxLen)
    : wordList;
  return solveClassicCrossword(words, opts);
}
