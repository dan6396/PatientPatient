"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "recording" | "transcribing" | "speaking";

function pickMime(): { mime: string; ext: string } {
  const candidates = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "mp4" }, // Safari/iOS
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: "", ext: "webm" };
}

/**
 * 푸시투토크 음성 레이어. 기존 텍스트 파이프라인은 건드리지 않는다.
 * - startRecording / stopRecordingAndTranscribe : 누르는 동안 녹음 → STT 텍스트 반환
 * - speak : 텍스트를 TTS로 재생
 * - levelRef : 0~1 오디오 진폭 (비주얼라이저가 매 프레임 읽음, 리렌더 없음)
 */
export function useVoice() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const levelRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const extRef = useRef("webm");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  function ensureCtx(): AudioContext {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  function runLevelLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      // 부드럽게 따라가며 살짝 증폭
      levelRef.current += (Math.min(1, rms * 3.2) - levelRef.current) * 0.35;
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopLevelLoop() {
    cancelAnimationFrame(rafRef.current);
    levelRef.current = 0;
  }

  function stopSpeaking() {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    stopLevelLoop();
  }

  const startRecording = useCallback(async () => {
    setError(null);
    stopSpeaking(); // 재생 중이면 멈추고 녹음
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = ensureCtx();
      await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      const { mime, ext } = pickMime();
      extRef.current = ext;
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      recorderRef.current = mr;

      setStatus("recording");
      runLevelLoop();
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저에서 마이크를 허용해 주세요.");
      setStatus("idle");
    }
  }, []);

  // 녹음 정지 → STT 텍스트 반환 (실패 시 "")
  const stopRecordingAndTranscribe = useCallback(async (): Promise<string> => {
    const mr = recorderRef.current;
    if (!mr) return "";

    const blob: Blob = await new Promise((resolve) => {
      mr.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
      try {
        mr.stop();
      } catch {
        resolve(new Blob(chunksRef.current));
      }
    });

    stopLevelLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;

    if (blob.size === 0) {
      setStatus("idle");
      return "";
    }

    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, `audio.${extRef.current}`);
      const r = await fetch("/api/stt", { method: "POST", body: form });
      if (!r.ok) throw new Error("stt failed");
      const data = (await r.json()) as { text?: string };
      setStatus("idle");
      return (data.text ?? "").trim();
    } catch {
      setError("음성 인식에 실패했어요. 다시 말씀해 주세요.");
      setStatus("idle");
      return "";
    }
  }, []);

  // 텍스트 → TTS 재생. onStart 는 "실제 재생이 시작되는 순간" 호출(텍스트 동기 공개용).
  // 실패는 조용히 무시(텍스트는 화면에 그대로 남음).
  const speak = useCallback(async (text: string, onStart?: () => void) => {
    if (!text.trim()) return;
    stopSpeaking();
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) return;
      const arr = await r.arrayBuffer();
      const url = URL.createObjectURL(new Blob([arr], { type: "audio/mpeg" }));
      urlRef.current = url;
      const audio = new Audio(url);
      audioElRef.current = audio;

      const ctx = ensureCtx();
      await ctx.resume();
      const node = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      node.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;

      setStatus("speaking");
      runLevelLoop();

      audio.onended = () => {
        stopLevelLoop();
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        audioElRef.current = null;
        setStatus("idle");
      };
      await audio.play();
      onStart?.(); // 재생 시작 → 텍스트를 이 순간 공개하면 음성과 동기됨
    } catch {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    status,
    error,
    levelRef,
    startRecording,
    stopRecordingAndTranscribe,
    speak,
    stopSpeaking,
  };
}
