"use client";

import { useRef, useState } from "react";
import type { PatientCase } from "@/backend/cases/case-types";

export default function RubricUpload({
  onGenerated,
  onCancel,
}: {
  onGenerated: (c: PatientCase) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [hasScenario, setHasScenario] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Word(.docx) → 텍스트 추출 (브라우저에서, mammoth 동적 로드)
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Word 문서(.docx) 파일만 가능합니다. (한글 파일은 'Word(.docx)로 저장' 후 올려 주세요)");
      return;
    }
    setError(null);
    setExtracting(true);
    try {
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      const extracted = (value || "").trim();
      if (extracted.length < 20) {
        setError("문서에서 텍스트를 거의 추출하지 못했습니다. 표가 이미지로 들어간 문서일 수 있어요.");
      } else {
        setText(extracted);
        setFileName(file.name);
      }
    } catch {
      setError("Word 파일을 읽지 못했습니다. 다른 파일로 시도해 주세요.");
    } finally {
      setExtracting(false);
    }
  }

  async function generate() {
    const rubricText = text.trim();
    if (rubricText.length < 20) {
      setError("채점표 내용이 너무 짧습니다.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubricText, hasScenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "생성 실패");
      onGenerated(data.case as PatientCase);
    } catch (e) {
      setError(e instanceof Error ? e.message : "증례 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <button
        onClick={onCancel}
        disabled={loading}
        className="mb-4 self-start text-xs uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
      >
        ← 증례 선택
      </button>

      <p className="font-display text-sm italic text-ink-soft/70">From your rubric</p>
      <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">채점표로 증례 만들기</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        학교 채점표(Word 문서)를 올리면, 그 기준에 맞는 표준화환자 증례를 생성해 바로 면담·채점할 수 있어요.
      </p>

      {loading ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-10">
          <p className="animate-pulse font-display text-lg text-ink">증례 생성 중…</p>
          <p className="text-sm text-ink-soft">채점표를 분석해 환자를 설계하고 있어요 (20~40초)</p>
        </div>
      ) : (
        <>
          {/* Word 업로드 */}
          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={extracting}
            className="mt-8 flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink/30 bg-[var(--bg)]/40 px-5 py-8 transition-all hover:border-ink/50 hover:bg-ink/[0.03] disabled:opacity-50"
          >
            {extracting ? (
              <span className="animate-pulse text-sm text-ink">문서에서 텍스트 추출 중…</span>
            ) : fileName ? (
              <>
                <span className="text-sm font-medium text-ink">✓ {fileName}</span>
                <span className="text-xs text-ink-soft">다른 Word 파일로 바꾸려면 다시 클릭</span>
              </>
            ) : (
              <>
                <span className="text-base font-medium text-ink">＋ Word(.docx) 파일 선택</span>
                <span className="text-xs text-ink-soft">
                  한글 파일은 ‘Word(.docx)로 저장’ 후 올려 주세요
                </span>
              </>
            )}
          </button>

          {/* 추출 결과(수정 가능) */}
          {text && (
            <>
              <p className="mt-5 mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                추출된 채점표 (필요하면 수정)
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-56 w-full resize-none rounded-2xl border border-ink/20 bg-[var(--bg)]/50 p-4 text-sm leading-relaxed text-ink outline-none focus:border-ink/40"
              />

              <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={hasScenario}
                  onChange={(e) => setHasScenario(e.target.checked)}
                  className="accent-ink"
                />
                증례(환자 정보)도 문서에 포함돼 있어요 — 그 내용을 반영
              </label>
            </>
          )}

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex justify-center">
            <button
              onClick={generate}
              disabled={!text.trim()}
              className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            >
              증례 생성하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
