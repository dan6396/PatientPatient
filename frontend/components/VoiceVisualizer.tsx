"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { VoiceStatus } from "../hooks/useVoice";

type P = {
  hr: number; // home radius
  ha: number; // home angle
  x: number;
  y: number; // 현재 위치(중심 기준 offset)
  vx: number;
  vy: number;
  sz: number;
  seed: number;
};

/**
 * 음성 진폭(levelRef)에 반응하는 입자 오브.
 * 랜딩의 입자처럼: 상시 흐르는 난류(flow) + home으로 돌아오는 스프링 + 음성시 바깥으로 burst.
 * 정적이지 않고 늘 살아 움직이며, 말소리 크기에 따라 크게 요동친다.
 */
export default function VoiceVisualizer({
  levelRef,
  status,
  size = 300,
}: {
  levelRef: MutableRefObject<number>;
  status: VoiceStatus;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<VoiceStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = size;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    canvas.style.width = `${S}px`;
    canvas.style.height = `${S}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = S / 2;
    const cy = S / 2;
    const R = S * 0.32;
    // 크기 비례 계수 — 작은 사이즈에서도 큰 오브와 같은 밀도·움직임이 되도록.
    const k = S / 320;
    // 작은 오브는 입자를 더 촘촘히 + home(원형)에 강하게 붙여 외곽을 정확한 원으로 유지.
    const spring = 0.07 + Math.max(0, 1 - k) * 0.22;

    // 입자 수: 면적 비례 + 작은 사이즈는 가장자리가 매끈하도록 넉넉한 최소치 보장.
    const COUNT = Math.max(180, Math.round(720 * k * k));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const ps: P[] = Array.from({ length: COUNT }, (_, i) => {
      const hr = R * Math.sqrt((i + 0.5) / COUNT);
      const ha = i * golden;
      return {
        hr,
        ha,
        x: Math.cos(ha) * hr,
        y: Math.sin(ha) * hr,
        vx: 0,
        vy: 0,
        sz: (Math.random() * 1.2 + 0.9) * Math.max(0.7, k),
        seed: Math.random() * 1000,
      };
    });

    let raf = 0;
    let t = 0;
    let lvl = 0;
    let rot = 0;

    const tick = () => {
      t += 0.016;
      const target = levelRef.current || 0;
      lvl += (target - lvl) * 0.22;

      const active =
        statusRef.current === "recording" || statusRef.current === "speaking";
      rot += 0.003 + lvl * 0.02; // 회전 완만하게

      ctx.clearRect(0, 0, S, S);

      const expand = 1 + lvl * 0.4;
      const flowK = 0.5 + lvl * 1.4; // 상시 흐름 + 음성시 강해짐 (이전보다 절제)
      const energy = active ? 1 : 0.55; // 유휴 시 움직임 줄임
      const baseAlpha = active ? 0.96 : 0.85; // 랜딩처럼 진한 점

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // 천천히 회전하는 home
        const hx = Math.cos(p.ha + rot) * p.hr * expand;
        const hy = Math.sin(p.ha + rot) * p.hr * expand;

        // 난류 흐름장 (layered sines)
        const fx =
          Math.cos(p.y * 0.04 + t * 1.1 + p.seed) +
          Math.sin(p.x * 0.028 - t * 0.8 + p.seed * 0.5);
        const fy =
          Math.sin(p.x * 0.04 + t * 0.95 + p.seed) +
          Math.cos(p.y * 0.028 + t * 0.9 + p.seed * 0.5);

        // home 복귀 스프링 (작은 오브일수록 강해 원형을 유지)
        const sx = (hx - p.x) * spring;
        const sy = (hy - p.y) * spring;

        // 진폭 → 바깥으로 burst (크기 비례)
        const dist = Math.hypot(p.x, p.y) || 1;
        const bx = (p.x / dist) * lvl * 1.0 * k;
        const by = (p.y / dist) * lvl * 1.0 * k;

        // 난류 흐름도 크기 비례(작은 오브에서 과하게 튀지 않게)
        p.vx = (p.vx + fx * flowK * 0.06 * energy * k + sx + bx) * 0.85;
        p.vy = (p.vy + fy * flowK * 0.06 * energy * k + sy + by) * 0.85;
        p.x += p.vx;
        p.y += p.vy;

        // 작은 오브: 원형 경계로 클램프해 외곽을 정확한 원으로 고정
        if (k < 0.6) {
          const d = Math.hypot(p.x, p.y);
          const maxR = R * expand;
          if (d > maxR) {
            p.x = (p.x / d) * maxR;
            p.y = (p.y / d) * maxR;
          }
        }

        const edge = p.hr / R;
        const alpha = baseAlpha * (0.85 + 0.15 * (1 - edge)) + lvl * 0.1;
        ctx.fillStyle = `rgba(22,22,15,${Math.min(0.98, alpha)})`;
        ctx.fillRect(cx + p.x, cy + p.y, p.sz, p.sz);
      }

      // 중심 코어 (크기 비례 — 작은 오브에서 박스를 꽉 채우지 않게)
      ctx.beginPath();
      ctx.fillStyle = `rgba(22,22,15,${0.7 + lvl * 0.3})`;
      ctx.arc(cx, cy, (2.5 + lvl * 12) * k, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [levelRef, size]);

  return <canvas ref={canvasRef} aria-hidden className="select-none" />;
}
