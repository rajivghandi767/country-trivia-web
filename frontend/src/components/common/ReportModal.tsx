import { useState } from "react";
import apiService from "@/api/apiService";
import { BugReportPayload } from "@/types";
import { Button } from "./Button";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryName?: string;
  questionId?: number;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  countryName,
  questionId,
}) => {
  const [issueType, setIssueType] =
    useState<BugReportPayload["issue_type"]>("fact_error");
  const [userNote, setUserNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await apiService.reports.submitIssue({
      issue_type: issueType,
      user_note: userNote,
      country_name: countryName,
      question_id: questionId,
    });

    setIsSubmitting(false);

    if (!result.error) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setUserNote("");
      }, 2000);
    } else {
      alert("Failed to send report. Please try again later.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-bg-light dark:bg-bg-dark text-brand-light dark:text-brand-dark border border-gray-200 dark:border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative transition-colors duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Close modal"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Report an Issue</h2>

        {success ? (
          <div className="text-emerald-600 dark:text-emerald-400 font-medium text-center py-6 animate-fade-in">
            Thanks for the heads up! We'll look into it.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">
                What's wrong?
              </label>
              <select
                value={issueType}
                onChange={(e) =>
                  setIssueType(e.target.value as BugReportPayload["issue_type"])
                }
                className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-bg-light dark:bg-bg-dark text-brand-light dark:text-brand-dark p-2.5 focus:outline-none focus:border-brand-light dark:focus:border-brand-dark focus:ring-1 focus:ring-brand-light dark:focus:ring-brand-dark transition-colors"
              >
                <option value="fact_error">The fact or answer is wrong</option>
                <option value="typo">Typo or grammar mistake</option>
                <option value="ui_bug">Something looks broken</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">
                Details
              </label>
              <textarea
                required
                rows={3}
                placeholder="What should it say instead?"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-bg-light dark:bg-bg-dark text-brand-light dark:text-brand-dark p-2.5 focus:outline-none focus:border-brand-light dark:focus:border-brand-dark focus:ring-1 focus:ring-brand-light dark:focus:ring-brand-dark resize-none transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit Report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
