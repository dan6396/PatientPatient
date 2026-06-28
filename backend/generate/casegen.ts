// 채점표(텍스트) → PatientCase 자동 생성.
// 기존 채점/면담 로직은 그대로 두고, 여기서 만든 case 객체를 그 로직에 그대로 넣어 쓴다.
// 채점표가 곧 "증례 설계도" — 각 채점 항목에 대응하는 gatedFact를 만들어 일관된 표준화환자를 생성한다.

import type { PatientCase, RubricItem, GatedFact, Teaching } from "../cases/case-types";

export function buildCaseGenPrompt(rubricText: string, hasScenario: boolean): {
  system: string;
  prompt: string;
} {
  const system = `너는 의과대학 CPX(진료수행평가) 콘텐츠 설계자다.
주어진 "채점표(rubric)"를 읽고, 그 채점표로 그대로 평가될 수 있는 "표준화환자 증례"를 JSON으로 설계한다.

[핵심 원칙]
- 채점표의 각 채점 항목이 곧 "환자가 어떤 질문을 받았을 때 무엇을 답해야 하는지"의 명세다.
  예: 채점항목 "6주 이상 기간을 물었나" → 증례에 발병 시점을 6주 이상(예: 3개월 전)으로 설정하고, 그 질문을 받으면 답하도록 gatedFact를 만든다.
- 따라서 병력청취 항목 하나하나에 대응하는 gatedFact(triggerHint=의사가 무엇을 물으면, answer=환자 답변)를 만든다.
- 진단명(hiddenDiagnosis)과 감별진단은 채점표의 "추정진단/감별진단/교육" 부분에서 가져온다(없으면 채점항목들로 추론).
- 의학적으로 모순 없게(진단과 증상·검사·치료가 일치) 만든다.
${hasScenario ? "- 입력에 증례(환자 정보)가 포함돼 있으면 그 내용을 최대한 그대로 반영한다." : "- 입력에 증례가 없으므로, 채점표에 가장 잘 부합하는 환자를 임의로 일관되게 생성한다(이름·나이·성격·사회력 등 디테일 포함)."}

[채점표 → rubric 변환 규칙]
- 각 채점 항목을 rubric 한 항목으로: id(짧은 영문, 예 hx1/px1/edu1/ppi1), category(예: 병력청취/신체진찰/환자교육/환자의사관계(PPI)/신체진찰태도), description(항목 내용), levels(높은 점수→낮은 점수 순. 예/아니오는 [{label:"예",points:N},{label:"아니오",points:0}], 다단계는 채점표 배점대로), criteria(판정 기준 있으면).
- 채점표에 적힌 배점을 그대로 points에 넣는다.

반드시 아래 JSON "객체 하나"만 출력한다(마크다운/코드펜스 없이 순수 JSON):
{
  "title": "<짧은 증례 제목, 예: 양측 손가락 통증 55세 여성>",
  "chiefComplaint": "<주증상 한 구절>",
  "doorway": "<활력징후 등 문 앞 정보 한두 줄. 없으면 빈 문자열>",
  "persona": { "name": "<한국 이름>", "age": <숫자>, "sex": "<남|여>", "personality": "<성격·태도>", "speakingStyle": "<말투>" },
  "openingStatement": "<환자 첫 한마디(주증상). 화면엔 안 쓰일 수 있음>",
  "publicInfo": "<묻지 않아도 자연스레 말할 수 있는 배경 1~2문장>",
  "gatedFacts": [ { "id": "<영문 id>", "triggerHint": "<의사가 무엇을 물으면>", "answer": "<그때 환자 답변(한국어, 한두문장)>" } ],
  "hiddenDiagnosis": "<숨은 진단명과 환자가 먼저 말하면 안 된다는 설명, 감별진단 포함>",
  "rubric": [ { "id": "<id>", "category": "<카테고리>", "description": "<항목>", "levels": [ { "label": "<레벨명>", "points": <숫자> } ], "criteria": "<판정기준(선택)>" } ],
  "teaching": {
    "impression": "<정답 추정진단>",
    "sections": [ { "key": "<영문key 예 hx/px/ddx/wu/tx/edu>", "title": "<예: 근거 — 문진 / 감별진단 / 검사 / 치료 / 교육>", "items": ["<모범답안 항목>", ...] } ]
  }
}
gatedFacts는 병력청취 채점항목마다 1개 이상 만들고, 신체진찰 소견도 포함한다(의사가 그 부위를 진찰하면 나올 반응).`;

  const prompt = `[입력 자료 — 채점표${hasScenario ? " 및 증례" : ""}]
${rubricText}

위 자료를 바탕으로 JSON 증례를 설계해 출력하라.`;

  return { system, prompt };
}

