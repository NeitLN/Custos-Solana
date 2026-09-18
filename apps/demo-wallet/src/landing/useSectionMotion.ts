import { useEffect, useRef } from "react";

/** Progressive enhancement: content stays visible without observers or motion. */
export function useSectionMotion(paused: boolean, locale: string) {
  const seen = useRef(new WeakSet<Element>());
  useEffect(() => {
    if (paused || typeof IntersectionObserver === "undefined") return;
    const root = document.querySelector<HTMLElement>(".custos-landing");
    if (!root) return;
    const animations = new Set<Animation>();
    const animate = (node: Element, frames: Keyframe[], delay = 0, duration = 750) => {
      if (!node.animate || seen.current.has(node)) return;
      seen.current.add(node);
      const animation = node.animate(frames, { duration, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
      animations.add(animation); animation.onfinish = () => animations.delete(animation);
    };
    root.querySelectorAll(".cine-word").forEach((node, i) => animate(node, [{ transform: "translateY(100%) rotate(3deg)", opacity: .2 }, { transform: "translateY(0) rotate(0deg)", opacity: 1 }], i * 65, 900));
    root.querySelectorAll(".lg-kicker,.lg-hero__mota,.lg-hero__nut,.lg-hero__ghichu").forEach((node, i) => animate(node, [{ opacity: .2, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }], i * 90 + 180));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target; observer.unobserve(node);
        if (node.matches(".lg-buoc,.lg-bcs__muc")) {
          const i = Array.from(node.parentElement?.children ?? []).indexOf(node);
          animate(node, [{ opacity: .35, transform: "translateY(34px)" }, { opacity: 1, transform: "translateY(0)" }], Math.min(i * 110, 330));
        } else if (node.matches(".lg-code,.cine-bridge__copy")) {
          animate(node, [{ clipPath: "inset(0 0 100% 0)", transform: "translateY(20px)" }, { clipPath: "inset(0 0 0% 0)", transform: "translateY(0)" }], 0, 950);
        } else {
          animate(node, [{ opacity: .45, transform: "perspective(1200px) translateY(32px) rotateX(5deg) scale(.96)" }, { opacity: 1, transform: "perspective(1200px) translateY(0) rotateX(0) scale(1)" }], 0, 850);
        }
      }
    }, { threshold: 0.12 });
    root.querySelectorAll(".lg-phieu,.lg-ab__bang,.lg-tt,.lg-buoc,.lg-code,.lg-bcs__muc,.cine-bridge__copy,.lg-cta__in").forEach(node => observer.observe(node));
    const hero = root.querySelector<HTMLElement>(".lg-hero");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty("--cine-progress", `${max > 0 ? scrollY / max : 0}`);
      const rect = hero?.getBoundingClientRect();
      if (rect && rect.bottom > 0) hero?.style.setProperty("--cine-scroll", `${Math.min(Math.max(-rect.top, 0), 850) * .12}px`);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const pointer = (event: PointerEvent) => {
      if (!fine.matches || !hero) return;
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty("--cine-ry", `${(event.clientX - rect.left - rect.width / 2) / rect.width * 7}deg`);
      hero.style.setProperty("--cine-rx", `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 5}deg`);
    };
    const reset = () => { hero?.style.setProperty("--cine-ry", "0deg"); hero?.style.setProperty("--cine-rx", "0deg"); };
    hero?.addEventListener("pointermove", pointer); hero?.addEventListener("pointerleave", reset);
    window.addEventListener("scroll", scroll, { passive: true }); update();
    return () => {
      observer.disconnect();
      animations.forEach((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        if (target) seen.current.delete(target);
        animation.cancel();
      });
      cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll);
      hero?.removeEventListener("pointermove", pointer); hero?.removeEventListener("pointerleave", reset);
      reset(); hero?.style.setProperty("--cine-scroll", "0px");
    };
  }, [paused, locale]);
}
