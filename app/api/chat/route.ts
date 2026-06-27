import { streamText } from "ai";
import { patientModel } from "@/backend/models";
import { buildPatientSystemPrompt } from "@/backend/patient/prompt";
import { getCase } from "@/backend/cases";

export const runtime = "nodejs";
export const maxDuration = 30;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages, caseId } = (await req.json()) as {
      messages: ClientMessage[];
      caseId?: string;
    };

    // 선택된 증례로 환자 시스템 프롬프트 조립
    const system = buildPatientSystemPrompt(getCase(caseId));

    const result = streamText({
      model: patientModel,
      system,
      messages: messages ?? [],
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat]", err);
    return new Response("환자 응답 생성 중 오류가 발생했습니다.", { status: 500 });
  }
}
