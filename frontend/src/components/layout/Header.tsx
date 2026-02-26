import { Sun, Moon } from "lucide-react";
import { useThemeContext } from "../../context/ThemeContext";
import { ProjectSwitcher } from "./ProjectSwitcher";

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <button
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

const Header = () => {
  return (
    <div className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-gray-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 py-3 relative flex items-center justify-center min-h-15">
        {/* Left side: Project Switcher */}
        <div className="absolute left-4 flex items-center">
          <ProjectSwitcher align="left" />
        </div>

        {/* Center: Title (wrapped and padded) */}
        <div className="text-center w-full px-20">
          <h1 className="text-lg md:text-2xl font-bold leading-tight">
            Country Trivia by Rajiv Wallace
          </h1>
        </div>

        {/* Right side: Theme Toggle */}
        <div className="absolute right-4 flex items-center">
          <ThemeToggleButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
