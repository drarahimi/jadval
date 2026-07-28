// موتور تولید جدول کلمات متقاطع

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryGenerate(wordList, maxWords) {
  let candidates = wordList.filter((w) => w.word && w.word.length >= 2);
  candidates = shuffle(candidates);
  candidates.sort((a, b) => b.word.length - a.word.length);
  candidates = candidates.slice(0, Math.max(maxWords * 4, 40));
  candidates = shuffle(candidates);

  const cells = new Map(); // "r,c" -> { ch }
  const placed = [];
  const usedWords = new Set();

  const key = (r, c) => r + "," + c;

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
      if (cells.has(key(row, col - 1))) return false;
      if (cells.has(key(row, col + word.length))) return false;
    } else {
      if (cells.has(key(row - 1, col))) return false;
      if (cells.has(key(row + word.length, col))) return false;
    }
    return hasIntersection;
  }

  function place(word, clue, row, col, dir) {
    for (let i = 0; i < word.length; i++) {
      const r = dir === "down" ? row + i : row;
      const c = dir === "across" ? col + i : col;
      cells.set(key(r, c), { ch: word[i] });
    }
    placed.push({ word, clue, row, col, dir });
    usedWords.add(word);
  }

  if (candidates.length === 0) return { placed: [] };

  const first = candidates[0];
  place(first.word, first.clue, 0, 0, "across");

  for (let idx = 1; idx < candidates.length && placed.length < maxWords; idx++) {
    const cand = candidates[idx];
    if (usedWords.has(cand.word)) continue;
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

    for (const opt of posOptions) {
      if (canPlace(word, opt.row, opt.col, opt.dir)) {
        place(word, cand.clue, opt.row, opt.col, opt.dir);
        break;
      }
    }
  }

  return { placed };
}

function finalizeGrid(placed) {
  if (placed.length === 0) {
    return { grid: [], rows: 0, cols: 0, words: [] };
  }
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

  return { grid, rows, cols, words: placed };
}

function generateCrossword(wordList, opts = {}) {
  const maxWords = opts.maxWords || 12;
  const attempts = opts.attempts || 8;

  let best = { placed: [] };
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = tryGenerate(wordList, maxWords);
    if (result.placed.length > best.placed.length) best = result;
    if (best.placed.length >= maxWords) break;
  }
  return finalizeGrid(best.placed);
}
