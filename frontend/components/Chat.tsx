"use client";

import { useEffect, useRef, useState } from "react";
import { getCase } from "@/backend/cases";
import { useVoice, type VoiceStatus } from "../hooks/useVoice";
import VoiceVisualizer from "./VoiceVisualizer";

export type Turn = { role: "doctor" | "patient"; content: string };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "진료를 시작하세요 · 먼저 말씀하세요",
  listening: "듣고 있어요 · 편하게 말씀하세요",
  recording: "말하는 중…",
  transcribing: "인식 중…",
  speaking: "환자가 말하는 중…",
};

export default function Chat({
  caseId,
  moodId,
  turns,
  setTurns,
  onFinishHistory,
  onExit,
  finishLabel = "면담 종료",
  phaseLabel,
}: {
  caseId: string;
  moodId: string;
  turns: Turn[];
  setTurns: React.Dispatch<React.SetStateAction<Turn[]>>;
  onFinishHistory: () => void;
  onExit: () => void;
  finishLabel?: string; // 진행 버튼 문구(단계별로 다름)
  phaseLabel?: string; // 헤더에 붙는 단계 이름(예: "환자교육")
}) {
  const activeCase = getCase(caseId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true); // 기본은 음성 모드(아래에서 텍스트로 전환 가능)
  const [conversing, setConversing] = useState(false);
  const [voicePreparing, setVoicePreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice(caseId, moodId);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function sendUserMessage(text: string, silent = false): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed || streaming) return "";
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
        body: JSON.stringify({ messages: apiMessages, caseId, moodId }),
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

  // 핸즈프리: 한 발화(text)를 받아 전송 → 환자 응답을 음성과 동시에 공개
  async function handleUtterance(text: string) {
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
  // 루프가 항상 최신 핸들러(최신 turns)를 호출하도록 ref로 고정
  const utterRef = useRef(handleUtterance);
  utterRef.current = handleUtterance;

  async function startConversation() {
    setConversing(true);
    // 의사(사용자)가 먼저 말한다 — 이전(문진) 단계의 마지막 환자 답변을 다시 읊지 않는다.
    await voice.startHandsFree((t) => utterRef.current(t));
  }
  function stopConversation() {
    voice.stopHandsFree();
    setConversing(false);
  }

  function enterVoice() {
    setVoiceOn(true);
    startConversation();
  }
  function exitVoice() {
    stopConversation();
    voice.stopSpeaking();
    setVoiceOn(false);
  }

  function finish() {
    stopConversation();
    voice.stopSpeaking();
    onFinishHistory();
  }

  // 이 단계(Chat 인스턴스) 진입 시점의 대화 길이 — 이전 단계(문진) 내용은 표시/낭독하지 않는다.
  const baseLen = useRef(turns.length);
  const hasNew = turns.length > baseLen.current;

  const lastDoctor = hasNew
    ? [...turns].reverse().find((t) => t.role === "doctor")?.content ?? ""
    : "";
  const lastPatient = hasNew
    ? [...turns].reverse().find((t) => t.role === "patient")?.content ?? ""
    : "";

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div className="min-w-0">
          <button
            onClick={onExit}
            disabled={streaming}
            className="text-xs uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
          >
            ← 증례
          </button>
          <h1 className="truncate font-display text-xl text-ink">
            {activeCase.title}
            {phaseLabel && <span className="text-ink-soft"> · {phaseLabel}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-display text-lg tabular-nums text-ink">{fmtTime(seconds)}</span>
          <button
            onClick={finish}
            disabled={streaming}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-50"
          >
            {finishLabel}
          </button>
        </div>
      </div>

      {voiceOn ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <VoiceVisualizer levelRef={voice.levelRef} status={voice.status} size={320} />
            <p className="text-sm tracking-wide text-ink-soft">
              {voicePreparing
                ? "환자가 답하는 중…"
                : !hasNew && phaseLabel
                ? `${phaseLabel}을 진행하세요 · 환자에게 설명해 주세요`
                : STATUS_LABEL[voice.status]}
            </p>
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
            {(error || voice.error) && (
              <p className="text-sm text-red-700">{error || voice.error}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-ink/10 py-5">
            {conversing ? (
              <button
                onClick={stopConversation}
                className="rounded-full border border-ink/30 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
              >
                ■ 대화 멈춤
              </button>
            ) : (
              <button
                onClick={startConversation}
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
              >
                ● 대화 시작
              </button>
            )}
            <button
              onClick={exitVoice}
              className="text-xs text-ink-soft underline-offset-2 hover:underline"
            >
              ⌨ 텍스트 모드로 전환
            </button>
          </div>
        </>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {turns.length === 0 && !error && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="font-display text-lg text-ink">진료를 시작하세요</p>
                <p className="text-sm text-ink-soft/70">환자에게 먼저 질문해 주세요.</p>
              </div>
            )}
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
                placeholder="환자에게 질문하세요 (의사 역할)"
                disabled={streaming}
                className="flex-1 rounded-full border border-ink/20 bg-[var(--bg)]/50 px-5 py-3 text-[15px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-ink/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-40"
              >
                전송
              </button>
            </form>
            <div className="flex justify-center">
              <button
                onClick={enterVoice}
                className="text-xs text-ink-soft underline-offset-2 hover:underline"
              >
                🎙 음성으로 대화하기
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
