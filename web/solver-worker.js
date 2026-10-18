import { solvePuzzle } from './puzzle.js';

self.onmessage = ({ data }) => {
  try {
    const result = solvePuzzle({ ...data, onProgress: progress => self.postMessage({ type: 'progress', ...progress }) });
    self.postMessage({ type: 'result', ...result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
