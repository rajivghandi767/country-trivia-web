import { cn } from "@/utils/styleUtils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const Card = ({ children, className, onClick, hover = true }: CardProps) => {
  return (
    <div
      className={cn(
        "bg-bg-light dark:bg-bg-dark rounded-lg shadow-md border-2 border-gray-200 dark:border-neutral-800 transition-colors duration-200",
        hover && "transition-all duration-300 hover:shadow-lg",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardContent = ({ children, className }: CardContentProps) => {
  return (
    <div className={cn("p-4 flex flex-col grow", className)}>{children}</div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
}

const CardTitle = ({ children, className, as = "h3" }: CardTitleProps) => {
  const Component = as;
  return (
    <Component
      className={cn(
        "font-semibold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400",
        className,
      )}
    >
      {children}
    </Component>
  );
};

export { Card, CardContent, CardTitle };
