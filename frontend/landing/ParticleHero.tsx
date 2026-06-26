"use client";

import { useEffect, useRef } from "react";
import type { CtaItem } from "./config";

type Particle = {
  x: number;
  y: number;
  hx: number;
  hy: number;
  vx: number;
  vy: number;
  size: number;
  rx: number;
  ry: number;
};

type HeroProps = {
  eyebrow: { pre?: string; strong?: string; post?: string };
  particleWord: string;
  caption: string;
  captionSub?: string;
  body: string;
  primaryCta: CtaItem;
  secondaryCta?: CtaItem;
  scrollHint?: string;
  inkColor: string; // 입자 색 (hex)
};

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 입자가 흩어졌다 모이며 particleWord 를 그리는 인터랙티브 히어로.
 * - 마우스를 움직이면 커서 주변 입자가 밀려났다가 제자리로 돌아온다.
 * - 휠로 스크롤하면 입자가 위로 흩어지며 사라진다(scatter).
 * - 마우스 위치에 따라 전체 입자장이 미세하게 패럴랙스로 움직인다.
 */
export default function ParticleHero({
  eyebrow,
  particleWord,
  caption,
  captionSub,
  body,
  primaryCta,
  secondaryCta,
  scrollHint,
  inkColor,
}: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [pr, pg, pb] = hexToRgb(inkColor);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;

    const mouse = { x: -9999, y: -9999, active: false };
    const par = { tx: 0, ty: 0, x: 0, y: 0 };
    let scatter = 0;

    function buildParticles() {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (!octx) return;

      octx.clearRect(0, 0, w, h);
      octx.fillStyle = "#000";
      octx.textAlign = "center";
      octx.textBaseline = "middle";

      // ~1440px 이하는 280(현재값) 유지, 그 이상 넓어지면 비례해 커진다.
      const big = Math.min(w * 0.27, 280 + Math.max(0, w - 1440) * 0.14);
      const cx = w / 2;
      const cy = h / 2 - big * 0.08;
      octx.font = `700 ${big}px Georgia, "Times New Roman", serif`;
      octx.fillText(particleWord, cx, cy);

      const data = octx.getImageData(0, 0, w, h).data;
      const step = w < 640 ? 4 : 5;
      const next: Particle[] = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 128) {
            next.push({
              x: Math.random() * w,
              y: Math.random() * h,
              hx: x,
              hy: y,
              vx: 0,
              vy: 0,
              size: Math.random() * 1.3 + 0.7,
              rx: Math.random() - 0.5,
              ry: Math.random() - 0.5,
            });
          }
        }
      }
      particles = next;
    }

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }

    function onScroll() {
      const rect = wrap!.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, -rect.top / (h * 0.85)));
      scatter = prog;
    }

    function tick() {
      par.x += (par.tx - par.x) * 0.06;
      par.y += (par.ty - par.y) * 0.06;

      ctx!.clearRect(0, 0, w, h);
      ctx!.save();
      ctx!.translate(par.x, par.y);

      const repelR = 95;
      const repelR2 = repelR * repelR;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let fx = (p.hx - p.x) * 0.013;
        let fy = (p.hy - p.y) * 0.013;

        if (mouse.active) {
          const dx = p.x - (mouse.x - par.x);
          const dy = p.y - (mouse.y - par.y);
          const d2 = dx * dx + dy * dy;
          if (d2 < repelR2) {
            const d = Math.sqrt(d2) || 1;
            const force = (repelR - d) / repelR;
            fx += (dx / d) * force * 3.4;
            fy += (dy / d) * force * 3.4;
          }
        }

        if (scatter > 0.001) {
          fx += p.rx * scatter * 7;
          fy += p.ry * scatter * 7 - scatter * 2.4;
        }

        p.vx = (p.vx + fx) * 0.83;
        p.vy = (p.vy + fy) * 0.83;
        p.x += p.vx;
        p.y += p.vy;
      }

      const alpha = Math.max(0, 1 - scatter * 0.95);
      ctx!.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx!.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx!.restore();
      raf = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      par.tx = (mouse.x - w / 2) * 0.02;
      par.ty = (mouse.y - h / 2) * 0.02;
    }
    function onLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
      par.tx = 0;
      par.ty = 0;
    }

    resize();
    onScroll();
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [particleWord, inkColor]);

  return (
    <section
      ref={wrapRef}
      className="relative flex h-[92vh] min-h-[560px] w-full items-center justify-center"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 또렷한 부제 (입자 X) */}
      <div className="pointer-events-none absolute left-1/2 top-[59%] -translate-x-1/2 px-4 text-center">
        <p className="font-display text-base tracking-[0.32em] text-ink/70 sm:text-lg">
          {caption}
        </p>
        {captionSub && (
          <p className="mt-1 text-xs tracking-[0.2em] text-ink-soft/70">{captionSub}</p>
        )}
      </div>

      {/* 좌상단(중앙 상단) 이탤릭 라벨 */}
      <span className="pointer-events-none absolute left-1/2 top-[13%] -translate-x-1/2 text-center font-display text-base italic text-ink-soft/80">
        {eyebrow.pre}
        {eyebrow.strong && <span className="text-ink">{eyebrow.strong}</span>}
        {eyebrow.post}
        <span className="mx-auto mt-1 block h-5 w-px rotate-[20deg] bg-ink/30" />
      </span>

      {/* 하단 카피 + CTA */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-5 px-6 text-center">
        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">{body}</p>
        <div className="pointer-events-auto flex items-center gap-3">
          <a
            href={primaryCta.href}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
          >
            {primaryCta.label}
          </a>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              className="rounded-full border border-ink/25 px-6 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5"
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
        {scrollHint && (
          <span className="mt-2 animate-pulse text-xs tracking-[0.25em] text-ink-soft/60">
            {scrollHint}
          </span>
        )}
      </div>
    </section>
  );
}
