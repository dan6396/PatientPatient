import { TTS_MODEL, TTS_VOICE, pickVoice } from "@/backend/models";
import { getCase } from "@/backend/cases";
import { getMood } from "@/backend/cases/moods";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 4000;

// 텍스트 -> mp3. provider-격리: 음질이 아쉬우면 이 함수만 교체.
async function synthesize(text: string, voice: string, instructions?: string): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    model: TTS_MODEL,
    voice,
    input: text,
    response_format: "mp3",
  };
  // instructions(나이대/말투)는 gpt-4o-*-tts 에서만 지원
  if (instructions && TTS_MODEL.includes("gpt-4o")) body.instructions = instructions;

  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`TTS upstream ${r.status}: ${await r.text()}`);
  return r.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    const { text, caseId, moodId } = (await req.json()) as {
      text?: string;
      caseId?: string;
      moodId?: string;
    };
    if (!text || !text.trim()) {
      return new Response("text 가 비어 있습니다.", { status: 400 });
    }

    const c = getCase(caseId);
    const mood = getMood(moodId);
    const { sex, age } = c.persona;
    const voice = c.persona ? pickVoice(sex, age) : TTS_VOICE;

    // 감정 톤을 맨 앞에 두고 강하게 — 어조(delivery)가 확실히 바뀌도록.
    const emotion =
      mood.id === "calm"
        ? "차분하고 평온하지만 아픈 기색이 묻어나는 톤으로 말하세요."
        : `${mood.voice} 이 감정이 누가 들어도 바로 느껴질 만큼 분명하고 과장되게 연기하세요. 절대 차분하거나 친절하거나 평온하게 말하지 마세요. 감정 표현을 최우선으로 합니다.`;
    const instructions = `${emotion} 목소리는 ${age}세 ${sex === "여" ? "여성" : "남성"} 환자이며 통증으로 힘든 상태입니다.`;

    const audio = await synthesize(text.slice(0, MAX_CHARS), voice, instructions);
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/tts]", err);
    return new Response("음성 합성 중 오류가 발생했습니다.", { status: 502 });
  }
}
