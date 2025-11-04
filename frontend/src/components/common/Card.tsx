import { cn } from "@/utils/styleUtils";
import { useState } from "react";

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
        "bg-white dark:bg-black rounded-lg shadow-md overflow-hidden border-2 border-black dark:border-gray-800",
        hover && "transition-all duration-300 hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  aspectRatio?: "auto" | "square" | "video" | "3/2" | "4/3" | "16/9";
  objectFit?: "contain" | "cover";
}

const CardImage = ({
  src,
  alt,
  className,
  fallback,
  aspectRatio = "auto",
  objectFit = "cover",
}: CardImageProps) => {
  const [hasError, setHasError] = useState(false);

  const aspectRatioClasses = {
    auto: "",
    square: "aspect-square",
    video: "aspect-video",
    "3/2": "aspect-[3/2]",
    "4/3": "aspect-[4/3]",
    "16/9": "aspect-[16/9]",
  };

  const objectFitClasses = {
    contain: "object-contain",
    cover: "object-cover",
  };

  if (hasError || !src) {
    return (
      <div
        className={cn(
          "w-full overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center",
          aspectRatioClasses[aspectRatio],
          className
        )}
      >
        {fallback || (
          <div className="text-gray-500 dark:text-gray-600 font-mono text-sm">
            Image Unavailable
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden",
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full transition-transform duration-300 hover:scale-105",
          objectFitClasses[objectFit]
        )}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardContent = ({ children, className }: CardContentProps) => {
  return (
    <div className={cn("p-4 flex flex-col flex-grow", className)}>
      {children}
    </div>
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
        "font-semibold text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-300",
        className
      )}
    >
      {children}
    </Component>
  );
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const CardDescription = ({ children, className }: CardDescriptionProps) => {
  return (
    <div className={cn("text-sm text-black dark:text-gray-300", className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const CardFooter = ({ children, className }: CardFooterProps) => {
  return (
    <div
      className={cn(
        "mt-auto pt-4 border-t border-black dark:border-gray-800 flex justify-between items-center",
        className
      )}
    >
      {children}
    </div>
  );
};

export { Card, CardImage, CardContent, CardTitle, CardDescription, CardFooter };
