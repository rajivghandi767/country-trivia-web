import React, { useState, useEffect, useRef } from "react";

interface ToolTipProps {
  text: string;
}

export const ToolTip: React.FC<ToolTipProps> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <button
      type="button"
      ref={tooltipRef}
      className="relative inline-flex items-center justify-center cursor-help focus:outline-none"
      onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) {
          setIsOpen(false);
        }
      }}
    >
      {/* Question Mark Icon */}
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-800 text-black dark:text-white text-xs font-bold transition-colors hover:bg-gray-300 dark:hover:bg-neutral-700">
        ?
      </div>

      {/* Tooltip Popup Content (Now strictly centered and width-limited) */}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 max-w-[85vw] p-2.5 bg-black dark:bg-white text-white dark:text-black text-xs text-center rounded-lg shadow-xl z-50 transition-all duration-200 ${
          isOpen
            ? "opacity-100 visible translate-y-0"
            : "opacity-0 invisible translate-y-1 pointer-events-none"
        }`}
      >
        {text}
        {/* Caret pointing down at the question mark */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-white"></div>
      </div>
    </button>
  );
};
