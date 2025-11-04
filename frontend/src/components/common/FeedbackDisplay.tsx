import { CheckCircle, XCircle } from "lucide-react";

interface FeedbackDisplayProps {
  type: "correct" | "incorrect" | null;
  message: string | null;
}

const FeedbackDisplay = ({ type, message }: FeedbackDisplayProps) => {
  if (!type || !message) {
    return null; // Don't render anything if there's no feedback
  }

  const isCorrect = type === "correct";

  const baseClasses = "p-4 rounded-lg my-4 flex items-center gap-2";
  const successClasses = "bg-green-100 border border-green-400 text-green-700";
  const errorClasses = "bg-red-100 border border-red-400 text-red-700";

  return (
    <div
      className={`${baseClasses} ${isCorrect ? successClasses : errorClasses}`}
      role="alert"
    >
      {isCorrect ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <XCircle className="w-5 h-5" />
      )}
      <span className="font-semibold">{message}</span>
    </div>
  );
};

export default FeedbackDisplay;
