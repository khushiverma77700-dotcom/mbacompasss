import { useEffect, useRef, useState } from "react";

/** Render at a real device width, then fit the preview without changing breakpoints. */
export default function AdPageFrame({ src, mobile }: { src: string; mobile: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const deviceWidth = mobile ? 390 : 1280;
  const scale = Math.min(1, Math.max(1, width) / deviceWidth);
  return (
    <div ref={ref} className="w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="relative mx-auto overflow-hidden" style={{ width: deviceWidth * scale, height: Math.min(720, 1100 * scale) }}>
        <iframe title="Ad preview on a real page" src={src} className="absolute left-0 top-0 origin-top-left border-0 bg-background"
          style={{ width: deviceWidth, height: Math.min(720, 1100 * scale) / scale, transform: `scale(${scale})` }} />
      </div>
    </div>
  );
}