import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// singleFork runs all tests in one process; restore real timers after each test
// so fake timers from one file do not break waitFor/render in later files.
afterEach(() => {
  vi.useRealTimers();
});
