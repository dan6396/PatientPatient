"use client";

export type ScoredItem = {
  id: string;
  category: string;
  description: string;
  met: boolean;
  evidence: string;
};

const CATEGORY_ORDER = ["병력청취", "신체진찰", "환자교육", "PPI", "임상예절"];

export default function ScoreReport({
  items,
  summary,
  onRestart,
}: {
  items: ScoredItem[];
  summary: string;
  onRestart: () => void;
}) {
  const met = items.filter((i) => i.met).length;
  const total = items.length;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: items.filter((i) => i.category === cat),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-4xl text-ink">채점 결과</h2>
          <p className="mt-1 text-sm text-ink-soft">CPX 채점표 기준 자동 평가</p>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl text-ink">
            {met}
            <span className="text-ink-soft">/{total}</span>
          </div>
          <p className="text-xs text-ink-soft">충족 항목</p>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map((g) => (
          <section key={g.cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">
              {g.cat}
            </h3>
            <ul className="space-y-1.5">
              {g.rows.map((r) => (
                <li
                  key={r.id}
                  className="flex gap-3 rounded-lg border border-ink/10 bg-[var(--bg)]/40 px-4 py-3"
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      r.met
                        ? "bg-emerald-700/90 text-white"
                        : "bg-ink/15 text-ink/50"
                    }`}
                  >
                    {r.met ? "✓" : "✕"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{r.description}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                      {r.evidence}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {summary && (
        <div className="mt-8 rounded-xl border border-ink/15 bg-ink/[0.04] p-5">
          <h3 className="mb-2 font-display text-lg text-ink">피드백</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{summary}</p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={onRestart}
          className="rounded-full border border-ink/25 px-6 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5"
        >
          다시 면담하기
        </button>
      </div>
    </div>
  );
}
