import { streamText } from "ai";
import { patientModel } from "@/backend/models";
import { buildPatientSystemPrompt } from "@/backend/patient/prompt";
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

    // 선택된 증례(또는 업로드된 커스텀 증례) + 감정 상태로 환자 시스템 프롬프트 조립
    const system = buildPatientSystemPrompt(resolveCase(caseId, caseData), getMood(moodId));

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
