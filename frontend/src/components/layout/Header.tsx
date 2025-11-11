import { Sun, Moon } from "lucide-react";
import { useThemeContext } from "../../context/ThemeContext";

// We can define the theme toggle button right in here
// since it's the only thing the header will do.
const ThemeToggleButton = () => {
  const { isDarkMode, toggleTheme } = useThemeContext();

  return (
    <button
      className="btn btn-primary p-2 rounded-lg"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

const Header = () => {
  return (
    <div className="sticky top-0 z-50 bg-[var(--background)] border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: Theme Toggle */}
          <div className="w-14">
            <ThemeToggleButton />
          </div>

          {/* Center: Title */}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold">
              <span>Country Trivia by Rajiv Wallace</span>
            </h1>
          </div>

          {/* Right side: Spacer to keep title centered */}
          <div className="w-14" />
        </div>
      </div>
    </div>
  );
};

export default Header;
