// ─── Rail Fence Cipher ────────────────────────────────────────────────────────

// Returns the rail assignment for each character index — used by both enc/dec and visualizer
export function railPattern(length, rails) {
  const pattern = [];
  let rail = 0, dir = 1;
  for (let i = 0; i < length; i++) {
    pattern.push(rail);
    if (rail === 0) dir = 1;
    else if (rail === rails - 1) dir = -1;
    rail += dir;
  }
  return pattern;
}

export function railFenceEnc(text, rails) {
  if (rails < 2 || rails >= text.length) return text;
  const pattern = railPattern(text.length, rails);
  const fence = Array.from({ length: rails }, () => []);
  for (let i = 0; i < text.length; i++) fence[pattern[i]].push(text[i]);
  return fence.flat().join("");
}

export function railFenceDec(text, rails) {
  if (rails < 2 || rails >= text.length) return text;
  const n = text.length;
  const pattern = railPattern(n, rails);

  // How many characters go on each rail
  const counts = Array(rails).fill(0);
  for (const r of pattern) counts[r]++;

  // Slice text into rails
  const fence = [];
  let pos = 0;
  for (let r = 0; r < rails; r++) {
    fence.push(text.slice(pos, pos + counts[r]).split(""));
    pos += counts[r];
  }

  // Read in zigzag order
  const ptrs = Array(rails).fill(0);
  return pattern.map(r => fence[r][ptrs[r]++]).join("");
}

// Returns grid for visualization: array of { char, rail, position }
export function railFenceGrid(text, rails) {
  if (rails < 2) return [];
  const pattern = railPattern(text.length, rails);
  return text.split("").map((char, i) => ({ char, rail: pattern[i], position: i }));
}

// ─── Columnar Transposition ───────────────────────────────────────────────────

function columnOrder(key) {
  // Returns the indices of key chars in alphabetical order
  return key.split("").map((ch, i) => ({ ch, i }))
    .sort((a, b) => a.ch.localeCompare(b.ch))
    .map(x => x.i);
}

export function columnarEnc(text, key) {
  if (!key) return text;
  const n = key.length;
  const padLen = Math.ceil(text.length / n) * n;
  const padded = text.padEnd(padLen, "X");
  const numRows = padded.length / n;
  const order = columnOrder(key);

  // Build grid
  const grid = Array.from({ length: numRows }, (_, r) =>
    padded.slice(r * n, (r + 1) * n).split("")
  );

  // Read columns in sorted key order
  return order.map(col => grid.map(row => row[col]).join("")).join("");
}

export function columnarDec(text, key) {
  if (!key) return text;
  const n = key.length;
  const numRows = Math.ceil(text.length / n);
  const extra = text.length % n; // first `extra` sorted-columns have numRows chars, rest have numRows-1
  const order = columnOrder(key);

  // Column lengths in sorted order
  const colLens = Array.from({ length: n }, (_, si) =>
    extra === 0 ? numRows : si < extra ? numRows : numRows - 1
  );

  // Map sorted index → original column index → its characters
  const cols = {};
  let pos = 0;
  for (let si = 0; si < n; si++) {
    const origCol = order[si];
    cols[origCol] = text.slice(pos, pos + colLens[si]);
    pos += colLens[si];
  }

  // Read row by row
  const ptrs = Array(n).fill(0);
  let result = "";
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < n; c++) {
      if (cols[c] && ptrs[c] < cols[c].length) {
        result += cols[c][ptrs[c]++];
      }
    }
  }
  return result;
}

// Returns grid visualization for columnar: { grid, order }
export function columnarGrid(text, key) {
  if (!key) return null;
  const n = key.length;
  const padLen = Math.ceil(text.length / n) * n;
  const padded = text.padEnd(padLen, "X");
  const numRows = padded.length / n;
  const order = columnOrder(key);
  const sortedKeyChars = key.split("").map((ch, i) => ({ ch, sortIdx: order.indexOf(i), origIdx: i }));

  const grid = Array.from({ length: numRows }, (_, r) =>
    padded.slice(r * n, (r + 1) * n).split("")
  );

  return { grid, order, sortedKeyChars, key: key.split("") };
}
