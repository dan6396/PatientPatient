"use client";

import { useEffect, useRef, useState } from "react";
import { getMood, randomMoodId } from "@/backend/cases/moods";
import type { ScoreResponse, ExamMessage, ExamDialogueTurn, PatientCase } from "@/backend/cases/case-types";
import Chat, { type Turn } from "./Chat";
import PhysicalExam from "./PhysicalExam";
import ScoreReport from "./ScoreReport";
import type { TimerInfo, PhaseDurations } from "./TimerBar";

type Phase = "history" | "exam" | "education" | "scoring" | "result";
type ExamData = {
  performedParts: string[];
  examMessages: ExamMessage[];
  dialogue: ExamDialogueTurn[];
};
const ZERO: PhaseDurations = { history: 0, exam: 0, education: 0 };

export default function Encounter({
  caseId,
  onExit,
  caseData,
}: {
  caseId: string;
  onExit: () => void;
  caseData?: PatientCase; // 업로드된 커스텀 증례(있으면 caseId 대신 사용)
}) {
  const [phase, setPhase] = useState<Phase>("history");
  const [moodId] = useState(() => randomMoodId()); // 매 면담마다 랜덤 감정 상태
  // 환자가 먼저 말하지 않는다 — 의사(사용자)가 먼저 진료를 시작한다.
  // turns 는 문진·환자교육 두 단계가 "같은 대화"로 이어진다.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [historyLen, setHistoryLen] = useState(0); // 문진 종료 시점의 turns 길이(피드백에서 신체진찰을 사이에 끼우기 위함)
  const [report, setReport] = useState<ScoreResponse | null>(null);

  // ── 단계별 타이머 (단계를 넘어가도 이어진다) ──
  const [timerOn, setTimerOn] = useState(true);
  const [durations, setDurations] = useState<PhaseDurations>(ZERO);
  const phaseStartRef = useRef<number>(Date.now()); // 현재 단계 시작 시각
  const [nowTick, setNowTick] = useState(Date.now());

  // 면담 단계(history/exam/education) 동안 1초마다 실시간 갱신
  useEffect(() => {
    if (phase === "scoring" || phase === "result") return;
    const t = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  // 현재 단계 누적시간을 durations에 합치고 다음 단계 시작점을 리셋
  function commitPhase(p: "history" | "exam" | "education") {
    const elapsed = Date.now() - phaseStartRef.current;
    phaseStartRef.current = Date.now();
    setDurations((d) => ({ ...d, [p]: d[p] + elapsed }));
  }

  // 문진 종료 → 신체진찰
  function finishHistory() {
    commitPhase("history");
    setHistoryLen(turns.length); // 여기까지가 문진 대화 — 이후는 교육
    setPhase("exam");
  }

  // 신체진찰 종료 → 환자교육(대화 계속)
  function finishExam(
    performedParts: string[],
    examMessages: ExamMessage[],
    dialogue: ExamDialogueTurn[]
  ) {
    commitPhase("exam");
    setExamData({ performedParts, examMessages, dialogue });
    setPhase("education");
  }

  // 환자교육 종료 → 채점(문진+교육 대화 전체 + 신체진찰)
  async function finishEducation() {
    commitPhase("education");
    setPhase("scoring");
    try {
      const transcript = turns.filter((t) => t.content.trim().length > 0);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          caseId,
          caseData,
          performedParts: examData?.performedParts ?? [],
          examMessages: examData?.examMessages ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "score failed");
      setReport(data as ScoreResponse);
      setPhase("result");
    } catch {
      setPhase("education");
      alert("채점에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  function restart() {
    setTurns([]);
    setExamData(null);
    setHistoryLen(0);
    setReport(null);
    setDurations(ZERO);
    phaseStartRef.current = Date.now();
    setPhase("history");
  }

  // 현재 단계 컴포넌트에 넘길 타이머 정보
  function makeTimer(p: "history" | "exam" | "education"): TimerInfo {
    return {
      on: timerOn,
      onToggle: () => setTimerOn((v) => !v),
      durations,
      phase: p,
      currentMs: Math.max(0, nowTick - phaseStartRef.current),
    };
  }

  if (phase === "history") {
    return (
      <Chat
        caseId={caseId}
        moodId={moodId}
        turns={turns}
        setTurns={setTurns}
        onFinishHistory={finishHistory}
        onExit={onExit}
        finishLabel="신체진찰로 넘어가기"
        caseData={caseData}
        timer={makeTimer("history")}
      />
    );
  }

  if (phase === "exam") {
    return (
      <PhysicalExam
        caseId={caseId}
        onFinish={finishExam}
        onExit={onExit}
        caseData={caseData}
        timer={makeTimer("exam")}
      />
    );
  }

  if (phase === "education") {
    // 문진 Chat을 그대로 재사용 — 같은 turns 로 대화가 이어진다.
    return (
      <Chat
        caseId={caseId}
        moodId={moodId}
        turns={turns}
        setTurns={setTurns}
        onFinishHistory={finishEducation}
        onExit={onExit}
        finishLabel="채점하기"
        phaseLabel="환자교육"
        caseData={caseData}
        timer={makeTimer("education")}
      />
    );
  }

  if (phase === "scoring") {
    return (
      <div className="grid h-[100dvh] place-items-center">
        <p className="animate-pulse font-display text-lg text-ink-soft">채점 중…</p>
      </div>
    );
  }

  if (report) {
    return (
      <div className="px-5 py-10">
        <ScoreReport
          report={report}
          transcript={turns}
          historyLen={historyLen}
          examDialogue={examData?.dialogue ?? []}
          patientMood={getMood(moodId).label}
          durations={durations}
          onRestart={restart}
          onExit={onExit}
        />
      </div>
    );
  }
  return null;
}
