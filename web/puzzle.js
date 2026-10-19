export const BOARDS = { flat: [18, 12, 1], cube: [6, 6, 6] };
export const CELL_MM = 16;
export const colorFor = id => `hsl(${(id * 137.508 + 12) % 360}, 57%, 57%)`;
export const cellIndex = ([x, y, z], [w, h]) => x + w * (y + h * z);
const keyOf = cells => cells.map(c => c.join(',')).sort().join(';');
const multiply = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const turns = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
];
const rotations = [identity];
for (let i = 0; i < rotations.length; i++) {
  for (const turn of turns) {
    const next = multiply(turn, rotations[i]);
    if (!rotations.some(r => r.flat().join() === next.flat().join())) rotations.push(next);
  }
}

function orientation(cells, matrix) {
  const rotated = cells.map(([x, y]) => matrix.map(row => row[0] * x + row[1] * y));
  const min = [0, 1, 2].map(a => Math.min(...rotated.map(c => c[a])));
  const normalized = rotated.map(c => c.map((v, a) => v - min[a]));
  return {
    key: keyOf(normalized), cells: normalized, matrix,
    offset: min.map((v, a) => -v + (1 - matrix[a].reduce((s, n) => s + n, 0)) / 2),
    size: [0, 1, 2].map(a => Math.max(...normalized.map(c => c[a])) + 1),
  };
}

export function orientationsFor(shape, mode = 'cube', allowFlip = true) {
  const unique = new Map();
  for (const matrix of rotations) {
    if (mode === 'flat' && (matrix[2][2] === 0 || (!allowFlip && matrix[2][2] !== 1))) continue;
    const o = orientation(shape.cells, matrix);
    if (!unique.has(o.key)) unique.set(o.key, o);
  }
  return [...unique.values()];
}

export function turnedOrientation(shape, current, axis, mode, allowFlip = true) {
  const turn = mode === 'flat' && axis === 0 ? multiply(turns[0], turns[0]) : turns[axis];
  const transformed = orientation(shape.cells, multiply(turn, current.matrix));
  return orientationsFor(shape, mode, allowFlip).find(o => o.key === transformed.key) ?? current;
}

export function placementCells(placement, shapes, mode, allowFlip = true) {
  const shape = shapes.find(s => s.id === placement.piece);
  if (!shape) throw new Error('未知拼块编号');
  const o = orientationsFor(shape, mode, allowFlip).find(o => o.key === placement.orientation);
  if (!o) throw new Error(`${shape.name} 的朝向不符合当前模式`);
  if (!Array.isArray(placement.origin) || placement.origin.length !== 3 || !placement.origin.every(Number.isInteger)) {
    throw new Error(`${shape.name} 的坐标必须是三个整数`);
  }
  return o.cells.map(c => c.map((v, a) => v + placement.origin[a]));
}

export function validatePlacements(shapes, mode, placements, allowFlip = true, restrictions = {}, dims = BOARDS[mode]) {
  if (!dims || !Array.isArray(placements)) throw new Error('无效的棋盘或排布数据');
  const occupied = new Map(), used = new Set();
  for (const [id, keys] of Object.entries(restrictions)) {
    const shape = shapes.find(s => s.id === Number(id));
    if (!shape || !Array.isArray(keys) || !keys.length || keys.some(k => !orientationsFor(shape, mode, allowFlip).some(o => o.key === k))) {
      throw new Error('朝向限制无效，请重新设置');
    }
  }
  for (const p of placements) {
    if (used.has(p.piece)) throw new Error('同一拼块不能重复放置');
    used.add(p.piece);
    const shape = shapes.find(s => s.id === p.piece);
    const cells = placementCells(p, shapes, mode, allowFlip);
    if (restrictions[p.piece] && !restrictions[p.piece].includes(p.orientation)) throw new Error(`${shape.name} 不符合朝向限制`);
    for (const c of cells) {
      if (c.some((v, a) => v < 0 || v >= dims[a])) throw new Error(`${shape.name} 超出棋盘边界`);
      const i = cellIndex(c, dims);
      if (occupied.has(i)) throw new Error(`${shape.name} 与其他拼块重叠`);
      occupied.set(i, p.piece);
    }
  }
  return occupied;
}

