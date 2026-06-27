"use client";

import { useEffect, useRef, useState } from "react";
import { getCase } from "@/backend/cases";
import type { ScoreResponse } from "@/backend/cases/case-types";
import ScoreReport from "./ScoreReport";
import { useVoice } from "../hooks/useVoice";
import MicButton from "./MicButton";
import VoiceVisualizer from "./VoiceVisualizer";

type Turn = { role: "doctor" | "patient"; content: string };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function Chat({
  caseId,
  onExit,
}: {
  caseId: string;
  onExit: () => void;
}) {
  const activeCase = getCase(caseId);
  const initialTurns = (): Turn[] => [
    { role: "patient", content: activeCase.openingStatement },
  ];

  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voicePreparing, setVoicePreparing] = useState(false);
  const [report, setReport] = useState<ScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();

  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // 텍스트 한 줄을 환자 에이전트에 전달하는 공용 함수(텍스트/음성 공통). 최종 응답 텍스트 반환.
  async function sendUserMessage(text: string, silent = false): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed || streaming || ended) return "";
    setError(null);

    const nextTurns: Turn[] = [...turns, { role: "doctor", content: trimmed }];
    setTurns(nextTurns);
    setStreaming(true);
    setTurns((t) => [...t, { role: "patient", content: "" }]);

    let acc = "";
    try {
      const apiMessages = nextTurns.map((t) => ({
        role: t.role === "doctor" ? ("user" as const) : ("assistant" as const),
        content: t.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, caseId }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!silent) {
          setTurns((t) => {
            const copy = [...t];
            copy[copy.length - 1] = { role: "patient", content: acc };
            return copy;
          });
        }
      }
    } catch {
      setError("환자 응답을 받지 못했습니다. 다시 시도해 주세요.");
      setTurns((t) => t.slice(0, -1));
      acc = "";
    } finally {
      setStreaming(false);
    }
    return acc;
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendUserMessage(text);
  }

  async function handleMicRelease() {
    const text = await voice.stopRecordingAndTranscribe();
    if (!text) return;
    setVoicePreparing(true);
    const final = await sendUserMessage(text, true);
    if (!final) {
      setVoicePreparing(false);
      return;
    }
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setTurns((t) => {
        const c = [...t];
        for (let i = c.length - 1; i >= 0; i--) {
          if (c[i].role === "patient") {
            c[i] = { ...c[i], content: final };
            break;
          }
        }
        return c;
      });
      setVoicePreparing(false);
    };
    await voice.speak(final, reveal);
    reveal();
  }

  async function endInterview() {
    if (scoring) return;
    voice.stopSpeaking();
    setEnded(true);
    setScoring(true);
    setError(null);
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
    } catch {
      setError("채점에 실패했습니다. 다시 시도해 주세요.");
      setEnded(false);
    } finally {
      setScoring(false);
    }
  }

  function restart() {
    voice.stopSpeaking();
    setTurns(initialTurns());
    setInput("");
    setSeconds(0);
    setEnded(false);
    setReport(null);
    setError(null);
  }

  if (report) {
    return (
      <div className="px-5 py-10">
        <ScoreReport report={report} onRestart={restart} onExit={onExit} />
      </div>
    );
  }

  const micDisabled =
    streaming || ended || voice.status === "transcribing" || voice.status === "speaking";

  const lastDoctor = [...turns].reverse().find((t) => t.role === "doctor")?.content ?? "";
  const lastPatient = [...turns].reverse().find((t) => t.role === "patient")?.content ?? "";

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div className="min-w-0">
          <button
            onClick={onExit}
            disabled={streaming}
            className="text-xs uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
          >
            ← 증례
          </button>
          <h1 className="truncate font-display text-xl text-ink">{activeCase.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-lg tabular-nums text-ink">{fmtTime(seconds)}</span>
          <button
            onClick={endInterview}
            disabled={scoring}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-50"
          >
            {scoring ? "채점 중…" : "면담 종료"}
          </button>
        </div>
      </div>

      {voiceOn ? (
        /* ── 음성 모드: 오브 메인 + 최근 대화만 작게 ── */
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <VoiceVisualizer levelRef={voice.levelRef} status={voice.status} size={320} />
            <div className="min-h-[3.5rem] max-w-md space-y-1">
              {lastDoctor && <p className="text-xs text-ink-soft/70">나: {lastDoctor}</p>}
              {voicePreparing ? (
                <span className="inline-flex gap-1">
                  <Dot /> <Dot /> <Dot />
                </span>
              ) : (
                lastPatient && (
                  <p className="text-[15px] leading-relaxed text-ink">{lastPatient}</p>
                )
              )}
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-ink/10 py-5">
            <MicButton
              status={voice.status}
              disabled={micDisabled}
              onPressStart={voice.startRecording}
              onPressEnd={handleMicRelease}
            />
            {voice.error && <p className="text-xs text-red-700">{voice.error}</p>}
            <button
              onClick={() => {
                voice.stopSpeaking();
                setVoiceOn(false);
              }}
              className="text-xs text-ink-soft underline-offset-2 hover:underline"
            >
              ⌨ 텍스트 모드로 전환
            </button>
          </div>
        </>
      ) : (
        /* ── 텍스트 모드 ── */
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {turns.map((t, i) => (
              <div
                key={i}
                className={`flex ${t.role === "doctor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    t.role === "doctor"
                      ? "bg-ink text-[var(--bg)]"
                      : "border border-ink/10 bg-[var(--bg)]/60 text-ink"
                  }`}
                >
                  {t.content || (
                    <span className="inline-flex gap-1">
                      <Dot /> <Dot /> <Dot />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {error && <p className="text-center text-sm text-red-700">{error}</p>}
          </div>

          <div className="space-y-3 border-t border-ink/10 px-5 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ended ? "면담이 종료되었습니다" : "환자에게 질문하세요 (의사 역할)"}
                disabled={streaming || ended}
                className="flex-1 rounded-full border border-ink/20 bg-[var(--bg)]/50 px-5 py-3 text-[15px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-ink/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={streaming || ended || !input.trim()}
                className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-40"
              >
                전송
              </button>
            </form>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setVoiceOn(true);
                  if (lastPatient) voice.speak(lastPatient);
                }}
                disabled={ended}
                className="text-xs text-ink-soft underline-offset-2 hover:underline disabled:opacity-40"
              >
                🎙 음성 모드로 전환
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" />;
}
