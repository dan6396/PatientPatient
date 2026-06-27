"use client";

import { useEffect, useRef } from "react";
import type { VoiceStatus } from "../hooks/useVoice";

const LABEL: Record<VoiceStatus, string> = {
  idle: "누르고 말하기",
  recording: "듣는 중… 떼면 전송",
  transcribing: "인식 중…",
  speaking: "환자가 말하는 중…",
};

/**
 * 푸시투토크 버튼. 누르는 동안만 녹음(onPressStart), 떼면 전송(onPressEnd).
 * 마우스 / 터치 / 스페이스바 홀드 지원. 로직은 부모(useVoice)가 갖고, 여기선 입력만.
 */
export default function MicButton({
  status,
  disabled,
  onPressStart,
  onPressEnd,
}: {
  status: VoiceStatus;
  disabled: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  const pressing = useRef(false);

  const press = () => {
    if (disabled || pressing.current) return;
    pressing.current = true;
    onPressStart();
  };
  const release = () => {
    if (!pressing.current) return;
    pressing.current = false;
    onPressEnd();
  };

  // 스페이스바 홀드 (데스크톱 보조)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const isRec = status === "recording";

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <button
        type="button"
        aria-label="누르고 말하기"
        disabled={disabled}
        onMouseDown={press}
        onMouseUp={release}
        onMouseLeave={release}
        onTouchStart={(e) => {
          e.preventDefault();
          press();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          release();
        }}
        className={`relative grid h-16 w-16 place-items-center rounded-full transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
          isRec
            ? "scale-110 bg-ink text-[var(--bg)] shadow-lg shadow-black/20"
            : "bg-ink text-[var(--bg)] hover:-translate-y-0.5"
        }`}
      >
        {isRec && (
          <span className="absolute inset-0 animate-ping rounded-full bg-ink/30" />
        )}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
        </svg>
      </button>
      <span className="text-xs tracking-wide text-ink-soft">{LABEL[status]}</span>
    </div>
  );
}
