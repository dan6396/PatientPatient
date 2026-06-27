// transcript + (다단계) rubric + (교육카드) -> 채점/피드백 프롬프트.
import type { RubricItem, Teaching } from "../cases/case-types";

export type TranscriptTurn = { role: "doctor" | "patient"; content: string };

export function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((t) => `${t.role === "doctor" ? "의사" : "환자"}: ${t.content}`)
    .join("\n");
}

export function buildScoringPrompt(
  turns: TranscriptTurn[],
  rubric: RubricItem[],
  teaching?: Teaching
): { system: string; prompt: string } {
  const lines = rubric
    .map((r) => {
      const levels = r.levels.map((l, i) => `${i}=${l.label}(${l.points}점)`).join(", ");
      const crit = r.criteria ? ` | 기준: ${r.criteria}` : "";
      return `- ${r.id} [${r.category}] ${r.description} | 레벨: ${levels}${crit}`;
    })
    .join("\n");

  // 교육 카드 항목(id 부여) — 응시자가 다룬 것을 covered로 반환
  let teachBlock = "";
  let teachSpec = "";
  if (teaching) {
    const tlines = teaching.sections
      .flatMap((s) => s.items.map((it, i) => `- ${s.key}-${i} [${s.title}] ${it}`))
      .join("\n");
    teachBlock = `

[교육 카드 — 정답 진단: ${teaching.impression}]
- covered: 응시자(의사)가 transcript에서 "직접 묻거나 설명한" 항목 id만 넣어라(환자가 자발적으로 말한 건 제외).
- studentImpression: 의사가 transcript에서 "직접 말한" 추정진단만 그대로 적는다. 의사가 진단명/추정진단을 한 번도 언급하지 않았으면 반드시 빈 문자열("")로 둔다. 절대 추측하거나 감별진단 목록에서 골라 넣지 마라.
- impressionCorrect: 의사가 명시적으로 말한 진단이 정답(${teaching.impression})과 일치할 때만 true. 진단 언급이 없으면 false.
${tlines}`;
    teachSpec = `,
  "studentImpression": "<의사가 직접 말한 추정진단만. 언급 없으면 빈 문자열>",
  "impressionCorrect": <위 규칙대로 true 또는 false>,
  "covered": ["<응시자가 다룬 교육 항목 id>", ...]`;
  }

  const system = `너는 CPX(임상수행평가) 채점관이다. 면담 transcript를 근거로 각 채점 항목의 "레벨 index"(0이 가장 높은 점수)를 고르고, 교육 항목 중 응시자가 다룬 것을 가려낸다.

판정 원칙:
- 오직 "의사(doctor)"의 발화/행동만 근거로 삼는다. 환자가 스스로 말한 정보는 인정하지 않는다(특히 첫 진술/주호소).
- 의사가 직접 묻거나 수행했을 때만 높은 레벨. 하지 않았으면 가장 낮은 레벨(마지막 index).
- 신체진찰 항목은 의사가 "하겠다고 말하거나 수행"했는지로 판정.
- 후하게 주지 말고 근거 기반으로 엄격히.

[피드백(summary) 작성 지침]
- 5~8문장으로 구체적·상세하게. "소통이 부족했다" 같은 일반론 금지, 이 증례의 실제 항목명을 짚는다.
- 순서: ① 잘한 점 1~2가지(실제 물어본 항목을 콕 집어) → ② 놓친 핵심 병력청취 항목을 이름까지 구체적으로 → ③ 신체진찰 누락 → ④ 임상추론(이 환자의 추정진단은 무엇이고, 어떤 단서로 감별진단을 배제/포함해야 하는지) → ⑤ 환자교육 누락 → ⑥ 다음 면담에서 바로 적용할 구체적 개선점.
- 핵심 항목 한두 곳은 "왜 중요한지(진단적 의미)"를 짧게 덧붙여 학습이 되게 한다.

반드시 아래 JSON "객체 하나"만 출력한다(마크다운/코드펜스 없이 순수 JSON):
{
  "items": [ { "id": "<항목 id>", "level": <레벨 index>, "evidence": "<한국어 근거>" } ],
  "summary": "<위 지침을 따른 상세 한국어 피드백(5~8문장)>"${teachSpec}
}
items에는 모든 채점 항목을 빠짐없이 포함한다.`;

  const prompt = `[채점표]
${lines}${teachBlock}

[면담 transcript]
${formatTranscript(turns)}

위 transcript를 근거로 판정한 JSON을 출력하라.`;

  return { system, prompt };
}
