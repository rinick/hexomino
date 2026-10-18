import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Matrix4 } from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { BOARDS, CELL_MM, orientationsFor, turnedOrientation, placementCells, validatePlacements, solvePuzzle } from '../web/puzzle.js';

const shapes = JSON.parse(readFileSync(new URL('../shapes.json', import.meta.url)));
const example = mode => JSON.parse(readFileSync(new URL(`../examples/${mode}.json`, import.meta.url)));

function assertComplete(result, mode, fixed = [], restrictions = {}) {
  assert.equal(result.status, 'solved');
  assert.equal(result.solution.length, 37);
  assert.equal(validatePlacements(shapes, mode, result.solution, true, restrictions).size, 216);
  for (const p of fixed) {
    const found = result.solution.find(q => q.piece === p.piece);
    assert.deepEqual(found.origin, p.origin);
    assert.equal(found.orientation, p.orientation);
    assert.equal(found.locked, true);
  }
}

test('orientations are unique proper rotations; flat flip is a physical half-turn', () => {
  assert.equal(shapes.reduce((n, s) => n + s.cells.length, 0), 216);
  const chiral = shapes[0];
  assert.equal(orientationsFor(chiral, 'flat', false).length, 4);
  assert.equal(orientationsFor(chiral, 'flat', true).length, 8);
  const original = orientationsFor(chiral, 'flat')[0];
  const reflected = turnedOrientation(chiral, original, 0, 'flat');
  assert.notEqual(reflected.key, original.key);
  assert.equal(turnedOrientation(chiral, reflected, 0, 'flat').key, original.key);
  for (const s of shapes) {
    const os = orientationsFor(s, 'cube');
    assert.equal(new Set(os.map(o => o.key)).size, os.length);
    for (const o of os) {
      const m = o.matrix;
      const matrix = new Matrix4().set(...m[0], 0, ...m[1], 0, ...m[2], 0, 0, 0, 0, 1);
      assert.equal(matrix.determinant(), 1);
      assert.equal(o.cells.length, s.cells.length);
      assert.ok(o.size.every(v => v >= 1 && v <= 6));
    }
  }
});

test('real STL geometry transforms to exactly the occupied cell bounds', () => {
  const s = shapes[0];
  const bytes = readFileSync(new URL(`../STL_37/${s.name}.stl`, import.meta.url));
  const geometry = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  geometry.scale(1 / CELL_MM, 1 / CELL_MM, 1 / CELL_MM);
  for (const o of orientationsFor(s, 'cube')) {
    const m = o.matrix, t = o.offset;
    const transformed = geometry.clone().applyMatrix4(new Matrix4().set(...m[0], t[0], ...m[1], t[1], ...m[2], t[2], 0, 0, 0, 1));
    transformed.computeBoundingBox();
    for (const [a, axis] of ['x', 'y', 'z'].entries()) {
      assert.ok(Math.abs(transformed.boundingBox.min[axis]) < 0.00001);
      assert.ok(Math.abs(transformed.boundingBox.max[axis] - o.size[a]) < 0.00001);
    }
    transformed.dispose();
  }
});

test('both example solutions cover every cell once and use all 37 pieces', () => {
  for (const mode of ['flat', 'cube']) {
    const data = example(mode);
    assert.equal(validatePlacements(shapes, mode, data.placements).size, BOARDS[mode].reduce((a, b) => a * b));
    assert.equal(new Set(data.placements.map(p => p.piece)).size, 37);
  }
});

test('reject duplicate, overlapping, out-of-bounds and invalid orientation constraints', () => {
  const p = example('flat').placements[0];
  assert.throws(() => validatePlacements(shapes, 'flat', [p, p]), /重复/);
  assert.throws(() => validatePlacements(shapes, 'flat', [{ ...p, origin: [-1, 0, 0] }]), /边界/);
  assert.throws(() => validatePlacements(shapes, 'flat', [{ ...p, origin: [0.2, 0, 0] }]), /整数/);
  assert.throws(() => validatePlacements(shapes, 'flat', [], true, { 1: ['unknown'] }), /限制无效/);
  assert.throws(() => validatePlacements(shapes, 'flat', [{ ...p, orientation: 'unknown' }]), /朝向/);
  const a = { piece: 1, orientation: orientationsFor(shapes[0], 'flat')[0].key, origin: [0, 0, 0] };
  const b = { piece: 4, orientation: orientationsFor(shapes[3], 'flat')[0].key, origin: [0, 0, 0] };
  assert.throws(() => validatePlacements(shapes, 'flat', [a, b]), /重叠/);
});

test('find a complete flat solution from an empty board', () => {
  assertComplete(solvePuzzle({ shapes, mode: 'flat', timeLimitMs: 30000 }), 'flat');
});

test('find a complete spatial solution from an empty board', () => {
  assertComplete(solvePuzzle({ shapes, mode: 'cube', timeLimitMs: 60000 }), 'cube');
});

test('solve the remainder of either board while preserving fixed positions and orientation limits', () => {
  for (const mode of ['flat', 'cube']) {
    const placements = example(mode).placements.slice(0, 32).map(p => ({ ...p, locked: true }));
    const last = example(mode).placements[32];
    const restrictions = { [last.piece]: [last.orientation] };
    assertComplete(solvePuzzle({ shapes, mode, placements, restrictions, timeLimitMs: 10000 }), mode, placements, restrictions);
  }
});

test('a valid fixed piece isolating the corner cell proves unsatisfiability', () => {
  let fixed;
  for (const s of shapes) for (const o of orientationsFor(s, 'flat')) {
    const has = (x, y) => o.cells.some(c => c[0] === x && c[1] === y);
    if (!has(0, 0) && has(1, 0) && has(0, 1)) fixed = { piece: s.id, orientation: o.key, origin: [0, 0, 0], locked: true };
  }
  assert.ok(fixed);
  validatePlacements(shapes, 'flat', [fixed]);
  assert.equal(solvePuzzle({ shapes, mode: 'flat', placements: [fixed] }).status, 'unsatisfiable');
});

test('a search budget reports unknown timeout, never unsatisfiable', () => {
  assert.equal(solvePuzzle({ shapes, mode: 'cube', timeLimitMs: 0.001 }).status, 'timeout');
});

test('a fully fixed valid solution succeeds, without adding pieces', () => {
  const placements = example('cube').placements.map(p => ({ ...p, locked: true }));
  assertComplete(solvePuzzle({ shapes, mode: 'cube', placements }), 'cube', placements);
  assert.equal(placementCells(placements[0], shapes, 'cube').length, shapes.find(s => s.id === placements[0].piece).cells.length);
});
