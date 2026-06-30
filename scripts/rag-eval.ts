// RAG 검색 품질 평가/일반화 하니스 (확장 골드셋, 3개 증례).
//   실행: npx tsx scripts/rag-eval.ts
//
//   파라미터는 류마티스(train)로만 튜닝했다. 췌장염·TIA는 "처음 보는" 증례(held-out)로,
//   같은 운영 파라미터를 그대로 적용해 일반화(과적합 아님)를 검증한다.
//   지표: Recall@k · Hit@1 · OOD 누출률(무관 질문에 사실 안 줬나) · 평균 주입수.

import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { rheumatoidCase } from "../backend/cases/case-rheumatoid";
import { pancreatitisCase } from "../backend/cases/case-pancreatitis";
import { tiaCase } from "../backend/cases/case-tia";
import {
  rankFacts,
  FACT_GATE,
  FACT_THRESHOLD,
  FACT_ALPHA,
  FACT_TOP_K,
} from "../backend/patient/factRetrieval";
import type { GatedFact, PatientCase } from "../backend/cases/case-types";

type Q = { q: string; ids: string[] };

// 무관(OOD) 질문 — 어느 증례에도 없는 잡담. 아무 사실도 안 나와야 정답.
const OOD: Q[] = [
  { q: "주말엔 보통 뭐 하세요?", ids: [] },
  { q: "오늘 날씨 많이 춥죠?", ids: [] },
  { q: "여기까지 오시는 데 안 힘드셨어요?", ids: [] },
  { q: "요즘 TV에서 뭐 재밌는 거 하나요?", ids: [] },
  { q: "반려동물 키우세요?", ids: [] },
  { q: "취미가 어떻게 되세요?", ids: [] },
  { q: "주말에 여행은 자주 다니세요?", ids: [] },
];

// ── 류마티스(train: 파라미터 튜닝에 사용) ──
const RHEUM: Q[] = [
  { q: "언제부터 아프기 시작하셨어요?", ids: ["onset"] },
  { q: "통증 생긴 지 얼마나 됐어요?", ids: ["onset"] },
  { q: "증상이 점점 심해졌나요?", ids: ["course"] },
  { q: "아침에 손이 뻣뻣하세요?", ids: ["stiffness"] },
  { q: "조조강직 있으신가요?", ids: ["stiffness"] },
  { q: "그 뻣뻣함은 얼마나 오래 가요?", ids: ["stiffness_dur"] },
  { q: "손 많이 쓰고 나면 더 아파요?", ids: ["activity"] },
  { q: "다른 관절도 아프세요?", ids: ["other_joints"] },
  { q: "무릎이나 어깨도 아파요?", ids: ["other_joints"] },
  { q: "손이 붓거나 빨개지나요?", ids: ["swelling"] },
  { q: "요즘 많이 피곤하세요?", ids: ["fatigue"] },
  { q: "체중이 줄었어요?", ids: ["weight_fever"] },
  { q: "열은 안 나세요?", ids: ["weight_fever"] },
  { q: "입이 마르거나 눈이 건조해요?", ids: ["sicca"] },
  { q: "입안이 헐거나 한 적 있어요?", ids: ["oral_ulcer"] },
  { q: "찬물에 손가락이 하얘지나요?", ids: ["raynaud"] },
  { q: "피부에 발진 같은 거 있어요?", ids: ["rash"] },
  { q: "술은 드세요?", ids: ["alcohol"] },
  { q: "담배 피우세요?", ids: ["smoking"] },
  { q: "술이나 담배 하세요?", ids: ["alcohol", "smoking"] },
  { q: "앓고 있는 지병 있으세요?", ids: ["pmh"] },
  { q: "가족 중에 관절 질환 있는 분 계세요?", ids: ["family"] },
  { q: "지금 드시는 약 있어요?", ids: ["meds"] },
  { q: "직업이 어떻게 되세요?", ids: ["occupation"] },
  { q: "손목 한번 눌러볼게요", ids: ["exam_mcp"] },
];

// ── 췌장염(held-out: 처음 보는 증례) ──
const PANC: Q[] = [
  { q: "언제부터 어떻게 아프기 시작했어요?", ids: ["onset"] },
  { q: "처음엔 어디가 제일 아팠어요?", ids: ["site"] },
  { q: "열이나 오한 같은 건 없으세요?", ids: ["fever"] },
  { q: "예전에도 이런 통증 있었던 적 있어요?", ids: ["prev"] },
  { q: "통증이 계속되나요, 아니면 왔다 갔다 해요?", ids: ["course"] },
  { q: "자세를 바꾸면 통증이 좀 달라지나요?", ids: ["posture"] },
  { q: "앓고 계신 다른 지병 있으세요?", ids: ["pmh"] },
  { q: "위내시경이나 복부 초음파 받아보신 적 있어요?", ids: ["scope"] },
  { q: "평소에 술은 얼마나 드세요?", ids: ["alcohol"] },
  { q: "전에 술 드시고 이렇게 아팠던 적 있어요?", ids: ["alcohol-prev"] },
  { q: "평소 식사나 식습관은 어떠세요?", ids: ["diet"] },
  { q: "배 수술 받으신 적 있으세요?", ids: ["appendix"] },
  { q: "통증이 등이나 어깨 쪽으로 뻗치나요?", ids: ["radiation"] },
  { q: "지금 드시는 약 있으세요?", ids: ["meds"] },
  { q: "담배는 피우세요?", ids: ["smoke"] },
  { q: "가족 중에 비슷한 분 계세요?", ids: ["family"] },
  { q: "술이나 담배 하세요?", ids: ["alcohol", "smoke"] },
];

