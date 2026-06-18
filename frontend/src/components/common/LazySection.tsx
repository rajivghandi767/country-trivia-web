import { useState, useEffect, useRef } from "react";

interface LazySectionProps {
  children: React.ReactNode;
  rootMargin?: string;
}

export function LazySection({ children, rootMargin = "200px" }: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={sectionRef}>{isVisible ? children : <div style={{ height: "1px" }} />}</div>;
}