/** Algorithm X with dancing links. A row covers one piece and all of its cells. */
export function solvePuzzle({ shapes, mode = 'flat', placements = [], allowFlip = true, restrictions = {}, dims = BOARDS[mode], timeLimitMs = 60000, seed = 42, onProgress = () => {} }) {
  const started = performance.now();
  const fixed = placements.map(p => ({ ...p, locked: true }));
  const occupied = validatePlacements(shapes, mode, fixed, allowFlip, restrictions, dims);
  const volume = dims.reduce((a, b) => a * b, 1);
  if (shapes.reduce((s, p) => s + p.cells.length, 0) !== volume) throw new Error('拼块总格数与棋盘容量不一致');
  const remaining = shapes.filter(s => !fixed.some(p => p.piece === s.id));
  const filled = new Uint8Array(volume);
  for (const i of occupied.keys()) filled[i] = 1;
  const neighbors = Array.from({ length: volume }, (_, i) => {
    const c = [i % dims[0], Math.floor(i / dims[0]) % dims[1], Math.floor(i / (dims[0] * dims[1]))];
    return [0, 1, 2].flatMap(a => [-1, 1].flatMap(d => {
      const p = [...c]; p[a] += d;
      return p[a] >= 0 && p[a] < dims[a] ? [cellIndex(p, dims)] : [];
    }));
  });
  const used = new Set(fixed.map(p => p.piece));
  const parity = Int8Array.from({ length: volume }, (_, i) => ((i % dims[0] + Math.floor(i / dims[0]) % dims[1] + Math.floor(i / (dims[0] * dims[1]))) % 2 ? -1 : 1));
  let emptyParity = parity.reduce((sum, v, i) => sum + (filled[i] ? 0 : v), 0);
  const imbalance = new Map(shapes.map(s => [s.id, Math.abs(s.cells.reduce((sum, [x, y]) => sum + ((x + y) % 2 ? -1 : 1), 0))]));
  const parityCounts = [0, 0, 0, 0, 0];
  for (const s of remaining) parityCounts[imbalance.get(s.id)]++;
  const canCheckParity = shapes.every(s => imbalance.get(s.id) <= 4 && [3, 6].includes(s.cells.length));
  function parityPossible() {
    if (!canCheckParity) return true;
    const total = parityCounts[1] + 2 * parityCounts[2] + 4 * parityCounts[4];
    const negative = (total - emptyParity) / 2;
    if (!Number.isInteger(negative) || negative < 0 || negative > total) return false;
    for (let ones = 0; ones <= parityCounts[1]; ones++) {
      const rest = negative - ones;
      if (rest >= 0 && rest <= 2 * parityCounts[2] + 4 * parityCounts[4] && rest % 2 === 0 && (parityCounts[2] || rest % 4 === 0)) return true;
    }
    return false;
  }
  const isThreeSix = shapes.every(s => [3, 6].includes(s.cells.length));
  const marks = new Uint32Array(volume), queue = new Uint16Array(volume);
  let stamp = 0;
  function componentsPossible() {
    if (!isThreeSix) return true;
    stamp++;
    let odd = 0;
    for (let i = 0; i < volume; i++) {
      if (filled[i] || marks[i] === stamp) continue;
      let head = 0, tail = 1;
      queue[0] = i; marks[i] = stamp;
      while (head < tail) {
        for (const j of neighbors[queue[head++]]) if (!filled[j] && marks[j] !== stamp) {
          marks[j] = stamp; queue[tail++] = j;
        }
      }
      if (tail % 3) return false;
      if (tail % 6) odd++;
    }
    return odd <= shapes.filter(s => s.cells.length === 3 && !used.has(s.id)).length;
  }
  const finish = (status, solution = null) => ({ status, solution, nodes, maxDepth, elapsedMs: performance.now() - started, candidateCount: rows.length });
  let nodes = 0, maxDepth = fixed.length;
  const rows = [];
  if (!componentsPossible()) return finish('unsatisfiable');
  onProgress({ phase: 'prepare', nodes: 0, maxDepth, elapsedMs: 0 });
  const cellColumns = new Int16Array(volume);
  let columns = 0;
  for (let i = 0; i < volume; i++) if (!filled[i]) cellColumns[i] = ++columns;
  const pieceColumns = new Map(remaining.map(s => [s.id, ++columns]));
  let nodeCount = columns + 1;
  for (const shape of remaining) {
    for (const o of orientationsFor(shape, mode, allowFlip)) {
      if (restrictions[shape.id] && !restrictions[shape.id].includes(o.key)) continue;
      for (let z = 0; z <= dims[2] - o.size[2]; z++) for (let y = 0; y <= dims[1] - o.size[1]; y++) for (let x = 0; x <= dims[0] - o.size[0]; x++) {
        const indices = o.cells.map(([a, b, c]) => cellIndex([a + x, b + y, c + z], dims));
        if (indices.some(i => filled[i])) continue;
        rows.push({ piece: shape.id, orientation: o.key, origin: [x, y, z], indices });
        nodeCount += indices.length + 1;
      }
    }
  }
  // Seeded row ordering avoids repeatedly getting trapped in the same early branch.
  let randomState = seed >>> 0;
  if (randomState) for (let i = rows.length - 1; i > 0; i--) {
    randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
    const j = (randomState >>> 0) % (i + 1);
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  const L = new Int32Array(nodeCount), R = new Int32Array(nodeCount), U = new Int32Array(nodeCount), D = new Int32Array(nodeCount);
  const C = new Int16Array(nodeCount), S = new Int32Array(columns + 1), rowOf = new Int32Array(nodeCount);
  for (let c = 0; c <= columns; c++) { L[c] = c - 1; R[c] = c + 1; U[c] = D[c] = c; }
  L[0] = columns; R[columns] = 0;
  let next = columns + 1;
  rows.forEach((row, rowId) => {
    const cols = [pieceColumns.get(row.piece), ...row.indices.map(i => cellColumns[i])];
    const first = next;
    for (const c of cols) {
      const n = next++;
      C[n] = c; rowOf[n] = rowId; S[c]++;
      U[n] = U[c]; D[n] = c; D[U[c]] = n; U[c] = n;
      L[n] = n - 1; R[n] = n + 1;
    }
    L[first] = next - 1; R[next - 1] = first;
  });
  function cover(c) {
    R[L[c]] = R[c]; L[R[c]] = L[c];
    for (let i = D[c]; i !== c; i = D[i]) for (let j = R[i]; j !== i; j = R[j]) {
      D[U[j]] = D[j]; U[D[j]] = U[j]; S[C[j]]--;
    }
  }
  function uncover(c) {
    for (let i = U[c]; i !== c; i = U[i]) for (let j = L[i]; j !== i; j = L[j]) {
      S[C[j]]++; D[U[j]] = j; U[D[j]] = j;
    }
    R[L[c]] = c; L[R[c]] = c;
  }
  const chosen = [];
  let timedOut = false, lastProgress = 0;
  function search() {
    nodes++;
    maxDepth = Math.max(maxDepth, fixed.length + chosen.length);
    if (nodes === 1 || (nodes & 1023) === 0) {
      const elapsedMs = performance.now() - started;
      if (timeLimitMs > 0 && elapsedMs >= timeLimitMs) { timedOut = true; return false; }
      if (elapsedMs - lastProgress > 200 || nodes === 1) {
        lastProgress = elapsedMs;
        onProgress({ phase: 'search', nodes, maxDepth, elapsedMs, candidateCount: rows.length });
      }
    }
    if (R[0] === 0) return true;
    let c = R[0];
    for (let j = R[c]; j !== 0; j = R[j]) if (S[j] < S[c]) { c = j; if (S[c] <= 1) break; }
    if (S[c] === 0) return false;
    cover(c);
    for (let r = D[c]; r !== c; r = D[r]) {
      const row = rows[rowOf[r]];
      chosen.push(row); used.add(row.piece);
      parityCounts[imbalance.get(row.piece)]--;
      for (const i of row.indices) { filled[i] = 1; emptyParity -= parity[i]; }
      for (let j = R[r]; j !== r; j = R[j]) cover(C[j]);
      if (parityPossible() && (chosen.length % 3 !== 0 || componentsPossible()) && search()) return true;
      for (let j = L[r]; j !== r; j = L[j]) uncover(C[j]);
      for (const i of row.indices) { filled[i] = 0; emptyParity += parity[i]; }
      parityCounts[imbalance.get(row.piece)]++;
      used.delete(row.piece); chosen.pop();
      if (timedOut) break;
    }
    uncover(c);
    return false;
  }
  if (search()) return finish('solved', [...fixed, ...chosen.map(({ piece, orientation, origin }) => ({ piece, orientation, origin, locked: false }))]);
  return finish(timedOut ? 'timeout' : 'unsatisfiable');
}
