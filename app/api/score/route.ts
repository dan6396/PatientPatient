import { generateText } from "ai";
import { scoringModel } from "@/backend/models";
import { buildScoringPrompt, type TranscriptTurn } from "@/backend/scoring/prompt";
import { parseScoreResponse } from "@/backend/scoring/parse";
import { getCase } from "@/backend/cases";
import type { ScoredItem, CategoryScore } from "@/backend/cases/case-types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // 의사 발화가 없으면 채점 호출 없이 전부 최저 레벨 처리
    const doctorTurns = transcript.filter(
      (t) => t.role === "doctor" && t.content.trim().length > 0
    );
    if (doctorTurns.length === 0) {
      const items: ScoredItem[] = rubric.map((r) => {
        const last = r.levels.length - 1;
        return {
          id: r.id,
          category: r.category,
          description: r.description,
          levelLabel: r.levels[last].label,
          points: r.levels[last].points,
          maxPoints: r.levels[0].points,
          evidence: "의사가 묻거나 수행하지 않음.",
        };
      });
      return Response.json({
        items,
        ...tally(items),
        summary:
          "면담에서 의사의 질문이 진행되지 않았습니다. 환자에게 직접 문진을 시작한 뒤 면담을 종료해 주세요.",
      });
    }

    const { system, prompt } = buildScoringPrompt(transcript, rubric);
    const { text } = await generateText({
      model: scoringModel,
      system,
      prompt,
      temperature: 0,
    });
    const parsed = parseScoreResponse(text);

    const items: ScoredItem[] = rubric.map((r) => {
      const hit = parsed.items.find((i) => i.id === r.id);
      const lastIdx = r.levels.length - 1;
      const lvl = hit
        ? Math.min(Math.max(0, hit.level), lastIdx)
        : lastIdx; // 판정 누락 시 최저
      const level = r.levels[lvl];
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        levelLabel: level.label,
        points: level.points,
        maxPoints: r.levels[0].points,
        evidence: hit?.evidence ?? "면담에서 다루지 않았습니다.",
      };
    });

    return Response.json({ items, ...tally(items), summary: parsed.summary });
  } catch (err) {
    console.error("[/api/score]", err);
    return Response.json({ error: "채점 중 오류가 발생했습니다." }, { status: 500 });
  }
}
