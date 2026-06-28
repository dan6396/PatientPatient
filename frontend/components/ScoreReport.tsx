"use client";

import type { ScoreResponse, ScoredItem, ExamScoreItem } from "@/backend/cases/case-types";

function RubricMark({ item }: { item: ScoredItem }) {
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

function ExamItemRow({ item }: { item: ExamScoreItem }) {
  return (
    <li className="flex gap-3 rounded-lg border border-ink/10 bg-[var(--bg)]/40 px-4 py-3">
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
          item.satisfied ? "bg-emerald-700/90 text-white" : "bg-ink/15 text-ink/50"
        }`}
      >
        {item.satisfied ? "✓" : "✕"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{item.label}</p>
        {!item.satisfied && item.reason && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{item.reason}</p>
        )}
      </div>
    </li>
  );
}

type Turn = { role: "doctor" | "patient"; content: string };

export default function ScoreReport({
  report,
  transcript = [],
  patientMood,
  onRestart,
  onExit,
}: {
  report: ScoreResponse;
  transcript?: Turn[];
  patientMood?: string;
  onRestart: () => void;
  onExit: () => void;
}) {
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

  const hasExam = Boolean(report.examScore);

  return (
    <div className="mx-auto w-full max-w-5xl lg:flex lg:items-start lg:gap-8">
      {/* 대화 내역 */}
      <aside className="mb-8 lg:mb-0 lg:sticky lg:top-6 lg:w-[36%] lg:shrink-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
          대화 내역
        </h3>
        <div className="max-h-[38vh] space-y-2 overflow-y-auto rounded-xl border border-ink/10 bg-[var(--bg)]/40 p-3 lg:max-h-[82vh]">
          {transcript.filter((t) => t.content.trim()).map((t, i) => (
            <div key={i} className={`flex ${t.role === "doctor" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  t.role === "doctor"
                    ? "bg-ink text-[var(--bg)]"
                    : "border border-ink/10 bg-[var(--bg)]/70 text-ink"
                }`}
              >
                {t.content}
              </div>
            </div>
          ))}
          {transcript.filter((t) => t.content.trim()).length === 0 && (
            <p className="py-4 text-center text-xs text-ink-soft/70">대화 내역이 없습니다.</p>
          )}
        </div>
      </aside>

      {/* 채점 */}
      <div className="min-w-0 lg:flex-1">
        {/* ── 점수 요약 카드 ── */}
        <div className="mb-6">
          <h2 className="mb-4 font-display text-4xl text-ink">채점 결과</h2>

          <div className={`grid gap-3 ${hasExam ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
            {/* 문진 점수 */}
            <div className="rounded-xl border border-ink/15 bg-[var(--bg)]/50 px-5 py-4">
              <p className="mb-1 text-xs text-ink-soft">문진 점수</p>
              <p className="font-display text-3xl text-ink">
                {report.percentage}
                <span className="text-lg text-ink-soft">점</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-soft/60">
                {report.total}/{report.max}점 (100점 환산)
              </p>
            </div>

            {/* 신체진찰 점수 */}
            {hasExam && report.examScore && (
              <div className="rounded-xl border border-ink/15 bg-[var(--bg)]/50 px-5 py-4">
                <p className="mb-1 text-xs text-ink-soft">신체진찰 점수</p>
                <p className="font-display text-3xl text-ink">
                  {report.examScore.totalScore}
                  <span className="text-lg text-ink-soft">점</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft/60">
                  커버리지 {report.examScore.coverageScore}점 · 수기 {report.examScore.mannerScore}점
                </p>
              </div>
            )}

            {/* 종합 점수 */}
            {report.combinedScore !== undefined && (
              <div className="rounded-xl border border-ink/15 bg-ink/[0.05] px-5 py-4">
                <p className="mb-1 text-xs text-ink-soft">종합 점수</p>
                <p className="font-display text-3xl text-ink">
                  {report.combinedScore}
                  <span className="text-lg text-ink-soft">점</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft/60">
                  문진 60% + 신체진찰 40%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 교육 피드백 카드 */}
        {report.teaching && (
          <div className="mb-6 rounded-xl border border-ink/15 bg-ink/[0.04] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl text-ink">교육 피드백</h3>
              <span className="text-xs">
                <span className="text-emerald-700">초록 ✓ = 다룬 항목</span>
                <span className="text-ink-soft"> · </span>
                <span className="text-red-600">빨강 = 놓친 항목</span>
              </span>
            </div>

            <div className="mb-3 text-sm">
              <span className="text-ink-soft">추정진단(Impression): </span>
              <span className="font-medium text-ink">{report.teaching.impression}</span>
              {report.teaching.impressionCorrect ? (
                <span className="ml-2 text-emerald-700">✓ 응시자 진단 일치</span>
              ) : (
                <span className="ml-2 text-red-600">
                  · 응시자: {report.teaching.studentImpression || "언급 없음"}
                </span>
              )}
            </div>

            {report.summary && (
              <p className="mb-4 text-sm leading-relaxed text-ink-soft">{report.summary}</p>
            )}

            <div className="space-y-3">
              {report.teaching.sections.map((s) => (
                <div key={s.title}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                    {s.title}
                  </h4>
                  <ul className="mt-1 space-y-0.5">
                    {s.items.map((it, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-1.5 text-sm leading-relaxed ${
                          it.covered ? "text-emerald-700" : "font-medium text-red-600"
                        }`}
                      >
                        <span className="mt-px shrink-0 font-bold">
                          {it.covered ? "✓" : "·"}
                        </span>
                        <span>{it.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 신체진찰 항목별 충족/미충족 */}
        {hasExam && report.examScore && (
          <div className="mb-6 rounded-xl border border-ink/15 bg-ink/[0.04] p-5">
            <h3 className="mb-3 font-display text-xl text-ink">신체진찰 세부 평가</h3>
            <ul className="space-y-1.5">
              {report.examScore.items.map((item) => (
                <ExamItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}

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

        {/* 루브릭 항목 */}
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
                    <RubricMark item={r} />
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

        {!report.teaching && report.summary && (
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
    </div>
  );
}
