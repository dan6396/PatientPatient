"use client";

import { useState } from "react";
import { getMood, randomMoodId } from "@/backend/cases/moods";
import type { ScoreResponse, ExamMessage } from "@/backend/cases/case-types";
import Chat, { type Turn } from "./Chat";
import PhysicalExam from "./PhysicalExam";
import ScoreReport from "./ScoreReport";

type Phase = "history" | "exam" | "education" | "scoring" | "result";
type ExamData = { performedParts: string[]; examMessages: ExamMessage[] };

export default function Encounter({
  caseId,
  onExit,
}: {
  caseId: string;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("history");
  const [moodId] = useState(() => randomMoodId()); // 매 면담마다 랜덤 감정 상태
  // 환자가 먼저 말하지 않는다 — 의사(사용자)가 먼저 진료를 시작한다.
  // turns 는 문진·환자교육 두 단계가 "같은 대화"로 이어진다.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [report, setReport] = useState<ScoreResponse | null>(null);

  // 문진 종료 → 신체진찰
  function finishHistory() {
    setPhase("exam");
  }

  // 신체진찰 종료 → 환자교육(대화 계속) — 신체진찰 결과는 보관해뒀다가 채점에 사용
  function finishExam(performedParts: string[], examMessages: ExamMessage[]) {
    setExamData({ performedParts, examMessages });
    setPhase("education");
  }

  // 환자교육 종료 → 채점(문진+교육 대화 전체 + 신체진찰)
  async function finishEducation() {
    setPhase("scoring");
    try {
      const transcript = turns.filter((t) => t.content.trim().length > 0);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          caseId,
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
    setReport(null);
    setPhase("history");
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
      />
    );
  }

  if (phase === "exam") {
    return <PhysicalExam caseId={caseId} onFinish={finishExam} onExit={onExit} />;
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
          patientMood={getMood(moodId).label}
          onRestart={restart}
          onExit={onExit}
        />
      </div>
    );
  }
  return null;
}
