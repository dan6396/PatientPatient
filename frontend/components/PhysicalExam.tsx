"use client";

import { useRef, useState } from "react";
import { getCase } from "@/backend/cases";
import { useVoice } from "../hooks/useVoice";
import VoiceVisualizer from "./VoiceVisualizer";
import type { ExamPartId, ExamMessage, ExamDialogueTurn, PatientCase } from "@/backend/cases/case-types";
import type { VoiceStatus } from "../hooks/useVoice";
import { TimerBar, type TimerInfo } from "./TimerBar";

interface ExamMedia {
  baseImage?: string;        // 영상 종료 후 되돌아갈 정지 이미지
  animationVideo?: string;   // 재생할 영상
  freezeAtEnd?: boolean;     // true면 끝나도 이미지로 안 바꾸고 마지막 프레임에서 정지
}

const SEATED_STILL = "/exam-media/seated_patient_front.jpeg";

// 기본(휴지) 상태: 앉아있는 환자 영상 1회 재생 후 마지막 프레임에서 정지.
const DEFAULT_EXAM_MEDIA: ExamMedia = {
  animationVideo: "/exam-media/seated_patient_intro.mp4",
  freezeAtEnd: true,
};

// case 8(관절 촉진) + 손가락 부위 → 손가락 촉진 영상 재생.
// 재생이 끝나면(freezeAtEnd 아님) 기본 인트로 영상으로 전환되어 인트로 재생 후 freeze.
// 영상이 손가락 촉진 장면이므로 다른 부위(손목·발목 등) 촉진에는 재생하지 않는다.
function resolveExamMedia(
  partId: ExamPartId,
  region?: string,
  animationKey?: string,
  subtypes?: string[]
): ExamMedia {
  if (partId === "joint_palpation" && region === "손가락") {
    return {
      animationVideo: "/exam-media/Doctor_palpates_patient_s_finger.mp4",
    };
  }
  // 무릎 관절 촉진 → 무릎 관절선 촉진 영상 재생.
  if (partId === "joint_palpation" && region === "무릎") {
    return {
      animationVideo: "/exam-media/knee_palpation.mp4",
    };
  }
  // 무릎 수동 ROM → 무릎 수동 ROM 영상 재생. (비침범 부위라 subtype으로 식별)
  if (
    partId === "joint_rom" &&
    region === "무릎" &&
    subtypes?.includes("수동")
  ) {
    return {
      animationVideo: "/exam-media/knee_passive_rom.mp4",
    };
  }
  // 눈(결막) 검사 → 눈 검사 영상 재생, 끝나면 인트로 영상으로 전환.
  if (partId === "eyes") {
    return {
      animationVideo: "/exam-media/eye_examination.mp4",
    };
  }
  // 림프절 촉진 → 림프절 검사 영상 재생.
  if (partId === "lymph_nodes") {
    return {
      animationVideo: "/exam-media/lymph_nodes_palpation.mp4",
    };
  }
  // 손가락 관절 능동 ROM → 손 시진+능동 ROM 영상 재생.
  if (animationKey === "anim_joint_rom_finger_active") {
    return {
      animationVideo: "/exam-media/finger_active_rom.mp4",
    };
  }
  // 손목 관절 수동 ROM → 손목 촉진+ROM 영상 재생.
  if (animationKey === "anim_joint_rom_wrist_passive") {
    return {
      animationVideo: "/exam-media/wrist_passive_rom.mp4",
    };
  }
  // TODO: 다른 case·부위 영상 추가 예정
  return DEFAULT_EXAM_MEDIA;
}

type ExamTurn =
  | { type: "student"; input: string }
  | { type: "finding"; partId: ExamPartId; label: string; finding: string; animationKey: string }
  | { type: "clarify"; message: string }
  | { type: "unmatched" };

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "음성 진찰 준비됨",
  listening: "듣고 있어요 · 진찰 지시를 말씀하세요",
  recording: "말하는 중…",
  transcribing: "인식 중…",
  speaking: "소견 읽는 중…",
};

