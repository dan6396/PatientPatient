// RAG 검색 품질 평가/튜닝 하니스(골드셋 기반).
//   실행: npx tsx scripts/rag-eval.ts
//
//   질문→정답 사실(gold)을 라벨링한 평가셋으로 세 전략을 비교한다:
//     S0 trigger-only (예전)  |  S1 멀티필드(질문+답변)  |  S2 하이브리드(멀티필드+어휘)
//   지표: Recall@k(정답 사실을 가져왔나) · Hit@1 · OOD 누출률(무관 질문에 사실 안 줬나) · 평균 주입수
//   + 임계값/alpha 스윕으로 운영점 선택.

import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { getCase } from "../backend/cases";
import { rankFacts } from "../backend/patient/factRetrieval";
import type { GatedFact } from "../backend/cases/case-types";

// ── 골드 평가셋(질문 → 정답 사실 id들; 빈 배열 = OOD, 아무것도 안 나와야 정답) ──
const GOLD: { q: string; ids: string[] }[] = [
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
  { q: "술이나 담배 하세요?", ids: ["alcohol", "smoking"] }, // 복합 — 둘 다
  { q: "앓고 있는 지병 있으세요?", ids: ["pmh"] },
  { q: "가족 중에 관절 질환 있는 분 계세요?", ids: ["family"] },
  { q: "지금 드시는 약 있어요?", ids: ["meds"] },
  { q: "직업이 어떻게 되세요?", ids: ["occupation"] },
  { q: "손목 한번 눌러볼게요", ids: ["exam_mcp"] },
  // ── OOD(무관) — 아무 사실도 안 나와야 정답 ──
  { q: "주말엔 보통 뭐 하세요?", ids: [] },
  { q: "오늘 날씨 많이 춥죠?", ids: [] },
  { q: "여기까지 오시는 데 안 힘드셨어요?", ids: [] },
  { q: "좋아하는 음식이 뭐예요?", ids: [] },
];

type Strategy = "S0_trigger" | "S1_multifield" | "S2_hybrid";

function buildItems(
  facts: GatedFact[],
  vec: Map<string, number[]>,
  strat: Strategy
): { fact: GatedFact; trigVec?: number[]; ansVec?: number[] }[] {
  return facts.map((f) => ({
    fact: f,
    trigVec: vec.get(f.triggerHint.trim()),
    // S0는 답변 임베딩을 쓰지 않음(예전 방식)
    ansVec: strat === "S0_trigger" ? undefined : vec.get(f.answer.trim()),
  }));
}

function evaluate(
  facts: GatedFact[],
  vec: Map<string, number[]>,
  qvec: Map<string, number[]>,
  strat: Strategy,
  threshold: number,
  alpha: number,
  topK = 6,
  gate?: number
) {
  const items = buildItems(facts, vec, strat);
  let recallSum = 0, hit1 = 0, relN = 0;
  let leak = 0, oodN = 0;
  let retrievedOnRel = 0;
  for (const g of GOLD) {
    const qVec = qvec.get(g.q)!;
    const { selected } = rankFacts(g.q, qVec, items, { alpha, threshold, topK, gate });
    const ret = selected.map((f) => f.id);
    if (g.ids.length === 0) {
      oodN++;
      if (ret.length > 0) leak++;
    } else {
      relN++;
      retrievedOnRel += ret.length;
      const hitCount = g.ids.filter((id) => ret.includes(id)).length;
      recallSum += hitCount / g.ids.length;
      if (ret[0] && g.ids.includes(ret[0])) hit1++;
    }
  }
  return {
    recall: recallSum / relN,
    hit1: hit1 / relN,
    leakRate: oodN ? leak / oodN : 0,
    avgRet: retrievedOnRel / relN,
  };
}