// ── TIA(held-out: 처음 보는 증례) ──
const TIA: Q[] = [
  { q: "언제부터 힘이 빠지기 시작했어요?", ids: ["onset"] },
  { q: "한쪽만 그러세요, 양쪽 다 그러세요?", ids: ["side"] },
  { q: "갑자기 그랬어요, 서서히 그랬어요?", ids: ["pattern"] },
  { q: "몸통에 가까운 쪽이 약해요, 손발 끝이 약해요?", ids: ["proximal"] },
  { q: "저리거나 멍멍한 느낌도 있으세요?", ids: ["sensory"] },
  { q: "말이 어둔해지거나 발음이 이상했던 적 있어요?", ids: ["dysarthria"] },
  { q: "사물이 겹쳐 보이거나 시야가 이상한 적 있어요?", ids: ["diplopia"] },
  { q: "두통이나 어지럼증은 없으세요?", ids: ["headache"] },
  { q: "고혈압이나 당뇨, 심장병 있으세요?", ids: ["pmh"] },
  { q: "술이나 담배는 하세요?", ids: ["social"] },
  { q: "최근에 감기나 몸살, 설사 같은 거 했어요?", ids: ["infection"] },
  { q: "지금 드시는 약 있으세요?", ids: ["meds"] },
  { q: "가족 중에 중풍이나 비슷한 분 계세요?", ids: ["family"] },
  { q: "지금은 좀 어떠세요? 다시 괜찮아지셨어요?", ids: ["recover"] },
];

const SUITES: { id: string; tag: string; case: PatientCase; gold: Q[] }[] = [
  { id: "rheumatoid", tag: "train", case: rheumatoidCase, gold: RHEUM },
  { id: "pancreatitis", tag: "held-out", case: pancreatitisCase, gold: PANC },
  { id: "tia", tag: "held-out", case: tiaCase, gold: TIA },
];

type Params = { gate: number; threshold: number; alpha: number; topK: number };

async function embedSuite(modelId: string, facts: GatedFact[], queries: string[]) {
  const model = openai.embedding(modelId);
  const factTexts = [...new Set(facts.flatMap((f) => [f.triggerHint.trim(), f.answer.trim()]))];
  const { embeddings: fe } = await embedMany({ model, values: factTexts });
  const { embeddings: qe } = await embedMany({ model, values: queries });
  const vec = new Map(factTexts.map((t, i) => [t, fe[i]]));
  const qvec = new Map(queries.map((t, i) => [t, qe[i]]));
  const items = facts.map((f) => ({
    fact: f,
    trigVec: vec.get(f.triggerHint.trim()),
    ansVec: vec.get(f.answer.trim()),
  }));
  return { items, qvec };
}

