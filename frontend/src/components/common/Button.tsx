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
      "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-gray-200 focus:ring-neutral-400 dark:focus:ring-gray-400",
    secondary:
      "bg-gray-100 dark:bg-neutral-900 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 focus:ring-gray-300 dark:focus:ring-neutral-700",
    outline:
      "border-2 border-gray-200 dark:border-neutral-800 bg-transparent text-black dark:text-white hover:border-black dark:hover:border-white focus:ring-gray-200 dark:focus:ring-neutral-800",
    ghost:
      "text-black dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-900 focus:ring-gray-100 dark:focus:ring-neutral-900",
    link: "text-black dark:text-white hover:underline underline-offset-4 focus:ring-gray-100 dark:focus:ring-neutral-900",
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
