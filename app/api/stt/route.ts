import { STT_MODEL, STT_PROMPT } from "@/backend/models";

export const runtime = "nodejs";
export const maxDuration = 30;

// 오디오 blob(multipart) -> 텍스트. OpenAI 로만 보내고 저장하지 않는다.
export async function POST(req: Request) {
  try {
    const inForm = await req.formData();
    const file = inForm.get("audio");
    if (!(file instanceof Blob) || file.size === 0) {
      return Response.json({ error: "오디오가 비어 있습니다." }, { status: 400 });
    }

    const oa = new FormData();
    oa.append("file", file, "audio.webm");
    oa.append("model", STT_MODEL);
    oa.append("language", "ko"); // 한국어 인식 정확도 향상
    oa.append("prompt", STT_PROMPT); // 의료 도메인 용어 bias

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: oa,
    });

    if (!r.ok) {
      console.error("[/api/stt]", await r.text());
      return Response.json({ error: "음성 인식에 실패했습니다." }, { status: 502 });
    }

    const data = (await r.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[/api/stt]", err);
    return Response.json({ error: "음성 인식 중 오류가 발생했습니다." }, { status: 500 });
  }
}
