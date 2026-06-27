// 채점 LLM 응답을 안전하게 JSON으로 파싱한다. (마크다운 펜스 제거, 객체 경계 추출)

export type RawScore = { id: string; level: number; evidence: string };
export type ParsedScore = { items: RawScore[]; summary: string };

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

  const obj = data as { items?: unknown; summary?: unknown };
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items: RawScore[] = rawItems
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

  return {
    items,
    summary: typeof obj.summary === "string" ? obj.summary : "",
  };
}
