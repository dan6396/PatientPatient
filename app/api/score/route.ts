import { generateText } from "ai";
import { scoringModel, patientModel } from "@/backend/models";
import { buildScoringPrompt, flattenTeaching, type TranscriptTurn } from "@/backend/scoring/prompt";
import { parseScoreResponse } from "@/backend/scoring/parse";
import { getCase, getExamRubric } from "@/backend/cases";
import type {
  ScoredItem,
  CategoryScore,
  RubricItem,
  TeachingFeedback,
  ExamMessage,
  CaseExamRubric,
  ExamScoreResult,
  ExamScoreItem,
} from "@/backend/cases/case-types";

export const runtime = "nodejs";
export const maxDuration = 90;

// 문진 가중치 / 신체진찰 가중치 — 종합 점수 산출에 사용
const INTERVIEW_WEIGHT = 0.6;
const EXAM_WEIGHT = 0.4;

function scoreItem(item: RubricItem, levelIdx: number, evidence: string): ScoredItem {
  const last = item.levels.length - 1;
  const lvl = Math.min(Math.max(0, levelIdx), last);
  return {
    id: item.id,
    category: item.category,
    description: item.description,
    levelLabel: item.levels[lvl].label,
    points: item.levels[lvl].points,
    maxPoints: item.levels[0].points,
    evidence,
  };
}

function tally(items: ScoredItem[]) {
  const catMap = new Map<string, { points: number; max: number }>();
  for (const it of items) {
    const c = catMap.get(it.category) ?? { points: 0, max: 0 };
    c.points += it.points;
    c.max += it.maxPoints;
    catMap.set(it.category, c);
  }
  const categories: CategoryScore[] = [...catMap].map(([category, v]) => ({
    category,
    points: v.points,
    max: v.max,
  }));
  const total = items.reduce((s, i) => s + i.points, 0);
  const max = items.reduce((s, i) => s + i.maxPoints, 0);
  const percentage = max ? Math.round((total / max) * 100) : 0;
  return { categories, total, max, percentage };
}

