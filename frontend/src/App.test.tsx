import { render } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import App from './App';

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn()
});

describe('App Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