// 주어진 임베딩 모델로 (사실/질문) 임베딩 → S3 최적 구성 탐색
async function runForModel(modelId: string, facts: GatedFact[]) {
  const model = openai.embedding(modelId);
  const factTexts = [...new Set(facts.flatMap((f) => [f.triggerHint.trim(), f.answer.trim()]))];
  const qTexts = GOLD.map((g) => g.q);
  const { embeddings: fe } = await embedMany({ model, values: factTexts });
  const { embeddings: qe } = await embedMany({ model, values: qTexts });
  const vec = new Map(factTexts.map((t, i) => [t, fe[i]]));
  const qvec = new Map(qTexts.map((t, i) => [t, qe[i]]));

  // 전략별(누출 0 제약, threshold 스윕)
  const strat: Record<string, { recall: number; hit1: number }> = {};
  for (const s of [
    { name: "S0_trigger" as Strategy, alpha: 1.0 },
    { name: "S1_multifield" as Strategy, alpha: 1.0 },
  ]) {
    let best = { recall: -1, hit1: 0 };
    for (let th = 0.15; th <= 0.6; th += 0.01) {
      const m = evaluate(facts, vec, qvec, s.name, th, s.alpha);
      if (m.leakRate <= 0.0001 && m.recall > best.recall) best = { recall: m.recall, hit1: m.hit1 };
    }
    strat[s.name] = best;
  }

  // S3: 하이브리드 + 2단계 게이트 (gate×threshold 스윕)
  let s3 = { gate: 0, th: 0, recall: -1, hit1: 0, avgRet: 0 };
  for (let gate = 0.25; gate <= 0.5; gate += 0.01) {
    for (let th = 0.12; th <= 0.45; th += 0.01) {
      const m = evaluate(facts, vec, qvec, "S2_hybrid", th, 0.7, 6, gate);
      if (m.leakRate <= 0.0001 && m.recall > s3.recall)
        s3 = { gate, th, recall: m.recall, hit1: m.hit1, avgRet: m.avgRet };
    }
  }
  return { vec, qvec, strat, s3 };
}

(async () => {
  const c = getCase("rheumatoid");
  const facts = c.gatedFacts;
  console.log(`\n평가셋: 관련 질문 ${GOLD.filter((g) => g.ids.length).length}개 · OOD ${GOLD.filter((g) => !g.ids.length).length}개`);

  const results: Record<string, Awaited<ReturnType<typeof runForModel>>> = {};
  for (const m of ["text-embedding-3-small", "text-embedding-3-large"]) {
    results[m] = await runForModel(m, facts);
  }

  console.log("\n════ 임베딩 모델 × 전략 비교 (누출 0 유지, Recall) ════");
  console.log("임베딩모델                    S0(trigger)  S1(멀티필드)  S3(하이브리드+게이트)");
  for (const m of Object.keys(results)) {
    const r = results[m];
    console.log(
      `${m.padEnd(28)} ${(r.strat.S0_trigger.recall * 100).toFixed(1).padStart(8)}%   ${(r.strat.S1_multifield.recall * 100).toFixed(1).padStart(8)}%   ${(r.s3.recall * 100).toFixed(1).padStart(8)}%  (Hit@1 ${(r.s3.hit1 * 100).toFixed(0)}%, gate=${r.s3.gate.toFixed(2)}, th=${r.s3.th.toFixed(2)})`
    );
  }

  // 최종 채택(large + S3) 오류분석
  const win = results["text-embedding-3-large"];
  console.log("\n════ 오류분석 (채택: large + S3 최적) ════");
  const items = buildItems(facts, win.vec, "S2_hybrid");
  let misses = 0;
  for (const g of GOLD) {
    if (!g.ids.length) continue;
    const { selected, scored } = rankFacts(g.q, win.qvec.get(g.q)!, items, {
      alpha: 0.7, threshold: win.s3.th, topK: 6, gate: win.s3.gate,
    });
    const ret = selected.map((f) => f.id);
    const missed = g.ids.filter((id) => !ret.includes(id));
    if (missed.length) {
      misses++;
      const ms = missed.map((id) => {
        const sc = scored.find((s) => s.fact.id === id)!;
        return `${id}(score ${sc.score.toFixed(2)}, dense ${sc.dense.toFixed(2)})`;
      });
      console.log(`  ✗ "${g.q}" → 놓침: ${ms.join(", ")}`);
    }
  }
  if (!misses) console.log("  (놓친 질문 없음)");
  console.log("");
})();
