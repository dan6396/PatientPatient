"use client";

import type { ScoreResponse, ScoredItem, ExamScoreItem, ExamDialogueTurn } from "@/backend/cases/case-types";
import { FinalTimeBar, type PhaseDurations } from "./TimerBar";

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

// 대화 내역 안에 끼우는 신체진찰 진행 블록 (지시 → 소견)
function ExamDialogueBlock({ dialogue }: { dialogue: ExamDialogueTurn[] }) {
  return (
    <div className="my-1 rounded-xl border border-dashed border-ink/20 bg-ink/[0.03] p-2.5">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-soft/70">
        — 신체진찰 —
      </p>
      <div className="space-y-1.5">
        {dialogue.map((d, i) => {
          if (d.kind === "student") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-ink px-3 py-1.5 text-[13px] leading-relaxed text-[var(--bg)]">
                  {d.text}
                </div>
              </div>
            );
          }
          if (d.kind === "finding") {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-ink/10 bg-[var(--bg)]/70 px-3 py-1.5">
                  <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft/50">
                    {d.label}
                  </span>
                  <span className="text-[13px] leading-relaxed text-ink">{d.text}</span>
                </div>
              </div>
            );
          }
          if (d.kind === "clarify") {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-amber-400/30 bg-amber-50/60 px-3 py-1.5 text-[13px] leading-relaxed text-ink">
                  {d.text}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-ink/10 bg-[var(--bg)]/60 px-3 py-1.5 text-[13px] leading-relaxed text-ink-soft/50">
                인식하지 못한 진찰
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScoreReport({
  report,
  transcript = [],
  historyLen = 0,
  examDialogue = [],
  patientMood,
  durations,
  onRestart,
  onExit,
}: {
  report: ScoreResponse;
  transcript?: Turn[];
  historyLen?: number; // 문진 대화 길이(이후는 교육) — 신체진찰을 사이에 끼운다
  examDialogue?: ExamDialogueTurn[]; // 신체진찰 진행 대화(지시→소견)
  patientMood?: string;
  durations?: PhaseDurations; // 단계별 소요시간(우측 상단 막대)
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

  // 대화 내역(빈 발화 제외) + 의사 발화별 코멘트 매핑 — 인덱스는 채점 LLM이 본 것과 동일.
  // 원본 인덱스(gi)도 함께 보관해, 문진/교육 사이에 신체진찰 대화를 끼워 넣는다.
  const shownTurns = transcript
    .map((t, gi) => ({ t, gi }))
    .filter((x) => x.t.content.trim());
  const commentByIdx = new Map((report.turnComments ?? []).map((c) => [c.i, c.comment]));

  // 신체진찰을 끼울 위치(필터링된 목록 기준) — 문진 다음, 교육 앞.
  const examInsertAt = (() => {
    const idx = shownTurns.findIndex((x) => x.gi >= historyLen);
    return idx === -1 ? shownTurns.length : idx;
  })();

  function renderTurn(t: Turn, i: number) {
    const comment = t.role === "doctor" ? commentByIdx.get(i) : undefined;
    return (
      <div
        key={`chat-${i}`}
        className={`flex flex-col gap-0.5 ${t.role === "doctor" ? "items-end" : "items-start"}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
            t.role === "doctor"
              ? "bg-ink text-[var(--bg)]"
              : "border border-ink/10 bg-[var(--bg)]/70 text-ink"
          }`}
        >
          {t.content}
        </div>
        {comment && (
          <p className="max-w-[85%] text-[11px] leading-snug text-amber-700">↳ {comment}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl lg:flex lg:items-start lg:gap-8">
      {/* 대화 내역 */}
      <aside className="mb-8 lg:mb-0 lg:sticky lg:top-6 lg:w-[36%] lg:shrink-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
          대화 내역
        </h3>
        <div className="max-h-[38vh] space-y-2 overflow-y-auto rounded-xl border border-ink/10 bg-[var(--bg)]/40 p-3 lg:max-h-[82vh]">
          {shownTurns.slice(0, examInsertAt).map((x, i) => renderTurn(x.t, i))}
          {examDialogue.length > 0 && <ExamDialogueBlock dialogue={examDialogue} />}
          {shownTurns
            .slice(examInsertAt)
            .map((x, i) => renderTurn(x.t, examInsertAt + i))}
          {shownTurns.length === 0 && examDialogue.length === 0 && (
            <p className="py-4 text-center text-xs text-ink-soft/70">대화 내역이 없습니다.</p>
          )}
        </div>
      </aside>

      {/* 채점 */}
      <div className="min-w-0 lg:flex-1">
        {/* ── 점수 요약 카드 ── */}
        <div className="mb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-display text-4xl text-ink">채점 결과</h2>
            {durations && <FinalTimeBar durations={durations} />}
          </div>

          <div className={`grid gap-3 ${hasExam ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
            {/* 문진 점수 — 모든 점수는 100점 만점으로 환산해 표시 */}
            <div className="rounded-xl border border-ink/15 bg-[var(--bg)]/50 px-5 py-4">
              <p className="mb-1 text-xs text-ink-soft">문진 점수</p>
              <p className="font-display text-3xl text-ink">
                {report.percentage}
                <span className="text-lg text-ink-soft"> / 100점</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-soft/60">
                채점표 원점수 {report.total}/{report.max}점
              </p>
            </div>

            {/* 신체진찰 점수 */}
            {hasExam && report.examScore && (
              <div className="rounded-xl border border-ink/15 bg-[var(--bg)]/50 px-5 py-4">
                <p className="mb-1 text-xs text-ink-soft">신체진찰 점수</p>
                <p className="font-display text-3xl text-ink">
                  {report.examScore.totalScore}
                  <span className="text-lg text-ink-soft"> / 100점</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-soft/60">
                  커버리지 {report.examScore.coverageScore} · 수기 {report.examScore.mannerScore}
                </p>
              </div>
            )}

            {/* 종합 점수 */}
            {report.combinedScore !== undefined && (
              <div className="rounded-xl border border-ink/15 bg-ink/[0.05] px-5 py-4">
                <p className="mb-1 text-xs text-ink-soft">종합 점수</p>
                <p className="font-display text-3xl text-ink">
                  {report.combinedScore}
                  <span className="text-lg text-ink-soft"> / 100점</span>
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
                <span className="text-ink">✓ = 다룬 항목</span>
                <span className="text-ink-soft"> · </span>
                <span className="text-red-600">✕ = 놓친 항목</span>
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
              <ul className="mb-4 space-y-1.5">
                {report.summary
                  .split("\n")
                  .map((l) => l.replace(/^\s*[-•·]\s*/, "").trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                      <span className="mt-px shrink-0 text-ink-soft/50">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
              </ul>
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
                          it.covered ? "text-ink" : "font-medium text-red-600"
                        }`}
                      >
                        <span className="mt-px shrink-0 font-bold">
                          {it.covered ? "✓" : "✕"}
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

        {/* 다른 Impression(감별진단) 더 공부하기 — 교육 피드백 바로 아래 */}
        <a
          href="/study/joint-diseases.html"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-ink/20 bg-[var(--bg)]/50 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:bg-ink/[0.04]"
        >
          <span>
            <span className="block text-sm font-medium text-ink">다른 Impression 더 공부하기</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              관절통증 감별진단(골관절염·쇼그렌·SLE 등)을 한눈에
            </span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">→</span>
        </a>

        {/* 신체진찰 영상으로 학습하기 — 동일 형태 버튼 */}
        <a
          href="/study/pe-learning-with-videos.html"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-ink/20 bg-[var(--bg)]/50 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:bg-ink/[0.04]"
        >
          <span>
            <span className="block text-sm font-medium text-ink">신체진찰 영상으로 학습하기</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              주요 신체진찰 술기를 영상과 함께 익히기
            </span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">→</span>
        </a>

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
