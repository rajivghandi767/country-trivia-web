interface ToolTipProps {
  text: string;
}

export const ToolTip: React.FC<ToolTipProps> = ({ text }) => {
  return (
    <div className="relative group inline-flex items-center justify-center cursor-help">
      {/* The Permanent Trigger Icon: A solid, visible circle with a ? */}
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:text-blue-600 dark:group-hover:text-blue-300">
        ?
      </div>

      {/* The Tooltip Bubble */}
      <div className="absolute bottom-full mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs text-center rounded shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none">
        {text}
        {/* The little downward pointing arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
      </div>
    </div>
  );
};
