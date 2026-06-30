import { streamText } from "ai";
import { patientModel } from "@/backend/models";
import { buildPatientSystemPrompt } from "@/backend/patient/prompt";
import { selectRelevantFacts } from "@/backend/patient/factRetrieval";
import { resolveCase } from "@/backend/cases/resolve";
import { getMood } from "@/backend/cases/moods";
import type { PatientCase } from "@/backend/cases/case-types";

export const runtime = "nodejs";
export const maxDuration = 30;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages, caseId, moodId, caseData } = (await req.json()) as {
      messages: ClientMessage[];
      caseId?: string;
      moodId?: string;
      caseData?: PatientCase;
    };

    const activeCase = resolveCase(caseId, caseData);

    // RAG: 이번에 의사가 물은 마지막 발화와 의미적으로 가까운 사실(gatedFacts)만 선별해 주입한다.
    // (전체 사실을 매 턴 다 넣지 않음 → 프롬프트 일정 + 안 물어본 정보 누출 차단)
    const lastUser = [...(messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? "";
    const { selected } = await selectRelevantFacts(activeCase.gatedFacts, lastUser);

    // 선택된 증례(또는 업로드된 커스텀 증례) + 감정 상태 + 선별 사실로 환자 시스템 프롬프트 조립
    const system = buildPatientSystemPrompt(activeCase, getMood(moodId), selected);

    const result = streamText({
      model: patientModel,
      system,
      messages: messages ?? [],
      temperature: 0.9,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat]", err);
    return new Response("환자 응답 생성 중 오류가 발생했습니다.", { status: 500 });
  }
}
