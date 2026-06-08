import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Header from './Header';
import { ThemeContext } from '../../context/ThemeContext';

vi.mock('./ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher" />
}));

describe('Header Component', () => {
  test('renders the title correctly', () => {
    render(
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: vi.fn() }}>
        <Header />
      </ThemeContext.Provider>
    );
    expect(screen.getByText('Country Trivia by Rajiv Wallace')).toBeDefined();
    expect(screen.getByTestId('project-switcher')).toBeDefined();
  });
});
