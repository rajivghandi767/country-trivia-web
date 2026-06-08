import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Header from './Header';

vi.mock('./ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher" />
}));

vi.mock('../../context/ThemeContext', () => ({
  useThemeContext: () => ({ theme: 'light', toggleTheme: vi.fn() })
}));

describe('Header Component', () => {
  test('renders the title correctly', () => {
    render(<Header />);
    expect(screen.getByText('Country Trivia by Rajiv Wallace')).toBeDefined();
    expect(screen.getByTestId('project-switcher')).toBeDefined();
  });
});
