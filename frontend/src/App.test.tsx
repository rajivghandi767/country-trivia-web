import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

describe('App Component', () => {
  test('renders without crashing', () => {
    const { container } = render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(container).toBeDefined();
  });
});
