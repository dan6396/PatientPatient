import { generateText } from "ai";
import { scoringModel } from "@/backend/models";
import { buildScoringPrompt, type TranscriptTurn } from "@/backend/scoring/prompt";
import { parseScoreResponse } from "@/backend/scoring/parse";
import { seedCase } from "@/backend/cases/seed-case";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const { transcript } = (await req.json()) as { transcript: TranscriptTurn[] };

    if (!transcript || transcript.length === 0) {
      return Response.json(
        { error: "채점할 면담 내용이 없습니다." },
        { status: 400 }
      );
    }

    // 의사 발화가 하나도 없으면 채점 호출 없이 전부 미충족 처리.
    // (환자의 첫 인사말만 있는 경우 등 — 의사가 문진을 안 했으면 0점이 맞다)
    const doctorTurns = transcript.filter(
      (t) => t.role === "doctor" && t.content.trim().length > 0
    );
    if (doctorTurns.length === 0) {
      const items = seedCase.rubric.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        met: false,
        evidence: "의사가 묻지 않음.",
      }));
      return Response.json({
        items,
        summary:
          "면담에서 의사의 질문이 진행되지 않았습니다. 환자에게 직접 문진을 시작한 뒤 면담을 종료해 주세요.",
      });
    }

    const { system, prompt } = buildScoringPrompt(transcript, seedCase.rubric);

    const { text } = await generateText({
      model: scoringModel,
      system,
      prompt,
      temperature: 0,
    });

    const parsed = parseScoreResponse(text);

    // rubric 메타(카테고리/설명)와 합쳐서 프론트가 바로 렌더할 수 있게 반환
    const items = seedCase.rubric.map((r) => {
      const hit = parsed.items.find((i) => i.id === r.id);
      return {
        id: r.id,
        category: r.category,
        description: r.description,
        met: hit?.met ?? false,
        evidence: hit?.evidence ?? "면담에서 다루지 않았습니다.",
      };
    });

    return Response.json({ items, summary: parsed.summary });
  } catch (err) {
    console.error("[/api/score]", err);
    return Response.json(
      { error: "채점 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
