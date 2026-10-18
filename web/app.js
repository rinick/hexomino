import { BOARDS, colorFor, orientationsFor, turnedOrientation, placementCells, validatePlacements, cellIndex } from './puzzle.js';

const $ = id => document.getElementById(id);
let shapes;
try {
  const response = await fetch('./shapes.json');
  if (!response.ok) throw new Error('无法读取 shapes.json');
  shapes = await response.json();
} catch (error) {
  $('status-text').textContent = `加载失败：${error.message}。请使用 npm start 启动。`;
  $('solve-btn').disabled = true;
  throw error;
}
const clone = data => structuredClone(data);
const defaults = mode => ({ mode, placements: [], restrictions: {}, allowFlip: true, selected: 1, orientation: orientationsFor(shapes[0], mode)[0].key, origin: [0, 0, 0], layer: 0, view: 'three', cut: 6, explode: 0 });
const history = { flat: [], cube: [] };
let state = defaults('flat'), viewer, worker, ghost = null, timer, started = 0, busy = false, toastTimer;
const viewers = new Map(), viewerPromises = new Map(), thumbnailImages = new Map();
let thumbnailErrorShown = false;
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}
function save() {
  try { localStorage.setItem(`hexomino-v1-${state.mode}`, JSON.stringify(state)); localStorage.setItem('hexomino-last-mode', state.mode); }
  catch { /* Export remains available if browser storage is disabled or full. */ }
}
function readState(mode, data) {
  if (!BOARDS[mode] || !data || !Array.isArray(data.placements)) throw new Error('无效的排布文件');
  const next = { ...defaults(mode), ...data, mode };
  next.allowFlip = next.allowFlip !== false;
  next.restrictions ??= {};
  next.placements = next.placements.map(p => ({ piece: p.piece, orientation: p.orientation, origin: p.origin, locked: p.locked !== false }));
  validatePlacements(shapes, mode, next.placements, next.allowFlip, next.restrictions);
  if (!shapes.some(s => s.id === next.selected)) next.selected = 1;
  if (!orientationsFor(shapes.find(s => s.id === next.selected), mode, next.allowFlip).some(o => o.key === next.orientation)) next.orientation = orientationsFor(shapes.find(s => s.id === next.selected), mode, next.allowFlip)[0].key;
  if (!Array.isArray(next.origin) || next.origin.length !== 3 || !next.origin.every(Number.isInteger)) next.origin = [0, 0, 0];
  if (!Number.isInteger(next.layer) || next.layer < 0 || next.layer > 5) next.layer = 0;
  if (!['three', 'layer'].includes(next.view)) next.view = 'three';
  if (!Number.isFinite(next.cut) || next.cut < 1 || next.cut > 6) next.cut = 6;
  if (!Number.isFinite(next.explode) || next.explode < 0 || next.explode > 100) next.explode = 0;
  const active = next.placements.find(p => p.piece === next.selected);
  if (active && !Object.hasOwn(data, 'origin')) next.origin = [...active.origin];
  if (active && !Object.hasOwn(data, 'orientation')) next.orientation = active.orientation;
  return next;
}
try {
  const mode = localStorage.getItem('hexomino-last-mode') === 'cube' ? 'cube' : 'flat';
  const data = localStorage.getItem(`hexomino-v1-${mode}`);
  state = data ? readState(mode, JSON.parse(data)) : defaults(mode);
} catch { toast('上次的本地排布无法读取，已打开空棋盘。'); }
function remember() {
  history[state.mode].push(clone(state));
  if (history[state.mode].length > 100) history[state.mode].shift();
}
function selectedShape() { return shapes.find(s => s.id === state.selected); }
function currentOrientation() { return orientationsFor(selectedShape(), state.mode, state.allowFlip).find(o => o.key === state.orientation); }
function candidate(origin = state.origin) { return { piece: state.selected, orientation: state.orientation, origin: [...origin], locked: true }; }
function validCandidate(p) {
  const restrictions = { ...state.restrictions };
  if (restrictions[p.piece]) restrictions[p.piece] = [p.orientation];
  try { validatePlacements(shapes, state.mode, [...state.placements.filter(q => q.piece !== p.piece), p], state.allowFlip, restrictions); return true; }
  catch { return false; }
}
function thumbnail(cells, id) {
  const src = thumbnailImages.get(id);
  return src ? `<img src="${src}" alt="${shapes.find(s => s.id === id).name} STL 模型" draggable="false">` : '<span class="thumbnail-loading" aria-hidden="true">···</span>';
}
function renderPalette() {
  const filter = $('palette-filter').value;
  const shown = shapes.filter(s => {
    const p = state.placements.find(p => p.piece === s.id);
    return filter === 'all' || (filter === 'unused' && !p) || (filter === 'fixed' && p?.locked);
  });
  $('palette-count').textContent = shown.length;
  $('pieces').innerHTML = shown.map(s => {
    const p = state.placements.find(p => p.piece === s.id);
    return `<button class="piece-card ${s.id === state.selected ? 'active' : ''} ${p ? 'placed' : ''} ${p?.locked ? 'fixed' : ''}" data-piece="${s.id}" draggable="${!busy}" aria-label="选择 ${s.name}${p?.locked ? '，已固定' : p ? '，已放置' : ''}" aria-pressed="${s.id === state.selected}">${thumbnail(s.cells, s.id)}<span class="piece-name">${s.name}</span><span class="piece-cells">${s.cell_count}</span></button>`;
  }).join('');
}
async function ensureViewer(kind) {
  if (viewers.has(kind)) return viewers.get(kind);
  if (!viewerPromises.has(kind)) viewerPromises.set(kind, import('./viewer.js').then(({ PuzzleViewer }) => {
    const container = $(kind === 'flat' ? 'board-flat' : kind === 'layer' ? 'board-layer' : 'three-view');
    const instance = new PuzzleViewer(container, shapes, {
      pick: id => selectPiece(id, true, kind === 'layer'), preview, place, busy: () => busy,
      canPreview: () => !state.placements.some(p => p.piece === state.selected),
    }, { mode: kind === 'flat' ? 'flat' : 'cube', planar: kind !== 'cube', layerView: kind === 'layer' });
    viewers.set(kind, instance);
    if (kind === 'cube') viewer = instance;
    return instance;
  }).catch(error => { viewerPromises.delete(kind); throw error; }));
  return viewerPromises.get(kind);
}
function renderViews() {
  const kind = state.mode === 'flat' ? 'flat' : state.view === 'three' ? 'cube' : 'layer';
  ensureViewer(kind).then(v => { v.resize(); return v.update(state.placements, state.selected, ghost, state); }).catch(error => {
    toast(`STL 视图加载失败：${error.message}。请检查浏览器是否支持 WebGL。`);
  });
}
async function loadThumbnails() {
  try {
    const { pieceThumbnail } = await import('./viewer.js');
    await Promise.all(shapes.map(async shape => {
      thumbnailImages.set(shape.id, await pieceThumbnail(shape));
    }));
    renderPalette();
    $('selected-thumbnail').innerHTML = thumbnail(selectedShape().cells, state.selected);
  } catch (error) {
    if (!thumbnailErrorShown) { thumbnailErrorShown = true; toast(`STL 缩略图加载失败：${error.message}`); }
  }
}
function render(repaintPalette = true) {
  const cube = state.mode === 'cube', p = state.placements.find(p => p.piece === state.selected), o = currentOrientation();
  $('mode-flat').setAttribute('aria-selected', !cube);
  $('mode-cube').setAttribute('aria-selected', cube);
  $('board-kicker').textContent = cube ? 'THE SPATIAL CHALLENGE' : 'THE FLAT CHALLENGE';
  $('board-title').textContent = cube ? '6 × 6 × 6 立体堆叠' : '12 × 18 平面拼图';
  $('board-flat').hidden = cube;
  $('cube-tools').hidden = !cube;
  $('three-view').hidden = !cube || state.view !== 'three';
  $('board-layer').hidden = !cube || state.view !== 'layer';
  $('board-layer').classList.add('layer');
  $('view-three').classList.toggle('active', state.view === 'three');
  $('view-layer').classList.toggle('active', state.view === 'layer');
  $('stage-label').textContent = cube ? `X → · Y ↑ · Z 为高度 · 放置层 Z = ${state.layer}` : '18 列 × 12 行 · 每块只用一次';
  $('board-help').textContent = cube ? (state.view === 'three' ? '拖动拼块移动 · 拖动空白处转动 · 滚轮缩放' : '拖放到当前层 · R 绕 Z 旋转 · Delete 移除') : 'R 旋转 · F 翻面 · Delete 移除';
  const filled = state.placements.reduce((s, p) => s + shapes.find(s => s.id === p.piece).cells.length, 0);
  $('fill-count').textContent = `${filled} / 216 格`;
  $('fill-bar').style.width = `${filled / 216 * 100}%`;
  $('fixed-count').textContent = `${state.placements.filter(p => p.locked).length} 块固定`;
  $('selected-thumbnail').innerHTML = thumbnail(selectedShape().cells, state.selected);
  $('selected-name').textContent = selectedShape().name;
  $('selected-size').textContent = `${selectedShape().cell_count} 格 · ${o.size.join(' × ')}`;
  const pending = p && (p.orientation !== state.orientation || p.origin.some((v, a) => v !== state.origin[a]));
  $('selection-status').textContent = pending ? '待应用' : p?.locked ? '已固定' : p ? '求解结果' : '未放置';
  $('selection-status').classList.toggle('fixed', !!p?.locked && !pending);
  for (const [a, axis] of ['x', 'y', 'z'].entries()) { $(`pos-${axis}`).value = state.origin[a]; $(`pos-${axis}`).max = BOARDS[state.mode][a] - 1; }
  $('pos-z').disabled = !cube || busy;
  $('rotate-x').hidden = $('rotate-y').hidden = !cube;
  $('flip-piece').hidden = cube;
  $('rotate-z').textContent = cube ? '↻ Z' : '↻ 旋转 90°';
  $('flip-label').hidden = cube;
  $('allow-flip').checked = state.allowFlip;
  $('view-options').hidden = !cube;
  $('visible-level').textContent = state.cut;
  $('layer-cut').value = state.cut;
  $('explode').value = state.explode;
  $('layer-select').value = state.layer;
  $('place-btn').textContent = p ? '应用位置并固定' : '＋ 放置并固定';
  $('piece-locked').checked = !!p?.locked;
  $('piece-locked').disabled = !p || busy;
  $('remove-btn').disabled = !p || busy;
  $('orientation-only').checked = !!state.restrictions[state.selected];
  $('undo-btn').disabled = !history[state.mode].length || busy;
  $('solve-btn').hidden = busy;
  $('stop-btn').hidden = !busy;
  for (const id of ['place-btn', 'rotate-x', 'rotate-y', 'rotate-z', 'flip-piece', 'pos-x', 'pos-y', 'orientation-only', 'allow-flip', 'lock-all', 'clear-result', 'clear-all', 'example-btn', 'import-btn']) $(id).disabled = busy;
  document.body.classList.toggle('busy', busy);
  if (repaintPalette) renderPalette();
  renderViews(); save();
}
function selectPiece(id, repaintPalette = true, preserveLayer = false) {
  if (busy) return;
  const piece = shapes.find(s => s.id === Number(id));
  if (!piece) return;
  state.selected = piece.id;
  const p = state.placements.find(p => p.piece === piece.id);
  state.orientation = p?.orientation ?? orientationsFor(piece, state.mode, state.allowFlip)[0].key;
  state.origin = p ? [...p.origin] : [0, 0, state.mode === 'cube' ? state.layer : 0];
  if (p && state.mode === 'cube' && !preserveLayer) state.layer = p.origin[2];
  ghost = null;
  if (repaintPalette) render();
  else {
    // Keep the native drag source in the document for the duration of dragstart.
    render(false);
    for (const b of $('pieces').children) b.classList.toggle('active', Number(b.dataset.piece) === piece.id);
  }
}
function preview(origin) {
  if (busy) return;
  ghost = origin ? { ...candidate(origin), valid: validCandidate(candidate(origin)) } : null;
  renderViews();
}
function place(origin = state.origin) {
  if (busy) return;
  const p = candidate(origin);
  const restrictions = { ...state.restrictions };
  if (restrictions[p.piece]) restrictions[p.piece] = [p.orientation];
  try { validatePlacements(shapes, state.mode, [...state.placements.filter(q => q.piece !== p.piece), p], state.allowFlip, restrictions); }
  catch (error) { ghost = null; renderViews(); toast(error.message); return; }
  remember();
  state.restrictions = restrictions;
  state.placements = [...state.placements.filter(q => q.piece !== p.piece), p];
  state.origin = [...origin];
  if (state.mode === 'cube') state.layer = state.view === 'layer' ? Math.min(Math.max(state.layer, origin[2]), origin[2] + currentOrientation().size[2] - 1) : origin[2];
  ghost = null; render();
}
function rotate(axis) {
  if (busy) return;
  const next = turnedOrientation(selectedShape(), currentOrientation(), axis, state.mode, state.allowFlip);
  if (next.key === state.orientation && axis !== 2 && state.mode === 'flat') { toast('当前已关闭平面翻面。'); return; }
  remember();
  state.orientation = next.key;
  const placed = state.placements.find(p => p.piece === state.selected);
  if (!placed && state.restrictions[state.selected]) state.restrictions[state.selected] = [next.key];
  if (placed && validCandidate(candidate())) {
    placed.orientation = next.key; placed.origin = [...state.origin]; placed.locked = true;
    if (state.restrictions[state.selected]) state.restrictions[state.selected] = [next.key];
    ghost = null; render(); return;
  }
  ghost = { ...candidate(), valid: validCandidate(candidate()) };
  render();
}
function removeSelected() {
  if (busy || !state.placements.some(p => p.piece === state.selected)) return;
  remember(); state.placements = state.placements.filter(p => p.piece !== state.selected); ghost = null; render();
}
function status(text, kind = '') { $('status-text').textContent = text; $('solver-status').className = `solver-status ${kind}`; }
function stop(notify = true) {
  worker?.terminate(); worker = null; clearInterval(timer);
  if (busy && notify) status('已停止，尚未确定是否有解', 'error');
  busy = false; render();
}
function switchMode(mode) {
  if (state.mode === mode) return;
  stop(false); save(); ghost = null;
  try { const stored = localStorage.getItem(`hexomino-v1-${mode}`); state = stored ? readState(mode, JSON.parse(stored)) : defaults(mode); }
  catch { state = defaults(mode); }
  status('等待你的第一块拼图'); render();
}
function stats(progress) {
  $('search-depth').textContent = `${progress.maxDepth ?? state.placements.length} / 37`;
  $('search-nodes').textContent = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(progress.nodes ?? 0);
  $('search-time').textContent = `${((progress.elapsedMs ?? 0) / 1000).toFixed(1)} s`;
  $('search-bar').style.width = `${(progress.maxDepth ?? 0) / 37 * 100}%`;
}
function solve() {
  if (busy) return;
  try { validatePlacements(shapes, state.mode, state.placements.filter(p => p.locked), state.allowFlip, state.restrictions); }
  catch (error) { toast(error.message); return; }
  remember(); state.placements = state.placements.filter(p => p.locked); ghost = null;
  busy = true; render(); stats({ maxDepth: state.placements.length });
  status(`保留 ${state.placements.length} 块固定条件，准备搜索…`, 'working');
  started = performance.now();
  timer = setInterval(() => { $('search-time').textContent = `${((performance.now() - started) / 1000).toFixed(1)} s`; }, 200);
  worker = new Worker(new URL('./solver-worker.js', import.meta.url), { type: 'module' });
  const currentWorker = worker;
  const fail = message => { stop(false); status(message, 'error'); };
  worker.onerror = event => { event.preventDefault(); fail('求解器运行失败，请重试或查看浏览器控制台'); };
  worker.onmessage = ({ data }) => {
    if (worker !== currentWorker) return;
    if (data.type === 'progress') { stats(data); status(data.phase === 'prepare' ? '正在准备合法放置方式…' : `正在搜索 · 固定 ${state.placements.length} 块`, 'working'); }
    if (data.type === 'error') fail(data.message);
    if (data.type === 'result') {
      stop(false); stats(data);
      if (data.status === 'solved') {
        try {
          const covered = validatePlacements(shapes, state.mode, data.solution, state.allowFlip, state.restrictions);
          if (covered.size !== 216 || data.solution.length !== 37) throw new Error('求解结果未完整覆盖棋盘');
          state.placements = data.solution; ghost = null; selectPiece(state.selected);
          status('找到完整解 · 37 块恰好覆盖 216 格', 'solved');
        } catch (error) { fail(error.message); }
      } else if (data.status === 'unsatisfiable') status('已确认无解：当前固定条件无法完成拼图', 'error');
      else status('达到时间上限，尚未确定是否有解；可延长搜索时间', 'error');
    }
  };
  worker.postMessage({ shapes, mode: state.mode, placements: state.placements, restrictions: state.restrictions, allowFlip: state.allowFlip, timeLimitMs: Number($('time-limit').value) });
}

