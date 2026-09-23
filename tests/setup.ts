import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

// singleFork runs all tests in one process; ensure real timers around each test
// so fake timers from one file do not break waitFor/render in later files.
beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
