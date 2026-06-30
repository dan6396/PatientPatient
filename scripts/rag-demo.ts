// RAG-gated SP 시연 스크립트.
//  실행: npx tsx scripts/rag-demo.ts
//
//  Part A) 실제 검색 품질 — 류마티스 증례(24개 사실)에 의사 질문을 넣고
//          어떤 사실이 top-k로 뽑히는지 + 점수를 출력(OpenAI 임베딩 사용, 소량).
//  Part B) 확장 효과 — 사실 N=24/100/1000일 때 "매 턴 프롬프트 크기 / 대화 비용 /
//          검색 연산 시간"을 naive(전체 주입) vs RAG(top-k 고정)로 비교(API 비용 없음).

import { getCase } from "../backend/cases";
import { getMood } from "../backend/cases/moods";
import { buildPatientSystemPrompt } from "../backend/patient/prompt";
import { selectRelevantFacts, FACT_TOP_K } from "../backend/patient/factRetrieval";
import type { GatedFact, PatientCase } from "../backend/cases/case-types";

const estTokens = (s: string) => Math.round(s.length * 1.5); // 한글≈1.5토큰/자(근사)

async function partA() {
  console.log("\n════════ Part A · 실제 검색 품질 (류마티스, 사실 24개) ════════");
  const c = getCase("rheumatoid");
  const questions = [
    "언제부터 아프기 시작하셨어요?",
    "아침에 손이 뻣뻣한 느낌이 있나요?",
    "가족 중에 비슷한 관절 질환 앓으신 분 있어요?",
    "술이나 담배는 하세요?",
    "주말에는 보통 뭐 하면서 지내세요?", // 무관 질문 — 아무것도 안 뽑혀야 정상
  ];
  for (const q of questions) {
    const { selected, scored } = await selectRelevantFacts(c.gatedFacts, q);
    console.log(`\n❓ "${q}"`);
    if (!selected.length) {
      console.log("   → (임계값 넘는 관련 사실 없음 → 환자는 모른다고 답함)");
    }
    scored.slice(0, 4).forEach((s, i) => {
      const mark = i < selected.length && s.score >= 0.3 ? "✅" : "  ";
      console.log(`   ${mark} ${s.score.toFixed(3)}  ${s.fact.triggerHint}`);
    });
  }
}

// N개짜리 합성 사실 목록(실제 사실을 복제·번호 부여해 규모만 키움)
function synthFacts(base: GatedFact[], n: number): GatedFact[] {
  const out: GatedFact[] = [];
  for (let i = 0; i < n; i++) {
    const b = base[i % base.length];
    out.push({ id: `f${i}`, triggerHint: `${b.triggerHint} (변형 ${i})`, answer: b.answer });
  }
  return out;
}

function partB() {
  console.log("\n\n════════ Part B · 확장 효과 (N = 24 / 100 / 1000) ════════");
  const c = getCase("rheumatoid");
  const mood = getMood("irritable");
  const PRICE_IN = 0.15 / 1_000_000; // gpt-4o-mini 입력 $/토큰
  const TURNS = 12; // 한 면담 평균 의사 발화 수(시스템 프롬프트는 매 턴 재전송됨)

  const rows: string[][] = [];
  for (const n of [24, 100, 1000]) {
    const facts = synthFacts(c.gatedFacts, n);
    // naive: 매 턴 전체 N개 주입 / RAG: 매 턴 top-k(고정) 주입
    const naive = buildPatientSystemPrompt({ ...c, gatedFacts: facts } as PatientCase, mood);
    const rag = buildPatientSystemPrompt(c, mood, facts.slice(0, FACT_TOP_K));
    const naiveTok = estTokens(naive);
    const ragTok = estTokens(rag);
    const naiveCost = naiveTok * TURNS * PRICE_IN;
    const ragCost = ragTok * TURNS * PRICE_IN;
    rows.push([
      String(n),
      `${naiveTok.toLocaleString()} tok`,
      `${ragTok.toLocaleString()} tok`,
      `${(naiveTok / ragTok).toFixed(1)}×`,
      `$${naiveCost.toFixed(4)}`,
      `$${ragCost.toFixed(4)}`,
    ]);
  }
  console.log("\n[매 턴 시스템 프롬프트 크기 · 면담당 입력비용]");
  console.log("  N      naive(전체)   RAG(top-k)   절감   naive비용/면담  RAG비용/면담");
  for (const r of rows) {
    console.log(
      `  ${r[0].padEnd(6)} ${r[1].padEnd(13)} ${r[2].padEnd(12)} ${r[3].padEnd(6)} ${r[4].padEnd(15)} ${r[5]}`
    );
  }

  // 검색 연산(코사인) 시간 — 임베딩 캐시가 채워진 뒤 매 턴 드는 in-memory 비용.
  console.log("\n[검색 연산(코사인 1536차원) 시간 — 캐시 후 매 턴]");
  for (const n of [24, 100, 1000]) {
    const dim = 1536;
    const q = Array.from({ length: dim }, () => Math.random());
    const vecs = Array.from({ length: n }, () => Array.from({ length: dim }, () => Math.random()));
    const t0 = performance.now();
    for (let r = 0; r < 50; r++) {
      vecs
        .map((v) => {
          let dot = 0, na = 0, nb = 0;
          for (let i = 0; i < dim; i++) { dot += q[i] * v[i]; na += q[i] * q[i]; nb += v[i] * v[i]; }
          return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
        })
        .sort((a, b) => b - a);
    }
    const ms = (performance.now() - t0) / 50;
    console.log(`  N=${String(n).padEnd(5)} ${ms.toFixed(3)} ms/턴`);
  }
  console.log(
    "\n  ※ 질문 임베딩 1회(API)는 N과 무관하게 일정. 사실 임베딩은 1회만(캐시)."
  );
}

(async () => {
  await partA();
  partB();
  console.log("");
})();
