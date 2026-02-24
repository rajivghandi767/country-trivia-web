import { cn } from "@/utils/styleUtils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  ...props
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-gray-100 focus:ring-slate-400 dark:focus:ring-gray-400",
    secondary:
      "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 focus:ring-slate-300 dark:focus:ring-zinc-700",
    outline:
      "border-2 border-slate-200 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-900 focus:ring-slate-200 dark:focus:ring-zinc-800",
    ghost:
      "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 focus:ring-slate-100 dark:focus:ring-zinc-900",
    link: "text-slate-900 dark:text-white hover:underline underline-offset-4 focus:ring-slate-100 dark:focus:ring-zinc-900",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
    icon: "p-2",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyle,
        isLoading || disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white dark:border-black border-t-transparent dark:border-t-transparent rounded-full"></div>
          <span>{children}</span>
        </>
      ) : (
        <>
          {leadingIcon && leadingIcon}
          <span>{children}</span>
          {trailingIcon && trailingIcon}
        </>
      )}
    </button>
  );
};

export { Button };
