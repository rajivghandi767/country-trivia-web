// src/context/ThemeContext.tsx
import { createContext, useContext, ReactNode } from "react";
import useTheme from "@/hooks/useTheme";

// Theme context type
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Props type for the provider
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider component to wrap the application
 * Provides theme state and toggle function to all children
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Use our custom hook
  const themeValues = useTheme();

  return (
    <ThemeContext.Provider value={themeValues}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to use the theme context
 * @returns Theme context values (isDarkMode and toggleTheme)
 */
export const useThemeContext = () => useContext(ThemeContext);

export default ThemeContext;
