"use client";

import { useEffect, useRef } from "react";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-ink/15 bg-[var(--bg)]/50 px-3 py-1.5 text-[13px] text-ink/80">
      {children}
    </span>
  );
}

export default function DualPanel() {
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
      {/* 좌: 시뮬레이션 */}
      <div id="start" className="relative flex min-h-[88vh] flex-col px-8 py-28 sm:px-14">
        <span className="font-display text-sm italic text-ink-soft/70">Standardized</span>
        <h2 className="mt-3 font-display text-6xl leading-[0.95] sm:text-7xl">
          We&nbsp;simulate
        </h2>
        <div className="mt-8 flex max-w-md flex-wrap gap-2">
          <Tag>표준화환자(SP)</Tag>
          <Tag>실시간 문진</Tag>
          <Tag>캐릭터 유지</Tag>
          <Tag>정보 게이팅</Tag>
          <Tag>한국어 대화</Tag>
          <Tag>탈옥 방어</Tag>
        </div>

        <div
          data-blob
          className="pointer-events-none absolute left-[8%] top-[48%] -z-0 h-72 w-72 rounded-full bg-ink/25 blur-3xl"
        />

        <p className="mt-auto max-w-md pt-16 text-[15px] leading-relaxed text-ink-soft">
          실제 표준화환자처럼 행동하는 AI와 면담을 연습합니다. 환자는 물어본
          것에만 답하고, 먼저 정보를 흘리지 않으며, 진단명을 절대 먼저 말하지
          않습니다. 의대생은 의사 역할로 자유롭게 병력을 청취합니다.
        </p>
      </div>

      {/* 우: 채점 (더 어두운 패널) */}
      <div
        id="evaluate"
        className="relative flex min-h-[88vh] flex-col bg-[#3a3a32] px-8 py-28 text-[#e7e7df] sm:px-14"
      >
        <span className="font-display text-sm italic text-white/45">Examination</span>
        <h2 className="mt-3 font-display text-6xl leading-[0.95] text-white sm:text-7xl">
          We&nbsp;evaluate
        </h2>
        <div className="mt-8 flex max-w-md flex-wrap gap-2">
          {["병력청취", "신체진찰", "환자교육", "PPI", "임상예절", "자동 피드백"].map(
            (t) => (
              <span
                key={t}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[13px] text-white/85"
              >
                {t}
              </span>
            )
          )}
        </div>

        <div
          data-blob
          className="pointer-events-none absolute right-[10%] top-[45%] h-80 w-80 rounded-full bg-black/30 blur-3xl"
        />

        <p className="mt-auto max-w-md pt-16 text-[15px] leading-relaxed text-white/60">
          면담이 끝나면 전체 대화를 CPX 채점표에 비춰 항목별 충족·미충족을 즉시
          판정합니다. 카테고리별 체크리스트와 함께, 놓친 항목 중심의 한국어
          피드백을 한눈에 제공합니다.
        </p>
      </div>
    </section>
  );
}