export default function PhysicalExam({
  caseId,
  onFinish,
  onExit,
  caseData,
  timer,
}: {
  caseId: string;
  onFinish: (
    performedParts: string[],
    examMessages: ExamMessage[],
    examDialogue: ExamDialogueTurn[]
  ) => void;
  onExit: () => void;
  caseData?: PatientCase;
  timer?: TimerInfo; // 단계를 넘어가도 이어지는 타이머(Encounter가 소유)
}) {
  const activeCase = caseData ?? getCase(caseId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ExamTurn[]>([]);
  const [performedSet, setPerformedSet] = useState<Set<ExamPartId>>(new Set());
  const [examMessages, setExamMessages] = useState<ExamMessage[]>([]);
  const [latestMedia, setLatestMedia] = useState<ExamMedia>(DEFAULT_EXAM_MEDIA);
  const [videoKey, setVideoKey] = useState(0);
  const [latestFinding, setLatestFinding] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true); // 기본은 음성 진찰(아래에서 텍스트로 전환 가능)
  const [conversing, setConversing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const voice = useVoice(caseId);

  function scrollBottom() {
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      50
    );
  }

  // 텍스트 제출 → 소견 반환
  async function submit(overrideText?: string): Promise<string> {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || loading) return "";
    if (!overrideText) setInput("");
    setLoading(true);
    setTurns((t) => [...t, { type: "student", input: trimmed }]);

    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, caseId, caseData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "exam failed");

      // 진찰 행위가 모호 → 되묻기(소견 노출하지 않음)
      if (data.clarify) {
        setTurns((t) => [...t, { type: "clarify", message: data.clarify }]);
        scrollBottom();
        return data.clarify as string;
      }

      if (data.unmatched || !data.results?.length) {
        setTurns((t) => [...t, { type: "unmatched" }]);
        setExamMessages((m) => [...m, { input: trimmed, partIds: [] }]);
        scrollBottom();
        return "해당 진찰을 인식하지 못했습니다.";
      }

      const results = data.results as {
        partId: ExamPartId;
        label: string;
        finding: string;
        animationKey: string;
        region?: string;
        subtypes?: string[];
      }[];

      setTurns((t) => [
        ...t,
        ...results.map((r) => ({
          type: "finding" as const,
          partId: r.partId,
          label: r.label,
          finding: r.finding,
          animationKey: r.animationKey,
        })),
      ]);

      const last = results[results.length - 1];
      const newMedia = resolveExamMedia(
        last.partId,
        last.region,
        last.animationKey,
        last.subtypes
      );
      setLatestMedia(newMedia);
      // freeze(기본 영상)는 매번 재생하지 않고, 재생형 영상(손가락 촉진 등)만 키를 올려 재생.
      if (newMedia.animationVideo && !newMedia.freezeAtEnd) {
        setVideoKey((k) => k + 1);
      }

      const findingText = results.map((r) => r.finding).join(" ");
      setLatestFinding(findingText);

      setPerformedSet((s) => {
        const next = new Set(s);
        for (const r of results) next.add(r.partId);
        return next;
      });
      setExamMessages((m) => [
        ...m,
        { input: trimmed, partIds: results.map((r) => r.partId) },
      ]);

      scrollBottom();
      return findingText;
    } catch {
      setTurns((t) => [...t, { type: "unmatched" }]);
      return "";
    } finally {
      setLoading(false);
    }
  }

  // 핸즈프리: 발화 → 제출 → 소견 TTS
  async function handleUtterance(text: string) {
    const finding = await submit(text);
    if (finding) await voice.speak(finding);
  }
  const utterRef = useRef(handleUtterance);
  utterRef.current = handleUtterance;

  async function startConversation() {
    setConversing(true);
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

  return (
    <div className="mx-auto flex h-[100dvh] max-w-4xl flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div className="min-w-0">
          <button
            onClick={onExit}
            className="text-xs uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
          >
            ← 증례
          </button>
          <h1 className="truncate font-display text-xl text-ink">
            {activeCase.title} · 신체진찰
          </h1>
        </div>
        <button
          onClick={() => {
            if (voiceOn) exitVoice();
            // 진찰 대화(지시→소견)를 피드백 "대화 내역"에 넘긴다.
            const dialogue: ExamDialogueTurn[] = turns.map((t) =>
              t.type === "student"
                ? { kind: "student", text: t.input }
                : t.type === "finding"
                  ? { kind: "finding", label: t.label, text: t.finding }
                  : t.type === "clarify"
                    ? { kind: "clarify", text: t.message }
                    : { kind: "unmatched" }
            );
            onFinish([...performedSet], examMessages, dialogue);
          }}
          disabled={loading}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-50"
        >
          환자교육으로 넘어가기
        </button>
      </div>

      {timer && <TimerBar {...timer} />}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 미디어 창 — 이미지·애니메이션 전용 */}
        <div className="flex flex-[2] min-h-0 items-center justify-center border-b border-ink/10 p-6">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-ink/[0.02]">
            {latestMedia.animationVideo ? (
              <MediaPlayer
                key={
                  latestMedia.freezeAtEnd
                    ? latestMedia.animationVideo
                    : `${latestMedia.animationVideo}-${videoKey}`
                }
                videoSrc={latestMedia.animationVideo}
                freezeAtEnd={latestMedia.freezeAtEnd}
                onFinished={() => setLatestMedia(DEFAULT_EXAM_MEDIA)}
              />
            ) : (
              <img
                src={latestMedia.baseImage ?? SEATED_STILL}
                alt="신체진찰"
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </div>

        {/* 음성 모드일 때만: 컴팩트 비주얼라이저 바 */}
        {voiceOn && (
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink/10 px-5">
            <VoiceVisualizer levelRef={voice.levelRef} status={voice.status} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-ink-soft">{STATUS_LABEL[voice.status]}</p>
              {latestFinding && (
                <p className="truncate text-[12px] text-ink">{latestFinding}</p>
              )}
            </div>
            {voice.error && (
              <p className="shrink-0 text-[11px] text-red-700">{voice.error}</p>
            )}
          </div>
        )}

        {/* 채팅 로그 — 항상 표시 */}
        <div ref={scrollRef} className="flex-[1] min-h-0 space-y-2 overflow-y-auto px-5 py-3">
          {turns.length === 0 && (
            <p className="py-2 text-center text-xs text-ink-soft/40">
              {voiceOn ? "진찰 지시를 말씀하세요" : "아래 입력창에 진찰 지시를 입력하세요"}
            </p>
          )}
          {turns.map((turn, i) => {
            if (turn.type === "student") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl bg-ink px-3 py-1.5 text-[13px] leading-snug text-[var(--bg)]">
                    {turn.input}
                  </div>
                </div>
              );
            }
            if (turn.type === "finding") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl border border-ink/10 bg-[var(--bg)]/60 px-3 py-1.5">
                    <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft/50">
                      {turn.label}
                    </span>
                    <span className="text-[13px] leading-snug text-ink">{turn.finding}</span>
                  </div>
                </div>
              );
            }
            if (turn.type === "clarify") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl border border-amber-400/30 bg-amber-50/60 px-3 py-1.5">
                    <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700/70">
                      확인
                    </span>
                    <span className="text-[13px] leading-snug text-ink">{turn.message}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[80%] rounded-xl border border-ink/10 bg-[var(--bg)]/60 px-3 py-1.5 text-[13px] leading-snug text-ink-soft/50">
                  인식하지 못했습니다. 다른 표현으로 시도해 주세요.
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-ink/10 bg-[var(--bg)]/60 px-3 py-2">
                <span className="inline-flex gap-1"><Dot /><Dot /><Dot /></span>
              </div>
            </div>
          )}
        </div>

        {/* 하단: 음성 컨트롤 or 텍스트 입력 */}
        {voiceOn ? (
          <div className="flex items-center justify-between border-t border-ink/10 px-5 py-3">
            {conversing ? (
              <button
                onClick={stopConversation}
                className="rounded-full border border-ink/30 px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
              >
                ■ 멈춤
              </button>
            ) : (
              <button
                onClick={startConversation}
                className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
              >
                ● 진찰 시작
              </button>
            )}
            <button
              onClick={exitVoice}
              className="text-xs text-ink-soft underline-offset-2 hover:underline"
            >
              ⌨ 텍스트 모드
            </button>
          </div>
        ) : (
          <div className="border-t border-ink/10 px-5 py-3">
            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="신체진찰 지시를 입력하세요 (예: 활력징후 확인하겠습니다)"
                disabled={loading}
                className="flex-1 rounded-full border border-ink/20 bg-[var(--bg)]/50 px-4 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-ink/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-[var(--bg)] transition-opacity disabled:opacity-40"
              >
                수행
              </button>
            </form>
            <div className="mt-2 flex justify-center">
              <button
                onClick={enterVoice}
                className="text-xs text-ink-soft underline-offset-2 hover:underline"
              >
                🎙 음성으로 진찰하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" />;
}

function MediaPlayer({
  videoSrc,
  freezeAtEnd,
  onFinished,
}: {
  videoSrc: string;
  freezeAtEnd?: boolean;
  onFinished?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);

  function handleEnded() {
    setEnded(true);
    // freeze가 아니면(예: 손가락 촉진 영상) 끝난 뒤 기본 인트로 영상으로 전환한다.
    if (!freezeAtEnd) onFinished?.();
  }

  function replay() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play();
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        className="h-full w-full object-contain"
      />
      {/* freeze 상태에서만 다시 재생 제공 (재생형 영상은 끝나면 인트로로 전환됨) */}
      {ended && freezeAtEnd && (
        <button
          onClick={replay}
          className="absolute bottom-3 right-3 rounded-full border border-ink/20 bg-[var(--bg)]/80 px-3 py-1 text-xs text-ink backdrop-blur-sm transition-colors hover:bg-ink/10"
        >
          ↺ 다시 재생
        </button>
      )}
    </div>
  );
}
