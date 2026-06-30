// 환자(SP) 프롬프트용 gatedFacts 검색(Retrieval-gated SP).
// 매 발화마다 증례의 모든 사실을 다 주입하지 않고, "지금 의사가 물은 것"과
// 가까운 사실 top-k만 골라 프롬프트에 넣는다.
//
// 검색 품질 튜닝(측정 기반):
//   ① 멀티필드 임베딩 — triggerHint(의사가 무엇을 물으면)와 answer(환자 답변)를 각각 임베딩하고
//      질문과의 코사인 유사도 중 큰 값을 dense 점수로 쓴다.
//      → "담배" 같은 키워드가 답변에만 있어도 검색됨(예전엔 triggerHint만 봐서 놓쳤다).
//   ② 어휘 하이브리드 — 한글 char-bigram 자카드(질문 vs triggerHint+answer)를 dense와 가중 융합.
//      → 임베딩이 약한 짧은/동의어 질의를 보완.
//   파라미터(THRESHOLD/TOP_K/ALPHA)는 scripts/rag-eval.ts의 골드셋 스윕으로 결정.
//
// 신체진찰 라우트의 임베딩 게이트(app/api/exam/route.ts)와 같은 임베딩·코사인 패턴을 재사용한다.

import { embed, embedMany } from "ai";
import { factEmbeddingModel as embeddingModel } from "../models";
import type { GatedFact } from "../cases/case-types";

// ── 튜닝된 기본 파라미터(scripts/rag-eval.ts 골드셋 스윕 — large 임베딩, 3개 증례) ──
// 3증례(관절/복통/신경, 56문항) 전체 재튜닝 결과: Recall 92.9% · Hit@1 85.7% · OOD누출 0%
// (단일 증례로만 튜닝하면 다른 증례에서 OOD가 누출돼 과적합 → 여러 증례로 게이트 보정)
export const FACT_TOP_K = 6; // 최대 주입 개수
export const FACT_GATE = 0.41; // OOD 게이트: 최고 dense 점수가 이 미만이면 전부 버림(무관 질문)
export const FACT_THRESHOLD = 0.22; // 게이트 통과 후 top-k 포함 하한
export const FACT_ALPHA = 0.7; // 융합 가중: alpha*dense + (1-alpha)*lexical

// 텍스트 단위 임베딩 캐시(triggerHint·answer 둘 다). 같은 텍스트는 증례·세션을 넘어 재사용.
const vecCache = new Map<string, number[]>();

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// ── 어휘(lexical) 점수: 한글에 강한 char-bigram 자카드 ──
function bigrams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const g = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
  return g;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
export function lexicalScore(queryText: string, fact: GatedFact): number {
  return jaccard(bigrams(queryText), bigrams(`${fact.triggerHint} ${fact.answer}`));
}

// dense 점수: 질문 벡터 vs (triggerHint 벡터, answer 벡터) 중 최댓값(멀티필드).
export function denseScore(qVec: number[], trigVec?: number[], ansVec?: number[]): number {
  let best = 0;
  if (trigVec) best = Math.max(best, cosine(qVec, trigVec));
  if (ansVec) best = Math.max(best, cosine(qVec, ansVec));
  return best;
}

export const fuse = (dense: number, lex: number, alpha: number) =>
  alpha * dense + (1 - alpha) * lex;

export type ScoredFact = { fact: GatedFact; score: number; dense: number; lex: number };
export type FactRetrievalResult = {
  selected: GatedFact[]; // 프롬프트에 주입할 사실
  scored: ScoredFact[]; // 전체 점수(높은 순) — 디버그·시연용
  usedFallback: boolean; // 임베딩 실패로 전체 주입했는지
};

