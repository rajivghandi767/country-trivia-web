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
      "bg-gradient-to-r from-black to-gray-800 dark:from-gray-50 dark:to-white text-white dark:text-black hover:from-gray-800 hover:to-gray-700 dark:hover:from-gray-200 dark:hover:to-gray-100 focus:ring-gray-400 dark:focus:ring-gray-600",
    secondary:
      "bg-gray-200 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:ring-gray-300 dark:focus:ring-gray-700",
    outline:
      "border-2 border-black dark:border-gray-300 text-black dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 focus:ring-gray-400 dark:focus:ring-gray-600",
    ghost:
      "text-black dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 focus:ring-gray-400 dark:focus:ring-gray-600",
    link: "text-black dark:text-gray-300 hover:text-gray-700 dark:hover:text-white underline underline-offset-4 focus:ring-gray-400 dark:focus:ring-gray-600",
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
        className
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
