// transcript + (다단계) rubric -> 채점 프롬프트. LLM은 각 항목의 "레벨 index"만 고른다.
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
  const lines = rubric
    .map((r) => {
      const levels = r.levels
        .map((l, i) => `${i}=${l.label}(${l.points}점)`)
        .join(", ");
      const crit = r.criteria ? ` | 기준: ${r.criteria}` : "";
      return `- ${r.id} [${r.category}] ${r.description} | 레벨: ${levels}${crit}`;
    })
    .join("\n");

  const system = `너는 CPX(임상수행평가) 채점관이다. 면담 transcript를 근거로, 각 채점 항목에 대해 가장 알맞은 "레벨 index"(0이 가장 높은 점수)를 고른다.

판정 원칙:
- 오직 "의사(doctor)"의 발화/행동만 근거로 삼는다. 환자가 스스로 말한 정보는 인정하지 않는다(특히 면담 첫 진술/주호소에 이미 들어 있던 내용).
- 의사가 해당 내용을 직접 묻거나 수행했을 때만 높은 레벨을 준다. 하지 않았으면 가장 낮은 레벨(마지막 index)이다.
- 신체진찰 항목은 의사가 그 진찰을 "하겠다고 말하거나 수행"했는지로 판정한다(텍스트/음성 면담이므로 말로 시도하면 인정).
- 후하게 주지 말고 근거 기반으로 엄격히 판정한다.

반드시 아래 JSON "객체 하나"만 출력한다(마크다운/설명/코드펜스 없이 순수 JSON):
{
  "items": [ { "id": "<항목 id>", "level": <0부터 시작하는 레벨 index>, "evidence": "<한국어 근거 또는 놓친 이유 짧게>" } ],
  "summary": "<놓친 항목 위주로 다음에 개선할 점을 짚는 한국어 피드백 한 단락>"
}
items에는 모든 항목을 빠짐없이 포함한다.`;

  const prompt = `[채점표]
${lines}

[면담 transcript]
${formatTranscript(turns)}

위 transcript를 근거로 각 항목의 레벨을 판정한 JSON을 출력하라.`;

  return { system, prompt };
}
