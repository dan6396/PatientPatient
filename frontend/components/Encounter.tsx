"use client";

import { useState } from "react";
import { getMood, randomMoodId } from "@/backend/cases/moods";
import type { ScoreResponse } from "@/backend/cases/case-types";
import Chat, { type Turn } from "./Chat";
import ScoreReport from "./ScoreReport";

type Phase = "history" | "scoring" | "result";

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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [report, setReport] = useState<ScoreResponse | null>(null);

  async function score() {
    setPhase("scoring");
    try {
      const transcript = turns.filter((t) => t.content.trim().length > 0);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, caseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "score failed");
      setReport(data as ScoreResponse);
      setPhase("result");
    } catch {
      setPhase("history");
      alert("채점에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  function restart() {
    setTurns([]);
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
        onFinishHistory={score}
        onExit={onExit}
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
