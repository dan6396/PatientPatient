import { TTS_MODEL, TTS_VOICE } from "@/backend/models";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 4000;

/**
 * 텍스트 -> mp3. provider-격리 구조: 음질이 아쉬우면 이 함수만 다른 provider로 교체.
 */
async function synthesize(text: string): Promise<ArrayBuffer> {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3",
    }),
  });
  if (!r.ok) {
    throw new Error(`TTS upstream ${r.status}: ${await r.text()}`);
  }
  return r.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || !text.trim()) {
      return new Response("text 가 비어 있습니다.", { status: 400 });
    }

    const clipped = text.slice(0, MAX_CHARS); // 너무 길면 가드
    const audio = await synthesize(clipped);

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/tts]", err);
    return new Response("음성 합성 중 오류가 발생했습니다.", { status: 502 });
  }
}
