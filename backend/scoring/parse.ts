// 채점 LLM의 텍스트 응답을 안전하게 JSON으로 파싱한다.
// 마크다운 코드펜스 제거, 객체 경계 추출 등 방어적으로 처리.

import type { ScoreResponse, ScoreResult } from "../cases/case-types";

export function parseScoreResponse(raw: string): ScoreResponse {
  let text = raw.trim();

  // ```json ... ``` 같은 코드펜스 제거
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  // 본문 중 첫 '{' ~ 마지막 '}' 만 추출 (앞뒤 잡설 방어)
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

  const items: ScoreResult[] = rawItems
    .map((it) => {
      const o = it as Record<string, unknown>;
      if (typeof o.id !== "string") return null;
      return {
        id: o.id,
        met: o.met === true,
        evidence: typeof o.evidence === "string" ? o.evidence : "",
      } as ScoreResult;
    })
    .filter((x): x is ScoreResult => x !== null);

  return {
    items,
    summary: typeof obj.summary === "string" ? obj.summary : "",
  };
}
