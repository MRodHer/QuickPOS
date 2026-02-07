import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Setup React for Zustand tests
beforeAll(() => {
  // Ensure React is available
  global.React = React;
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage with actual storage simulation
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
        order: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
    })),
  },
}));
