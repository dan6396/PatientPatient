"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "recording" | "transcribing" | "speaking";

function pickMime(): { mime: string; ext: string } {
  const candidates = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "mp4" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

function rmsOf(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

/**
 * 음성 레이어. 두 가지 모드 — (기존)푸시투토크 + (신규)핸즈프리 자동 대화(VAD).
 * 핸즈프리: 말하면 자동 녹음 → 침묵 감지 시 STT → onUtterance(텍스트) → 환자 응답+TTS → 다시 듣기.
 * 환자 TTS가 재생되는 동안은 듣기를 멈춰 에코를 방지한다.
 */
export function useVoice(caseId?: string, moodId?: string) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const levelRef = useRef(0);
  const caseIdRef = useRef(caseId);
  caseIdRef.current = caseId;
  const moodIdRef = useRef(moodId);
  moodIdRef.current = moodId;

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0); // PTT/TTS 레벨 루프
  const convRafRef = useRef(0); // 핸즈프리 루프
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const extRef = useRef("webm");
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const ttsActiveRef = useRef(false);
  const handsFreeRef = useRef(false);

  function ensureCtx(): AudioContext {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      levelRef.current += (Math.min(1, rmsOf(buf) * 3.2) - levelRef.current) * 0.35;
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }
  function stopLevelLoop() {
    cancelAnimationFrame(rafRef.current);
    levelRef.current = 0;
  }

  function stopSpeaking() {
    ttsActiveRef.current = false;
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

  // 텍스트 → TTS 재생. onStart는 실제 재생 시작 순간 호출.
  const speak = useCallback(async (text: string, onStart?: () => void) => {
    if (!text.trim()) return;
    stopSpeaking();
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, caseId: caseIdRef.current, moodId: moodIdRef.current }),
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

      ttsActiveRef.current = true;
      setStatus("speaking");
      runLevelLoop();

      audio.onended = () => {
        ttsActiveRef.current = false;
        stopLevelLoop();
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        audioElRef.current = null;
        if (!handsFreeRef.current) setStatus("idle");
      };
      await audio.play();
      onStart?.();
    } catch {
      ttsActiveRef.current = false;
      if (!handsFreeRef.current) setStatus("idle");
    }
  }, []);

  async function transcribe(blob: Blob, ext: string): Promise<string> {
    if (blob.size === 0) return "";
    try {
      const form = new FormData();
      form.append("audio", blob, `audio.${ext}`);
      const r = await fetch("/api/stt", { method: "POST", body: form });
      if (!r.ok) return "";
      const data = (await r.json()) as { text?: string };
      return (data.text ?? "").trim();
    } catch {
      return "";
    }
  }

  // ── 핸즈프리 자동 대화 ──
  const startHandsFree = useCallback(
    async (onUtterance: (text: string) => Promise<void>) => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = ensureCtx();
        await ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);

        const mimeInfo = pickMime();
        extRef.current = mimeInfo.ext;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        handsFreeRef.current = true;
        setStatus("listening");

        const THRESH = 0.045;
        const SILENCE_MS = 1100;
        const MIN_UTTER_MS = 500;

        let state: "listening" | "recording" = "listening";
        let recorder: MediaRecorder | null = null;
        let speechStart = 0;
        let silenceStart = 0;
        let busy = false;

        const stopRec = (rec: MediaRecorder): Promise<Blob> =>
          new Promise((resolve) => {
            rec.onstop = () =>
              resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
            try {
              rec.stop();
            } catch {
              resolve(new Blob(chunksRef.current));
            }
          });

        const loop = async () => {
          if (!handsFreeRef.current) return;
          analyser.getByteTimeDomainData(buf);
          const rms = rmsOf(buf);
          const now = performance.now();

          // TTS 재생/처리 중에는 듣지 않음(에코 방지). 레벨도 speak가 구동.
          if (!busy && !ttsActiveRef.current) {
            levelRef.current += (Math.min(1, rms * 3.2) - levelRef.current) * 0.3;

            if (state === "listening") {
              if (rms > THRESH) {
                state = "recording";
                chunksRef.current = [];
                speechStart = now;
                silenceStart = 0;
                recorder = mimeInfo.mime
                  ? new MediaRecorder(stream, { mimeType: mimeInfo.mime })
                  : new MediaRecorder(stream);
                recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) chunksRef.current.push(e.data);
                };
                recorder.start();
                setStatus("recording");
              }
            } else if (state === "recording") {
              if (rms > THRESH) {
                silenceStart = 0;
              } else if (!silenceStart) {
                silenceStart = now;
              } else if (now - silenceStart > SILENCE_MS) {
                const dur = now - speechStart;
                const rec = recorder;
                recorder = null;
                state = "listening";
                busy = true;
                setStatus("transcribing");
                const blob = rec ? await stopRec(rec) : new Blob();
                levelRef.current = 0;
                if (dur >= MIN_UTTER_MS) {
                  const text = await transcribe(blob, mimeInfo.ext);
                  if (text && handsFreeRef.current) {
                    await onUtterance(text); // 전송 + 환자 응답 + TTS
                  }
                }
                // TTS가 끝날 때까지 대기 후 재개
                while (handsFreeRef.current && ttsActiveRef.current) {
                  await new Promise((r) => setTimeout(r, 80));
                }
                await new Promise((r) => setTimeout(r, 250));
                busy = false;
                if (handsFreeRef.current) setStatus("listening");
              }
            }
          }
          convRafRef.current = requestAnimationFrame(loop);
        };
        convRafRef.current = requestAnimationFrame(loop);
      } catch {
        setError("마이크 권한이 필요합니다. 브라우저에서 마이크를 허용해 주세요.");
        setStatus("idle");
        handsFreeRef.current = false;
      }
    },
    []
  );

  const stopHandsFree = useCallback(() => {
    handsFreeRef.current = false;
    cancelAnimationFrame(convRafRef.current);
    stopSpeaking();
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch {}
      recorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    levelRef.current = 0;
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      handsFreeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(convRafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    status,
    error,
    levelRef,
    speak,
    stopSpeaking,
    startHandsFree,
    stopHandsFree,
  };
}
