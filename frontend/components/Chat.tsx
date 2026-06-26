"use client";

import { useEffect, useRef, useState } from "react";
import { seedCase } from "@/backend/cases/seed-case";
import ScoreReport, { type ScoredItem } from "./ScoreReport";

type Turn = { role: "doctor" | "patient"; content: string };

const initialTurns = (): Turn[] => [
  { role: "patient", content: seedCase.openingStatement },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function Chat() {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [report, setReport] = useState<{ items: ScoredItem[]; summary: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 카운트업 타이머 (면담 종료 전까지)
  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [ended]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send() {
    const text = input.trim();
    if (!text || streaming || ended) return;
    setError(null);
    setInput("");

    const nextTurns: Turn[] = [...turns, { role: "doctor", content: text }];
    setTurns(nextTurns);
    setStreaming(true);

    // 환자 빈 메시지를 먼저 추가하고 스트림으로 채운다
    setTurns((t) => [...t, { role: "patient", content: "" }]);

    try {
      const apiMessages = nextTurns.map((t) => ({
        role: t.role === "doctor" ? ("user" as const) : ("assistant" as const),
        content: t.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns((t) => {
          const copy = [...t];
          copy[copy.length - 1] = { role: "patient", content: acc };
          return copy;
        });
      }
    } catch {
      setError("환자 응답을 받지 못했습니다. 다시 시도해 주세요.");
      setTurns((t) => t.slice(0, -1)); // 빈 환자 메시지 제거
    } finally {
      setStreaming(false);
    }
  }

  async function endInterview() {
    if (scoring) return;
    setEnded(true);
    setScoring(true);
    setError(null);
    try {
      const transcript = turns.filter((t) => t.content.trim().length > 0);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "score failed");
      setReport({ items: data.items, summary: data.summary });
    } catch {
      setError("채점에 실패했습니다. 다시 시도해 주세요.");
      setEnded(false);
    } finally {
      setScoring(false);
    }
  }

  function restart() {
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
        <ScoreReport items={report.items} summary={report.summary} onRestart={restart} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      {/* 상단 바: 증례 + 타이머 */}
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-soft">증례</p>
          <h1 className="font-display text-xl text-ink">{seedCase.title}</h1>
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

      {/* 대화 */}
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

      {/* 입력 */}
      <div className="border-t border-ink/10 px-5 py-4">
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
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" />;
}