// 순수 랭킹(벡터 사전계산본으로 동작 → API 없이 평가/스윕에서 재사용 가능).
// 2단계: (gate) 가장 가까운 사실의 dense 점수가 gate 미만이면 "이 질문은 증례와 무관"으로 보고
//        전부 버린다(OOD 차단). 통과하면 (threshold)로 top-k를 회수한다 — gate가 OOD를 막아주니
//        threshold는 낮춰 recall을 올릴 수 있다.
export function rankFacts(
  queryText: string,
  qVec: number[],
  items: { fact: GatedFact; trigVec?: number[]; ansVec?: number[] }[],
  opts: { alpha: number; threshold: number; topK: number; gate?: number }
): { selected: GatedFact[]; scored: ScoredFact[] } {
  const scored: ScoredFact[] = items
    .map((it) => {
      const dense = denseScore(qVec, it.trigVec, it.ansVec);
      const lex = lexicalScore(queryText, it.fact);
      return { fact: it.fact, dense, lex, score: fuse(dense, lex, opts.alpha) };
    })
    .sort((a, b) => b.score - a.score);

  const maxDense = scored.reduce((m, s) => Math.max(m, s.dense), 0);
  if (opts.gate !== undefined && maxDense < opts.gate) {
    return { selected: [], scored }; // OOD 게이트: 의미적으로 가까운 사실이 하나도 없음
  }

  const selected = scored
    .filter((s) => s.score >= opts.threshold)
    .slice(0, opts.topK)
    .map((s) => s.fact);
  return { selected, scored };
}

// 증례 사실의 triggerHint·answer를 임베딩해 캐시에 채운다(이미 있으면 건너뜀).
export async function warmFactCache(facts: GatedFact[]): Promise<void> {
  const texts = facts.flatMap((f) => [f.triggerHint, f.answer].map((s) => s.trim()).filter(Boolean));
  const missing = [...new Set(texts)].filter((t) => !vecCache.has(t));
  if (!missing.length) return;
  const { embeddings } = await embedMany({ model: embeddingModel, values: missing });
  missing.forEach((t, i) => vecCache.set(t, embeddings[i]));
}

export async function selectRelevantFacts(
  facts: GatedFact[],
  query: string,
  opts?: { topK?: number; threshold?: number; alpha?: number; gate?: number }
): Promise<FactRetrievalResult> {
  const topK = opts?.topK ?? FACT_TOP_K;
  const threshold = opts?.threshold ?? FACT_THRESHOLD;
  const alpha = opts?.alpha ?? FACT_ALPHA;
  const gate = opts?.gate ?? FACT_GATE;
  const q = query.trim();

  // 사실이 없거나 질문이 없으면(첫 인사 등) 빈 결과 — 환자가 먼저 흘리지 않게.
  if (!facts.length || !q) return { selected: [], scored: [], usedFallback: false };

  try {
    // 미캐시 사실(트리거+답변) 임베딩 + 질문 임베딩을 병렬로.
    const texts = facts.flatMap((f) => [f.triggerHint.trim(), f.answer.trim()]).filter(Boolean);
    const missing = [...new Set(texts)].filter((t) => !vecCache.has(t));
    const [{ embedding: qVec }] = await Promise.all([
      embed({ model: embeddingModel, value: q }),
      missing.length
        ? embedMany({ model: embeddingModel, values: missing }).then(({ embeddings }) =>
            missing.forEach((t, i) => vecCache.set(t, embeddings[i]))
          )
        : Promise.resolve(),
    ]);

    const items = facts.map((f) => ({
      fact: f,
      trigVec: vecCache.get(f.triggerHint.trim()),
      ansVec: vecCache.get(f.answer.trim()),
    }));
    const { selected, scored } = rankFacts(q, qVec, items, { alpha, threshold, topK, gate });
    return { selected, scored, usedFallback: false };
  } catch {
    // 임베딩 실패 시 안전 폴백: 전체 주입(예전 동작). 절대 더 멍청해지지 않게.
    return { selected: facts, scored: [], usedFallback: true };
  }
}