// ── 생성 결과 파싱 + 안전 검증 ──
function asString(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : fb;
}
function asNum(v: unknown, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

export function parseGeneratedCase(raw: string, id: string): PatientCase {
  let text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) text = text.slice(s, e + 1);

  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("생성 결과를 JSON으로 해석하지 못했습니다.");
  }

  const p = (d.persona ?? {}) as Record<string, unknown>;
  const sex = asString(p.sex) === "남" ? "남" : "여";

  const gatedFacts: GatedFact[] = (Array.isArray(d.gatedFacts) ? d.gatedFacts : [])
    .map((g, i) => {
      const o = g as Record<string, unknown>;
      const answer = asString(o.answer);
      if (!answer) return null;
      return {
        id: asString(o.id) || `gf${i + 1}`,
        triggerHint: asString(o.triggerHint),
        answer,
      } as GatedFact;
    })
    .filter((x): x is GatedFact => x !== null);

  const rubric: RubricItem[] = (Array.isArray(d.rubric) ? d.rubric : [])
    .map((r, i) => {
      const o = r as Record<string, unknown>;
      const levels = (Array.isArray(o.levels) ? o.levels : [])
        .map((l) => {
          const lo = l as Record<string, unknown>;
          return { label: asString(lo.label, "예"), points: asNum(lo.points) };
        })
        .filter((l) => l.label);
      if (!levels.length) return null;
      return {
        id: asString(o.id) || `item${i + 1}`,
        category: asString(o.category, "기타"),
        description: asString(o.description),
        levels,
        ...(asString(o.criteria) ? { criteria: asString(o.criteria) } : {}),
      } as RubricItem;
    })
    .filter((x): x is RubricItem => x !== null);

  if (!rubric.length) throw new Error("채점표(rubric) 항목을 생성하지 못했습니다.");

  let teaching: Teaching | undefined;
  const td = d.teaching as Record<string, unknown> | undefined;
  if (td && Array.isArray(td.sections)) {
    teaching = {
      impression: asString(td.impression),
      sections: td.sections
        .map((sec, i) => {
          const so = sec as Record<string, unknown>;
          const items = (Array.isArray(so.items) ? so.items : [])
            .map((it) => asString(it))
            .filter(Boolean);
          return { key: asString(so.key) || `sec${i}`, title: asString(so.title), items };
        })
        .filter((sec) => sec.items.length),
    };
  }

  return {
    id,
    title: asString(d.title, "생성된 증례"),
    chiefComplaint: asString(d.chiefComplaint),
    doorway: asString(d.doorway) || undefined,
    persona: {
      name: asString(p.name, "환자"),
      age: asNum(p.age, 50),
      sex,
      personality: asString(p.personality),
      speakingStyle: asString(p.speakingStyle, "존댓말로 짧게 답함"),
    },
    openingStatement: asString(d.openingStatement),
    publicInfo: asString(d.publicInfo),
    gatedFacts,
    hiddenDiagnosis: asString(d.hiddenDiagnosis),
    rubric,
    teaching,
  };
}
