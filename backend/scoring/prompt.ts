// transcript + (다단계) rubric + (교육카드) -> 채점/피드백 프롬프트.
import type { RubricItem, Teaching } from "../cases/case-types";

export type TranscriptTurn = { role: "doctor" | "patient"; content: string };

export function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((t) => `${t.role === "doctor" ? "의사" : "환자"}: ${t.content}`)
    .join("\n");
}

// 교육 카드의 모든 항목에 1부터 시작하는 "전역 번호"를 매긴다.
// LLM이 복합 문자열 id(hx-0 등)보다 단순 번호를 훨씬 정확히 되돌려주므로 covered 매칭이 견고해진다.
// prompt와 채점 route가 같은 번호를 쓰도록 단일 소스로 공유한다.
export function flattenTeaching(teaching: Teaching) {
  const out: { num: number; key: string; idx: number; title: string; text: string }[] = [];
  let n = 0;
  for (const s of teaching.sections) {
    s.items.forEach((text, idx) => {
      n += 1;
      out.push({ num: n, key: s.key, idx, title: s.title, text });
    });
  }
  return out;
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
    const tlines = flattenTeaching(teaching)
      .map((f) => `- ${f.num}. [${f.title}] ${f.text}`)
      .join("\n");
    teachBlock = `

[교육 카드 — 정답 진단: ${teaching.impression}]
- covered: 응시자(의사)가 면담에서 직접 묻거나(개방형 질문으로 자연스럽게 끌어낸 것도 포함) 설명·수행하여 "실제로 다뤄진" 항목의 번호만 넣어라. 단, 면담 맨 처음 환자가 묻기도 전에 먼저 꺼낸 주호소 진술만으로는 인정하지 않는다.
- studentImpression: 의사가 transcript에서 "직접 말한" 추정진단만 그대로 적는다. 의사가 진단명/추정진단을 한 번도 언급하지 않았으면 반드시 빈 문자열("")로 둔다. 절대 추측하거나 감별진단 목록에서 골라 넣지 마라.
- impressionCorrect: 의사가 명시적으로 말한 진단이 정답(${teaching.impression})과 일치할 때만 true. 진단 언급이 없으면 false.
${tlines}`;
    teachSpec = `,
  "studentImpression": "<의사가 직접 말한 추정진단만. 언급 없으면 빈 문자열>",
  "impressionCorrect": <위 규칙대로 true 또는 false>,
  "covered": [<응시자가 실제로 다룬 교육 항목의 번호. 예: 2, 5, 7>]`;
  }

  const system = `너는 CPX(임상수행평가) 채점관이다. 면담 transcript를 근거로 각 채점 항목의 "레벨 index"(0이 가장 높은 점수)를 고르고, 교육 항목 중 응시자가 다룬 것을 가려낸다.

판정 원칙:
- 오직 "의사(doctor)"의 발화/행동만 근거로 삼는다. 환자가 스스로 말한 정보는 인정하지 않는다(특히 첫 진술/주호소).
- 의사가 직접 묻거나 수행했을 때만 높은 레벨. 하지 않았으면 가장 낮은 레벨(마지막 index).
- 신체진찰 항목은 의사가 "하겠다고 말하거나 수행"했는지로 판정.
- 후하게 주지 말고 근거 기반으로 엄격히.

[★ 병력청취와 환자의사관계(PPI)는 독립적으로 채점한다]
- 병력청취 항목에 필요한 구체적·폐쇄형(예/아니오) 질문(예: "발열이나 오한 있으세요?", "고혈압이나 당뇨 있으세요?", "흡연하세요?")은 정상적이고 꼭 필요한 진료 행위다. 이런 폐쇄형 선별질문을 했다는 이유로 PPI의 "효율적 질문(개방형)" 점수를 절대 깎지 마라.
- PPI의 "효율적으로 잘 물어보았다" 항목은 오직 ① 면담을 개방형으로 시작/탐색했는지(예: "어떻게 오셨어요?", "좀 더 말씀해 주세요"), ② 한 번에 여러 개를 몰아 묻는 복수질문이나 답을 정해놓고 묻는 유도질문을 피했는지로만 평가한다. 폐쇄형 질문의 존재 자체는 감점 사유가 아니다.
- 같은 발화로 병력청취(무엇을 물었는가)와 PPI(어떻게 소통했는가)를 동시에 깎거나 동시에 올리지 마라. 둘은 별개의 평가 축이다.

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
