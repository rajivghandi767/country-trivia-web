import { CheckCircle, XCircle, Info } from "lucide-react";

interface ResultDisplayProps {
  type: "correct" | "incorrect" | null;
  message: string | null;
}

const ResultDisplay = ({ type, message }: ResultDisplayProps) => {
  if (!message) return null;

  const isCorrect = type === "correct";
  const isSkipped = type === null;

  const baseClasses =
    "p-4 rounded-lg my-4 flex items-center gap-2 border font-mono";
  const successClasses =
    "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400";
  const errorClasses =
    "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400";
  const skipClasses =
    "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400";

  return (
    <div
      className={`${baseClasses} ${isCorrect ? successClasses : isSkipped ? skipClasses : errorClasses}`}
      role="alert"
    >
      {isCorrect ? (
        <CheckCircle className="w-5 h-5 shrink-0" />
      ) : isSkipped ? (
        <Info className="w-5 h-5 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 shrink-0" />
      )}
      <span className="font-semibold text-sm">{message}</span>
    </div>
  );
};

export default ResultDisplay;
