"use client";

import type { ScoreResponse, ScoredItem } from "@/backend/cases/case-types";

function Mark({ item }: { item: ScoredItem }) {
  const full = item.points === item.maxPoints;
  const zero = item.points === 0;
  const cls = full
    ? "bg-emerald-700/90 text-white"
    : zero
    ? "bg-ink/15 text-ink/50"
    : "bg-amber-600/80 text-white";
  const glyph = full ? "✓" : zero ? "✕" : "~";
  return (
    <span
      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${cls}`}
    >
      {glyph}
    </span>
  );
}

export default function ScoreReport({
  report,
  onRestart,
  onExit,
}: {
  report: ScoreResponse;
  onRestart: () => void;
  onExit: () => void;
}) {
  // 항목을 카테고리 순서대로 그룹화 (rubric 순서 유지)
  const order: string[] = [];
  const groups: Record<string, ScoredItem[]> = {};
  for (const it of report.items) {
    if (!groups[it.category]) {
      groups[it.category] = [];
      order.push(it.category);
    }
    groups[it.category].push(it);
  }
  const catTotals = Object.fromEntries(
    report.categories.map((c) => [c.category, c])
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-4xl text-ink">채점 결과</h2>
          <p className="mt-1 text-sm text-ink-soft">CPX 채점표 기준 자동 평가</p>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl text-ink">
            {report.total}
            <span className="text-ink-soft">/{report.max}</span>
          </div>
          <p className="text-xs text-ink-soft">{report.percentage}점 (100점 환산)</p>
        </div>
      </div>

      {/* 카테고리별 소계 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {report.categories.map((c) => (
          <span
            key={c.category}
            className="rounded-md border border-ink/15 bg-[var(--bg)]/50 px-3 py-1.5 text-[13px] text-ink/80"
          >
            {c.category} <span className="text-ink-soft">{c.points}/{c.max}</span>
          </span>
        ))}
      </div>

      <div className="space-y-6">
        {order.map((cat) => (
          <section key={cat}>
            <h3 className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
              <span>{cat}</span>
              <span className="font-normal normal-case tracking-normal">
                {catTotals[cat]?.points}/{catTotals[cat]?.max}점
              </span>
            </h3>
            <ul className="space-y-1.5">
              {groups[cat].map((r) => (
                <li
                  key={r.id}
                  className="flex gap-3 rounded-lg border border-ink/10 bg-[var(--bg)]/40 px-4 py-3"
                >
                  <Mark item={r} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-ink">{r.description}</p>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {r.levelLabel} · {r.points}/{r.maxPoints}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                      {r.evidence}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {report.summary && (
        <div className="mt-8 rounded-xl border border-ink/15 bg-ink/[0.04] p-5">
          <h3 className="mb-2 font-display text-lg text-ink">피드백</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{report.summary}</p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onRestart}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
        >
          다시 면담하기
        </button>
        <button
          onClick={onExit}
          className="rounded-full border border-ink/25 px-6 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5"
        >
          다른 증례 선택
        </button>
      </div>
    </div>
  );
}
