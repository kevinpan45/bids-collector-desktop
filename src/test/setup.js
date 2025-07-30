// Test setup file
import { vi } from 'vitest';

// Mock Tauri APIs for testing
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn()
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
