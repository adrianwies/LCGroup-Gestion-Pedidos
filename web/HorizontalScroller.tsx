import { ReactNode, useEffect, useRef, useState } from "react";
import "./horizontal-scroller.css";

export function HorizontalScroller({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: true, right: true });

  const sync = () => {
    const element = viewport.current;
    if (!element) return;
    setEdge({
      left: element.scrollLeft <= 2,
      right: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(sync);
    const observer = new ResizeObserver(sync);
    if (viewport.current) observer.observe(viewport.current);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [children]);

  const move = (direction: -1 | 1) => {
    const element = viewport.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.72,
      behavior: "smooth",
    });
  };

  return (
    <div className={`hscroll ${className}`.trim()}>
      <div className="hscroll-viewport" ref={viewport} onScroll={sync}>
        {children}
      </div>
      <nav className="hscroll-arrows" aria-label="Desplazar contenido horizontal">
        {!edge.left && (
          <button type="button" onClick={() => move(-1)} aria-label="Ver contenido anterior">
            ‹
          </button>
        )}
        {!edge.right && (
          <button type="button" onClick={() => move(1)} aria-label="Ver más contenido">
            ›
          </button>
        )}
      </nav>
    </div>
  );
}
