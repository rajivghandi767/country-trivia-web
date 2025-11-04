import { useState, useEffect } from 'react';

// Storage key for theme preference
const THEME_STORAGE_KEY = 'rajivwallace-theme-preference';

/**
 * Custom hook to manage theme state (dark/light mode)
 * @returns Object containing isDarkMode state and toggleTheme function
 */
const useTheme = () => {
  // Initialize state from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Try to get from localStorage first
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        return savedTheme === 'dark';
      }

      // Fall back to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Default to light mode if not on client
    return false;
  });

  // Apply theme effect
  useEffect(() => {
    // Find the HTML element
    const htmlElement = document.documentElement;

    if (isDarkMode) {
      // Apply dark mode
      htmlElement.classList.add('dark');

      // For AMOLED optimization, add a custom data attribute
      htmlElement.setAttribute('data-amoled', 'true');

      // Store preference
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      // Remove dark mode
      htmlElement.classList.remove('dark');

      // Remove AMOLED attribute
      htmlElement.removeAttribute('data-amoled');

      // Store preference
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(isDarkMode);
    
    // Setup listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if the user hasn't set a preference
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setIsDarkMode(e.matches);
      }
    };
    
    // Add event listener with modern API
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isDarkMode]);

  // Update meta theme-color for mobile browsers
  const updateMetaThemeColor = (dark: boolean) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        dark ? '#000000' : '#ffffff'
      );
    } else {
      // Create the meta tag if it doesn't exist
      const newMetaThemeColor = document.createElement('meta');
      newMetaThemeColor.name = 'theme-color';
      newMetaThemeColor.content = dark ? '#000000' : '#ffffff';
      document.head.appendChild(newMetaThemeColor);
    }
  };

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return { isDarkMode, toggleTheme };
};

export default useTheme;