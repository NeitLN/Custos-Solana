import { useEffect, useRef } from "react";

export const CINEMA = {
  /* Băng "One signature. More than a transfer." và dải ba bước của nó đã bỏ (review UX 11/2026):
     chúng vẽ lại cùng quy trình mà sơ đồ hành trình đã nói. */
  vi: { pause: "Dừng chuyển động", play: "Bật chuyển động", reduced: "Đã giảm chuyển động", scroll: "Cuộn để khám phá" },
  en: { pause: "Pause motion", play: "Enable motion", reduced: "Motion reduced", scroll: "Scroll to explore" },
};

/** Decorative orbital scene; no network, no transaction data. */
export function CinematicScene({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0, width = 0, height = 0, visible = true, previous = 0, elapsed = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const mobile = width < 760, cx = width * (mobile ? .65 : .76), cy = height * .48;
      const radius = Math.min(width * .47, 500), phase = elapsed * .00012;
      for (let ring = 0; ring < 9; ring++) {
        const r = radius * (.5 + ring * .074);
        ctx.beginPath();
        for (let step = 0; step <= 100; step++) {
          const a = step / 100 * Math.PI * 2, x = Math.cos(a) * r;
          const y = Math.sin(a) * r * (.45 + .08 * Math.sin(phase + ring * .14));
          const tilt = -.54 + .1 * Math.sin(phase);
          const px = cx + x * Math.cos(tilt) - y * Math.sin(tilt), py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
          if (!step) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(117,214,182,${.08 + ring * .012})`; ctx.lineWidth = ring % 3 === 0 ? 1.2 : .6; ctx.stroke();
      }
      for (let i = 0; i < (mobile ? 16 : 32); i++) {
        const a = i * 2.39996 + phase * (i % 2 ? 1 : -.7), r = radius * (.52 + (i % 8) * .076);
        const x = Math.cos(a) * r, y = Math.sin(a) * r * .48;
        ctx.fillStyle = i % 4 === 0 ? "#b9de87" : "rgba(138,229,206,.65)";
        ctx.beginPath(); ctx.arc(cx + x * .858 + y * .514, cy - x * .514 + y * .858, i % 4 === 0 ? 2.6 : 1.2, 0, Math.PI * 2); ctx.fill();
      }
    };
    const tick = (now: number) => {
      if (now - previous >= 32) { elapsed += Math.min(now - previous, 64); previous = now; draw(); }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => { cancelAnimationFrame(frame); if (!paused && visible && !document.hidden) { previous = performance.now(); frame = requestAnimationFrame(tick); } };
    const resize = () => {
      const box = canvas.getBoundingClientRect(); width = box.width; height = box.height;
      const dpr = Math.min(devicePixelRatio || 1, width < 760 ? 1 : 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const sizes = new ResizeObserver(resize); sizes.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync(); });
    observer.observe(canvas); document.addEventListener("visibilitychange", sync); resize(); sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); sizes.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [paused]);
  return <div className="cine-atmosphere" aria-hidden="true"><div className="cine-light cine-light--one" /><div className="cine-light cine-light--two" /><div className="cine-floor" /><canvas ref={ref} className="cine-orbits" /><div className="cine-vignette" /></div>;
}
