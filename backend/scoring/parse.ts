// 채점 LLM 응답을 안전하게 JSON으로 파싱한다.

export type RawScore = { id: string; level: number; evidence: string };
export type TurnComment = { i: number; comment: string };
export type ParsedScore = {
  items: RawScore[];
  summary: string;
  studentImpression: string;
  impressionCorrect: boolean;
  covered: string[];
  turnComments: TurnComment[];
};

export function parseScoreResponse(raw: string): ParsedScore {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("채점 응답을 JSON으로 해석하지 못했습니다.");
  }

  const obj = data as {
    items?: unknown;
    summary?: unknown;
    studentImpression?: unknown;
    impressionCorrect?: unknown;
    covered?: unknown;
    turnComments?: unknown;
  };

  const items: RawScore[] = (Array.isArray(obj.items) ? obj.items : [])
    .map((it) => {
      const o = it as Record<string, unknown>;
      if (typeof o.id !== "string") return null;
      const lvl = Number(o.level);
      return {
        id: o.id,
        level: Number.isFinite(lvl) ? Math.round(lvl) : 0,
        evidence: typeof o.evidence === "string" ? o.evidence : "",
      } as RawScore;
    })
    .filter((x): x is RawScore => x !== null);

  // covered는 숫자(권장) 또는 문자열로 올 수 있다 — 둘 다 문자열로 정규화해 보존한다.
  const covered = Array.isArray(obj.covered)
    ? obj.covered
        .map((c) => (typeof c === "number" ? String(c) : typeof c === "string" ? c : null))
        .filter((c): c is string => c !== null)
    : [];

  const turnComments: TurnComment[] = (Array.isArray(obj.turnComments) ? obj.turnComments : [])
    .map((c) => {
      const o = c as Record<string, unknown>;
      const i = Number(o.i);
      return Number.isFinite(i) && typeof o.comment === "string" && o.comment.trim()
        ? { i: Math.round(i), comment: o.comment.trim() }
        : null;
    })
    .filter((x): x is TurnComment => x !== null);

  return {
    items,
    summary: typeof obj.summary === "string" ? obj.summary : "",
    studentImpression:
      typeof obj.studentImpression === "string" ? obj.studentImpression : "",
    impressionCorrect: obj.impressionCorrect === true,
    covered,
    turnComments,
  };
}
