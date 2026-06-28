"use client";

import { cases } from "@/backend/cases";

export default function CasePicker({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="font-display text-sm italic text-ink-soft/70">Select a case</p>
      <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">증례 선택</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        연습할 증례를 선택하세요. 선택한 증례의 채점표 기준으로 면담이 채점됩니다.
      </p>

      <div className="mt-8 grid gap-4">
        {cases.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="group rounded-2xl border border-ink/15 bg-[var(--bg)]/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:bg-ink/[0.03]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">{c.title}</h2>
              </div>
              <span className="mt-1 shrink-0 text-ink-soft transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            {c.doorway && (
              <p className="mt-3 whitespace-pre-line border-t border-ink/10 pt-3 text-xs leading-relaxed text-ink-soft/80">
                {c.doorway}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