// 한 증례 평가 → 카운트 누적(집계용)
function tallyCase(
  items: { fact: GatedFact; trigVec?: number[]; ansVec?: number[] }[],
  qvec: Map<string, number[]>,
  gold: Q[],
  p: Params
) {
  let recallSum = 0, hit1 = 0, relN = 0, retOnRel = 0, leak = 0, oodN = 0;
  for (const g of [...gold, ...OOD]) {
    const { selected } = rankFacts(g.q, qvec.get(g.q)!, items, p);
    const ret = selected.map((f) => f.id);
    if (g.ids.length === 0) {
      oodN++;
      if (ret.length) leak++;
    } else {
      relN++;
      retOnRel += ret.length;
      recallSum += g.ids.filter((id) => ret.includes(id)).length / g.ids.length;
      if (ret[0] && g.ids.includes(ret[0])) hit1++;
    }
  }
  return { recallSum, hit1, relN, retOnRel, leak, oodN };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
type Emb = { id: string; tag: string; gold: Q[]; items: { fact: GatedFact; trigVec?: number[]; ansVec?: number[] }[]; qvec: Map<string, number[]> };

function metricsOver(suites: Emb[], p: Params) {
  const a = { recallSum: 0, hit1: 0, relN: 0, retOnRel: 0, leak: 0, oodN: 0 };
  for (const s of suites) {
    const t = tallyCase(s.items, s.qvec, s.gold, p);
    for (const k of Object.keys(a) as (keyof typeof a)[]) a[k] += t[k];
  }
  return {
    recall: a.recallSum / a.relN, hit1: a.hit1 / a.relN,
    leak: a.oodN ? a.leak / a.oodN : 0, avgRet: a.retOnRel / a.relN,
  };
}

// 누출 0 제약 하에 recall 최대(동률이면 threshold 높여 과주입 억제)인 (gate, threshold) 탐색
function bestConfig(train: Emb[]): Params {
  let best: Params = { gate: 0.4, threshold: 0.2, alpha: FACT_ALPHA, topK: FACT_TOP_K };
  let bestR = -1;
  for (let gate = 0.3; gate <= 0.5; gate += 0.01) {
    for (let th = 0.12; th <= 0.42; th += 0.02) {
      const p: Params = { gate, threshold: th, alpha: FACT_ALPHA, topK: FACT_TOP_K };
      const m = metricsOver(train, p);
      if (m.leak <= 0.0001 && (m.recall > bestR + 1e-9 || (Math.abs(m.recall - bestR) < 1e-9 && th > best.threshold))) {
        bestR = m.recall; best = p;
      }
    }
  }
  return best;
}

(async () => {
  // 모든 증례 임베딩 1회(large)
  const E: Emb[] = [];
  for (const s of SUITES) {
    const { items, qvec } = await embedSuite("text-embedding-3-large", s.case.gatedFacts, [
      ...s.gold.map((g) => g.q), ...OOD.map((o) => o.q),
    ]);
    E.push({ id: s.id, tag: s.tag, gold: s.gold, items, qvec });
  }
  const totalRel = SUITES.reduce((s, x) => s + x.gold.length, 0);
  console.log(`\n확장 골드셋: 증례 ${SUITES.length} · 관련 ${totalRel}문항 · OOD ${OOD.length}×${SUITES.length}=${OOD.length * SUITES.length}문항`);

  const showPerCase = (label: string, pFor: (id: string) => Params) => {
    console.log(`\n════ ${label} ════`);
    console.log("증례            Recall  Hit@1  OOD누출  평균주입");
    for (const s of E) {
      const m = metricsOver([s], pFor(s.id));
      console.log(`${s.id.padEnd(15)} ${pct(m.recall).padStart(6)}  ${pct(m.hit1).padStart(5)}  ${pct(m.leak).padStart(6)}   ${m.avgRet.toFixed(1).padStart(6)}`);
    }
    const all = metricsOver(E, pFor(""));
    console.log(`${"전체".padEnd(15)} ${pct(all.recall).padStart(6)}  ${pct(all.hit1).padStart(5)}  ${pct(all.leak).padStart(6)}   ${all.avgRet.toFixed(1).padStart(6)}`);
  };

  // 1) 기존 운영 파라미터(류마티스로만 튜닝) → 과적합 노출
  const P0: Params = { gate: FACT_GATE, threshold: FACT_THRESHOLD, alpha: FACT_ALPHA, topK: FACT_TOP_K };
  console.log(`\n[기존 파라미터: gate=${P0.gate} th=${P0.threshold} (rheumatoid로만 튜닝)]`);
  showPerCase("① 기존 파라미터 — held-out에서 OOD 누출 발생(과적합)", () => P0);

  // 2) 3증례 전체로 재튜닝 → 배포용
  const Pall = bestConfig(E);
  console.log(`\n[재튜닝(3증례): gate=${Pall.gate.toFixed(2)} th=${Pall.threshold.toFixed(2)}]`);
  showPerCase("② 재튜닝 파라미터 — 전 증례 누출 억제 + 과주입 감소", () => Pall);

  // 3) Leave-One-Out 교차검증 — 정직한 일반화 추정(테스트 증례는 튜닝에서 제외)
  console.log("\n════ ③ Leave-One-Out 교차검증 (2증례로 튜닝 → 나머지 1증례 테스트) ════");
  console.log("테스트 증례     (튜닝 gate/th)     테스트 Recall  테스트 OOD누출");
  let rSum = 0, lSum = 0;
  for (const test of E) {
    const train = E.filter((x) => x.id !== test.id);
    const p = bestConfig(train);
    const m = metricsOver([test], p);
    rSum += m.recall; lSum += m.leak;
    console.log(`${test.id.padEnd(15)} (gate=${p.gate.toFixed(2)}, th=${p.threshold.toFixed(2)})    ${pct(m.recall).padStart(8)}      ${pct(m.leak).padStart(6)}`);
  }
  console.log(`${"평균(LOO)".padEnd(15)} ${" ".repeat(20)} ${pct(rSum / E.length).padStart(8)}      ${pct(lSum / E.length).padStart(6)}`);
  console.log("");
})();
