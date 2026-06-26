import { streamText } from "ai";
import { patientModel } from "@/backend/models";
import { buildPatientSystemPrompt } from "@/backend/patient/prompt";
import { seedCase } from "@/backend/cases/seed-case";

export const runtime = "nodejs";
export const maxDuration = 30;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ClientMessage[] };

    // 단일 증례(seedCase) 기준. 당일 교체 시 이 import 하나만 바뀐다.
    const system = buildPatientSystemPrompt(seedCase);

    const result = streamText({
      model: patientModel,
      system,
      messages: messages ?? [],
      temperature: 0.7,
    });

    // 단순 텍스트 스트림으로 반환 (클라이언트에서 fetch reader로 소비)
    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat]", err);
    return new Response("환자 응답 생성 중 오류가 발생했습니다.", {
      status: 500,
    });
  }
}
