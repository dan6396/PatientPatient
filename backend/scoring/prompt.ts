// transcript + rubric -> 채점 에이전트 프롬프트.
// 채점 LLM은 오직 JSON만 반환한다.

import type { RubricItem } from "../cases/case-types";

export type TranscriptTurn = { role: "doctor" | "patient"; content: string };

export function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((t) => `${t.role === "doctor" ? "의사" : "환자"}: ${t.content}`)
    .join("\n");
}

export function buildScoringPrompt(
  turns: TranscriptTurn[],
  rubric: RubricItem[]
): { system: string; prompt: string } {
  const rubricList = rubric
    .map((r) => `- ${r.id} [${r.category}] ${r.description}`)
    .join("\n");

  const system = `너는 CPX(임상수행평가) 채점관이다. 의대생(의사 역할)과 표준화환자의 면담 transcript를 읽고,
주어진 채점표(rubric)의 각 항목이 면담 중 실제로 충족됐는지 근거에 기반해 판정한다.

판정 원칙:
- 오직 "의사(doctor)"의 발화/행동만 근거로 삼는다. 추측해서 후하게 주지 않는다.
- 의사가 해당 내용을 명시적으로 "직접 질문"하거나 수행했을 때만 met=true.
- ★ 환자가 의사의 질문 없이 스스로 말한 정보는 절대 인정하지 않는다. 특히 면담 맨 처음 환자의 주호소 진술(인사말)에 이미 들어 있던 정보(예: 통증 위치·발현 시점)는, 의사가 그 내용을 다시 직접 묻지 않았다면 met=false 다.
- evidence의 근거는 반드시 "의사"의 발화여야 한다. 근거로 댈 의사 발화가 없으면 met=false 이고, evidence에는 "의사가 묻지 않음"이라고 적는다.

반드시 아래 JSON "객체 하나"만 출력한다. 마크다운/설명/코드펜스 없이 순수 JSON만:
{
  "items": [ { "id": "<rubric id>", "met": <true|false>, "evidence": "<한국어 근거>" } ],
  "summary": "<놓친 항목 위주로, 다음에 개선할 점을 짚는 한국어 피드백 한 단락>"
}
items 배열에는 rubric의 모든 항목을 빠짐없이 포함한다.`;

  const prompt = `[채점표 rubric]
${rubricList}

[면담 transcript]
${formatTranscript(turns)}

위 transcript를 채점표에 비춰 판정한 JSON을 출력하라.`;

  return { system, prompt };
}
