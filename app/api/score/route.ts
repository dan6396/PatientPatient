import { generateText } from "ai";
import { scoringModel } from "@/backend/models";
import { buildScoringPrompt, flattenTeaching, type TranscriptTurn } from "@/backend/scoring/prompt";
import { parseScoreResponse } from "@/backend/scoring/parse";
import { getCase } from "@/backend/cases";
import type {
  ScoredItem,
  CategoryScore,
  RubricItem,
  TeachingFeedback,
} from "@/backend/cases/case-types";

export const runtime = "nodejs";
export const maxDuration = 60;

function score(item: RubricItem, levelIdx: number, evidence: string): ScoredItem {
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

export async function POST(req: Request) {
  try {
    const { transcript, caseId } = (await req.json()) as {
      transcript: TranscriptTurn[];
      caseId?: string;
    };

    if (!transcript || transcript.length === 0) {
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

    if (doctorTurns.length === 0) {
      items = rubric.map((r) => score(r, r.levels.length - 1, "의사가 묻거나 수행하지 않음."));
      summary =
        "문진이 진행되지 않았습니다. 환자에게 직접 병력을 청취한 뒤 면담을 종료해 주세요.";
    } else {
      const { system, prompt } = buildScoringPrompt(transcript, rubric, activeCase.teaching);
      // gpt-5.5(추론 모델)는 temperature 커스텀을 거부하므로 보내지 않는다(기본값 사용).
      const { text } = await generateText({
        model: scoringModel,
        system,
        prompt,
      });
      const parsed = parseScoreResponse(text);
      summary = parsed.summary;
      covered = parsed.covered;
      studentImpression = parsed.studentImpression;
      impressionCorrect = parsed.impressionCorrect;
      items = rubric.map((r) => {
        const hit = parsed.items.find((i) => i.id === r.id);
        return score(
          r,
          hit ? hit.level : r.levels.length - 1,
          hit?.evidence ?? "면담에서 다루지 않았습니다."
        );
      });
    }

    // covered는 항목 "번호"(권장) 또는 옛 형식 문자열 둘 다 허용 — 견고하게 매칭한다.
    const coveredNums = new Set(
      covered
        .map((c) => parseInt(String(c).match(/\d+/)?.[0] ?? "", 10))
        .filter((n) => Number.isFinite(n))
    );
    // key-idx → 전역 번호 매핑(프롬프트와 동일한 번호 체계)
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

    return Response.json({ items, ...tally(items), summary, teaching });
  } catch (err) {
    console.error("[/api/score]", err);
    return Response.json({ error: "채점 중 오류가 발생했습니다." }, { status: 500 });
  }
}
