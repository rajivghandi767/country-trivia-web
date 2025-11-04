import { cn } from "@/utils/styleUtils";

interface SectionProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  title?: string;
  titleClassName?: string;
}

const Section = ({
  children,
  id,
  className,
  title,
  titleClassName,
}: SectionProps) => {
  return (
    <section id={id} className={cn("mx-auto px-4 py-8", className)}>
      {title && (
        <div className="flex justify-center items-center mb-8">
          <h2
            className={cn(
              "text-2xl font-semibold text-center text-transparent bg-clip-text bg-linear-to-r from-black to-gray-800 dark:from-white dark:to-gray-300 hover:from-gray-900 hover:to-gray-800 dark:hover:from-gray-200 dark:hover:to-gray-100 transition-all duration-200",
              titleClassName
            )}
          >
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
};

export { Section };
