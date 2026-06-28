// 채점표(텍스트) → PatientCase 생성 엔드포인트. (신규 — 기존 라우트와 독립)
import { generateText } from "ai";
import { scoringModel } from "@/backend/models";
import { buildCaseGenPrompt, parseGeneratedCase } from "@/backend/generate/casegen";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { rubricText, hasScenario } = (await req.json()) as {
      rubricText?: string;
      hasScenario?: boolean;
    };

    if (!rubricText || rubricText.trim().length < 20) {
      return Response.json(
        { error: "채점표 내용이 너무 짧습니다. 채점표 텍스트를 넣어 주세요." },
        { status: 400 }
      );
    }

    const { system, prompt } = buildCaseGenPrompt(rubricText.trim(), Boolean(hasScenario));
    const { text } = await generateText({ model: scoringModel, system, prompt });

    const id = `custom-${Date.now().toString(36)}`;
    const patientCase = parseGeneratedCase(text, id);

    return Response.json({ case: patientCase });
  } catch (err) {
    console.error("[/api/generate-case]", err);
    return Response.json(
      { error: "증례 생성 중 오류가 발생했습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