// LLM으로 수기 준수 기준 평가
async function evaluateMannerCriteria(
  examMessages: ExamMessage[],
  mannerItems: { id: string; label: string; criteria: string }[]
): Promise<Map<string, { satisfied: boolean; reason: string | null }>> {
  const result = new Map<string, { satisfied: boolean; reason: string | null }>();
  if (!mannerItems.length || !examMessages.length) return result;

  const msgList = examMessages
    .map((m, i) => {
      const parts = m.partIds.length > 0 ? m.partIds.join(", ") : "인식 안 됨";
      return `${i + 1}. "${m.input}" (→ ${parts})`;
    })
    .join("\n");

  const criteriaList = mannerItems
    .map((it) => `- ${it.id}: ${it.criteria}`)
    .join("\n");

  const system = `너는 CPX 신체진찰 수기 채점관이다. 수련생이 입력한 진찰 순서와 표현을 보고 수기 준수 기준을 평가한다.
반드시 JSON 객체 하나만 출력(마크다운·코드펜스 없이):
{"results":[{"id":"<id>","satisfied":true,"reason":null},{"id":"<id>","satisfied":false,"reason":"미충족 이유 한 문장"}]}`;

  const prompt = `[수련생 입력 순서]\n${msgList}\n\n[수기 준수 기준]\n${criteriaList}\n\n각 기준의 충족 여부를 JSON으로 반환하라.`;

  try {
    const { text } = await generateText({
      model: patientModel,
      system,
      prompt,
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return result;
    const parsed = JSON.parse(jsonMatch[0]);
    for (const r of parsed.results ?? []) {
      result.set(r.id, { satisfied: Boolean(r.satisfied), reason: r.reason ?? null });
    }
  } catch {
    // LLM 오류 시 커버리지만으로 대체 → 그냥 빈 맵 반환
  }
  return result;
}

// 신체진찰 점수 산출
async function buildExamScore(
  rubric: CaseExamRubric,
  performedParts: string[],
  examMessages: ExamMessage[]
): Promise<ExamScoreResult> {
  const performedSet = new Set(performedParts);

  // 수기 기준 항목만 추출해서 LLM 평가
  const mannerItems = rubric.items
    .filter((it) => it.mannerCriteria)
    .map((it) => ({ id: it.id, label: it.label, criteria: it.mannerCriteria! }));

  const mannerResults = await evaluateMannerCriteria(examMessages, mannerItems);

  let coverageWeightTotal = 0;
  let coverageAchieved = 0;
  let mannerWeightTotal = 0;
  let mannerAchieved = 0;

  const items: ExamScoreItem[] = rubric.items.map((item) => {
    const covered = performedSet.has(item.partId);

    if (item.mannerCriteria) {
      // 수기 항목: 커버리지 AND 수기 준수 둘 다 충족해야 함
      const mannerResult = mannerResults.get(item.id);
      const satisfied = covered && (mannerResult?.satisfied ?? false);
      mannerWeightTotal += item.weight;
      if (satisfied) mannerAchieved += item.weight;
      return {
        id: item.id,
        label: item.label,
        satisfied,
        reason: satisfied
          ? undefined
          : !covered
            ? `${item.label}를 수행하지 않았습니다.`
            : (mannerResult?.reason ?? "수기 준수 기준을 충족하지 못했습니다.") ?? undefined,
      };
    } else {
      // 커버리지 항목: 수행 여부만
      coverageWeightTotal += item.weight;
      if (covered) coverageAchieved += item.weight;
      return {
        id: item.id,
        label: item.label,
        satisfied: covered,
        reason: covered ? undefined : `${item.label}를 수행하지 않았습니다.`,
      };
    }
  });

  const coverageScore =
    coverageWeightTotal > 0
      ? Math.round((coverageAchieved / coverageWeightTotal) * 100)
      : 100;
  const mannerScore =
    mannerWeightTotal > 0
      ? Math.round((mannerAchieved / mannerWeightTotal) * 100)
      : 100;

  const totalWeight = coverageWeightTotal + mannerWeightTotal;
  const totalAchieved = coverageAchieved + mannerAchieved;
  const totalScore =
    totalWeight > 0 ? Math.round((totalAchieved / totalWeight) * 100) : 0;

  return { totalScore, coverageScore, mannerScore, items };
}

export async function POST(req: Request) {
  try {
    const { transcript: rawTranscript, caseId, performedParts, examMessages } = (await req.json()) as {
      transcript?: TranscriptTurn[];
      caseId?: string;
      performedParts?: string[];
      examMessages?: ExamMessage[];
    };

    // 문진이 비어 있어도(의사 먼저 시작 구조) 막지 않고 graceful 채점한다.
    // 단 문진·신체진찰 둘 다 전혀 없으면 채점 대상이 없으므로 거절.
    const transcript: TranscriptTurn[] = Array.isArray(rawTranscript) ? rawTranscript : [];
    if (transcript.length === 0 && !performedParts?.length && !examMessages?.length) {
      return Response.json({ error: "채점할 면담 내용이 없습니다." }, { status: 400 });
    }

    const activeCase = getCase(caseId);
    const rubric = activeCase.rubric;
    const doctorTurns = transcript.filter(
      (t) => t.role === "doctor" && t.content.trim().length > 0
    );

    let items: ScoredItem[];
    let summary = "";
    let covered: string[] = [];
    let studentImpression = "";
    let impressionCorrect = false;
    let turnComments: { i: number; comment: string }[] = [];

    if (doctorTurns.length === 0) {
      items = rubric.map((r) => scoreItem(r, r.levels.length - 1, "의사가 묻거나 수행하지 않음."));
      summary =
        "문진이 진행되지 않았습니다. 환자에게 직접 병력을 청취한 뒤 면담을 종료해 주세요.";
    } else {
      const { system, prompt } = buildScoringPrompt(transcript, rubric, activeCase.teaching);
      const { text } = await generateText({
        model: scoringModel,
        system,
        prompt,
      });
      const parsed = parseScoreResponse(text);
      turnComments = parsed.turnComments;
      summary = parsed.summary;
      covered = parsed.covered;
      studentImpression = parsed.studentImpression;
      impressionCorrect = parsed.impressionCorrect;
      items = rubric.map((r) => {
        const hit = parsed.items.find((i) => i.id === r.id);
        return scoreItem(
          r,
          hit ? hit.level : r.levels.length - 1,
          hit?.evidence ?? "면담에서 다루지 않았습니다."
        );
      });
    }

    const coveredNums = new Set(
      covered
        .map((c) => parseInt(String(c).match(/\d+/)?.[0] ?? "", 10))
        .filter((n) => Number.isFinite(n))
    );
    const numByKeyIdx = new Map(
      activeCase.teaching
        ? flattenTeaching(activeCase.teaching).map((f) => [`${f.key}-${f.idx}`, f.num])
        : []
    );

    const teaching: TeachingFeedback | undefined = activeCase.teaching
      ? {
          impression: activeCase.teaching.impression,
          studentImpression,
          impressionCorrect,
          sections: activeCase.teaching.sections.map((s) => ({
            title: s.title,
            items: s.items.map((it, i) => ({
              text: it,
              covered: coveredNums.has(numByKeyIdx.get(`${s.key}-${i}`) ?? -1),
            })),
          })),
        }
      : undefined;

    // ── 신체진찰 점수 (기존 채점 로직과 독립) ──
    const examRubric = getExamRubric(caseId);
    const tallyResult = tally(items);

    let examScore: ExamScoreResult | undefined;
    let combinedScore: number | undefined;

    if (examRubric && (performedParts?.length || examMessages?.length)) {
      examScore = await buildExamScore(
        examRubric,
        performedParts ?? [],
        examMessages ?? []
      );
      combinedScore = Math.round(
        INTERVIEW_WEIGHT * tallyResult.percentage + EXAM_WEIGHT * examScore.totalScore
      );
    }

    return Response.json({
      items,
      ...tallyResult,
      summary,
      teaching,
      examScore,
      combinedScore,
      turnComments,
    });
  } catch (err) {
    console.error("[/api/score]", err);
    return Response.json({ error: "채점 중 오류가 발생했습니다." }, { status: 500 });
  }
}