$('pieces').addEventListener('click', e => { const b = e.target.closest('[data-piece]'); if (b) selectPiece(Number(b.dataset.piece)); });
$('pieces').addEventListener('dragstart', e => {
  const b = e.target.closest('[data-piece]');
  if (busy || !b) { e.preventDefault(); return; }
  selectPiece(Number(b.dataset.piece), false);
  e.dataTransfer.setData('text/plain', b.dataset.piece);
  e.dataTransfer.effectAllowed = 'move';
});
$('pieces').addEventListener('dragend', () => preview(null));
$('palette-filter').onchange = renderPalette;
$('rotate-z').onclick = () => rotate(2);
$('rotate-x').onclick = () => rotate(0);
$('rotate-y').onclick = () => rotate(1);
$('flip-piece').onclick = () => rotate(0);
$('place-btn').onclick = () => place();
$('remove-btn').onclick = removeSelected;
for (const [a, axis] of ['x', 'y', 'z'].entries()) $(`pos-${axis}`).onchange = () => {
  const v = Number($(`pos-${axis}`).value);
  if (!Number.isInteger(v)) { toast('坐标必须是整数'); render(); return; }
  state.origin[a] = v; ghost = { ...candidate(), valid: validCandidate(candidate()) }; render();
};
$('piece-locked').onchange = () => { remember(); state.placements.find(p => p.piece === state.selected).locked = $('piece-locked').checked; render(); };
$('orientation-only').onchange = () => {
  const restrictions = { ...state.restrictions };
  if ($('orientation-only').checked) restrictions[state.selected] = [state.orientation]; else delete restrictions[state.selected];
  try { validatePlacements(shapes, state.mode, state.placements, state.allowFlip, restrictions); }
  catch { toast('请先应用当前朝向，再设置限制。'); render(); return; }
  remember(); state.restrictions = restrictions; render();
};
$('allow-flip').onchange = () => {
  const allow = $('allow-flip').checked;
  try { validatePlacements(shapes, state.mode, state.placements, allow, state.restrictions); }
  catch { $('allow-flip').checked = state.allowFlip; toast('现有排布或朝向条件需要翻面，请先移除相关拼块或限制。'); return; }
  remember(); state.allowFlip = allow;
  if (!orientationsFor(selectedShape(), state.mode, allow).some(o => o.key === state.orientation)) state.orientation = orientationsFor(selectedShape(), state.mode, allow)[0].key;
  ghost = null; render();
};
$('mode-flat').onclick = () => switchMode('flat');
$('mode-cube').onclick = () => switchMode('cube');
$('view-three').onclick = () => { state.view = 'three'; ghost = null; render(); };
$('view-layer').onclick = () => { state.view = 'layer'; ghost = null; render(); };
$('layer-select').onchange = () => { state.layer = Number($('layer-select').value); if (!state.placements.some(p => p.piece === state.selected)) state.origin[2] = state.layer; ghost = null; render(); };
$('layer-cut').oninput = () => { state.cut = Number($('layer-cut').value); render(); };
$('explode').oninput = () => { state.explode = Number($('explode').value); render(); };
$('reset-camera').onclick = () => viewer?.resetCamera();
$('lock-all').onclick = () => { remember(); state.placements.forEach(p => { p.locked = true; }); render(); };
$('clear-result').onclick = () => { remember(); state.placements = state.placements.filter(p => p.locked); ghost = null; render(); };
$('clear-all').onclick = () => { remember(); state.placements = []; state.restrictions = {}; ghost = null; status('棋盘已清空，可以撤销'); render(); };
$('undo-btn').onclick = () => { if (busy) return; const previous = history[state.mode].pop(); if (previous) { state = previous; ghost = null; render(); status('已撤销上一步'); } };
$('solve-btn').onclick = solve;
$('stop-btn').onclick = () => stop();
$('export-btn').onclick = () => {
  const data = { version: 1, ...state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `hexomino-${state.mode}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import-btn').onclick = () => $('import-file').click();
$('import-file').onchange = async () => {
  const file = $('import-file').files[0];
  try {
    if (!file) return;
    if (file.size > 1_000_000) throw new Error('排布文件过大');
    const data = JSON.parse(await file.text());
    if (data.version !== 1) throw new Error('不支持的排布版本');
    const next = readState(data.mode, data);
    stop(false); save();
    if (state.mode !== next.mode) switchMode(next.mode);
    remember(); state = next; ghost = null; render(); status('已导入排布与约束'); toast('排布已导入');
  } catch (error) { toast(`导入失败：${error.message}`); }
  $('import-file').value = '';
};
$('example-btn').onclick = async () => {
  try {
    const response = await fetch(`./examples/${state.mode}.json`);
    if (!response.ok) throw new Error('示例解暂不可用，请使用求解器');
    const data = await response.json(), next = readState(state.mode, data);
    remember(); state = next; ghost = null; selectPiece(state.selected); status('已载入经验证的示例解；点击拼块可固定条件后重算', 'solved');
  } catch (error) { toast(error.message); }
};
document.addEventListener('keydown', e => {
  if (e.target.closest('input,select,textarea') || busy) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('undo-btn').click(); }
  else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'r') { e.preventDefault(); rotate(2); }
  else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'f' && state.mode === 'flat') { e.preventDefault(); rotate(0); }
  else if (['Delete', 'Backspace'].includes(e.key)) { e.preventDefault(); removeSelected(); }
});
render();
loadThumbnails();
