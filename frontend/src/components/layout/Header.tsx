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
    <div className="sticky top-0 z-50 bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between min-h-15">
        {/* LEFT ZONE: Fixed w-24 pillar for symmetry */}
        <div className="flex items-center justify-start w-24">
          <ProjectSwitcher align="left" />
        </div>

        {/* CENTER ZONE: flex-1 ensures it wraps naturally instead of truncating */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-lg md:text-2xl font-bold leading-tight text-black dark:text-white">
            Country Trivia by Rajiv Wallace
          </h1>
        </div>

        {/* RIGHT ZONE: Fixed w-24 pillar */}
        <div className="flex items-center justify-end w-24">
          <ThemeToggleButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
