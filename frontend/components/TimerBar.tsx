"use client";

// 면담 단계별 소요시간 막대. 단계를 넘어가도 이어지고, 단계마다 색이 다르게 채워진다.
export type TimedPhase = "history" | "exam" | "education";
export type PhaseDurations = { history: number; exam: number; education: number }; // ms

export type TimerInfo = {
  on: boolean;
  onToggle: () => void;
  durations: PhaseDurations; // 완료된 단계의 누적(ms)
  phase: TimedPhase; // 현재 단계
  currentMs: number; // 현재 단계 실시간 경과(ms)
};

// 단계 색 — 워밍 그레이/ink 팔레트와 어울리는 구분색
export const PHASE_COLOR: Record<TimedPhase, string> = {
  history: "#3f5166", // 문진 — 슬레이트
  exam: "#9a6b3f", // 신체진찰 — 오커
  education: "#5f7a52", // 환자교육 — 세이지
};
export const PHASE_LABEL: Record<TimedPhase, string> = {
  history: "문진",
  exam: "신체진찰",
  education: "환자교육",
};

const MAX_MS = 12 * 60 * 1000; // 12분 기준으로 채워지는 느낌(CPX 표준 시간대)

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function fmtMin(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m >= 1 ? `${m}분 ${s % 60}초` : `${s}초`;
}

// 면담 화면 상단의 실시간 진행 막대(+ 켜기/끄기 토글)
// 끄면 시험 중에는 막대가 보이지 않는다(소요시간은 계속 기록되어 최종 피드백에만 표시).
export function TimerBar({ on, onToggle, durations, phase, currentMs }: TimerInfo) {
  // 꺼짐: 시험 화면에서 막대를 숨기고, 다시 켤 수 있는 토글 버튼만 우측에 둔다.
  if (!on) {
    return (
      <div className="flex justify-end border-b border-ink/10 px-5 py-2">
        <button
          onClick={onToggle}
          title="타이머 켜기"
          className="rounded-full border border-ink/20 px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          ⏱ 타이머 켜기
        </button>
      </div>
    );
  }

  const live: PhaseDurations = { ...durations };
  live[phase] += currentMs;
  const total = live.history + live.exam + live.education;
  const w = (ms: number) => `${Math.min(100, (ms / MAX_MS) * 100)}%`;

  return (
    <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div className="absolute inset-0 flex">
          {(["history", "exam", "education"] as TimedPhase[]).map((p) => (
            <div key={p} style={{ width: w(live[p]), backgroundColor: PHASE_COLOR[p] }} />
          ))}
        </div>
      </div>
      <span className="shrink-0 tabular-nums text-xs text-ink-soft">{fmt(total)}</span>
      <button
        onClick={onToggle}
        title="타이머 끄기"
        className="shrink-0 rounded-full border border-ink/20 px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        ⏱ 끄기
      </button>
    </div>
  );
}

// 채점 결과 우측 상단의 단계별 소요시간 요약 막대
export function FinalTimeBar({ durations }: { durations: PhaseDurations }) {
  const total = durations.history + durations.exam + durations.education;
  if (total <= 0) return null;
  const phases: TimedPhase[] = ["history", "exam", "education"];
  return (
    <div className="w-44">
      <div className="flex h-2 overflow-hidden rounded-full bg-ink/10">
        {phases.map((p) => (
          <div
            key={p}
            style={{ flexGrow: durations[p], backgroundColor: PHASE_COLOR[p] }}
            title={`${PHASE_LABEL[p]} ${fmtMin(durations[p])}`}
          />
        ))}
      </div>
      <div className="mt-1.5 space-y-0.5">
        {phases.map((p) => (
          <div key={p} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PHASE_COLOR[p] }} />
            <span className="w-12">{PHASE_LABEL[p]}</span>
            <span className="tabular-nums">{fmtMin(durations[p])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
