"use client";

import { useEffect, useRef } from "react";
import type { PanelContent } from "./config";

export default function DualPanel({
  left,
  right,
  dark,
}: {
  left: PanelContent;
  right: PanelContent;
  dark: { bg: string; text: string };
}) {
  const ref = useRef<HTMLDivElement>(null);

  // 마우스 움직임에 따라 블롭이 미세하게 따라온다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const blobs = Array.from(el.querySelectorAll<HTMLElement>("[data-blob]"));
    let rafId = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    function onMove(e: MouseEvent) {
      const r = el!.getBoundingClientRect();
      target.x = (e.clientX - r.left - r.width / 2) / r.width;
      target.y = (e.clientY - r.top - r.height / 2) / r.height;
    }
    function loop() {
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      blobs.forEach((b, i) => {
        const depth = (i + 1) * 26;
        b.style.transform = `translate3d(${cur.x * depth}px, ${cur.y * depth}px, 0)`;
      });
      rafId = requestAnimationFrame(loop);
    }
    el.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <section
      id="about"
      ref={ref}
      className="relative grid grid-cols-1 overflow-hidden md:grid-cols-2"
    >
      {/* 좌 패널 (밝음) */}
      <div id="start" className="relative flex min-h-[88vh] flex-col px-8 py-28 sm:px-14">
        <span className="font-display text-sm italic text-ink-soft/70">{left.eyebrow}</span>
        <h2 className="mt-3 font-display text-6xl leading-[0.95] sm:text-7xl">{left.title}</h2>
        <div className="mt-8 flex max-w-md flex-wrap gap-2">
          {left.tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-ink/15 bg-[var(--bg)]/50 px-3 py-1.5 text-[0.8125rem] text-ink/80"
            >
              {t}
            </span>
          ))}
        </div>

        <div
          data-blob
          className="pointer-events-none absolute left-[8%] top-[48%] -z-0 h-72 w-72 rounded-full bg-ink/25 blur-3xl"
        />

        <p className="mt-auto max-w-md pt-16 text-[0.9375rem] leading-relaxed text-ink-soft">
          {left.body}
        </p>
      </div>

      {/* 우 패널 (어두움) */}
      <div
        id="evaluate"
        className="relative flex min-h-[88vh] flex-col px-8 py-28 sm:px-14"
        style={{ backgroundColor: dark.bg, color: dark.text }}
      >
        <span className="font-display text-sm italic text-white/45">{right.eyebrow}</span>
        <h2 className="mt-3 font-display text-6xl leading-[0.95] text-white sm:text-7xl">
          {right.title}
        </h2>
        <div className="mt-8 flex max-w-md flex-wrap gap-2">
          {right.tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[0.8125rem] text-white/85"
            >
              {t}
            </span>
          ))}
        </div>

        <div
          data-blob
          className="pointer-events-none absolute right-[10%] top-[45%] h-80 w-80 rounded-full bg-black/30 blur-3xl"
        />

        <p className="mt-auto max-w-md pt-16 text-[0.9375rem] leading-relaxed text-white/60">
          {right.body}
        </p>
      </div>
    </section>
  );
}
